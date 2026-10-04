import { genererBrouillon, genererRemerciement } from "@/lib/ai/service";
import { recalculerPourAvis } from "@/lib/analytics/recalcul";
import { logAudit } from "@/lib/audit/log";
import { prisma } from "@/lib/db/client";
import type { Gravite, ReviewStatus } from "@/lib/db/generated/enums";
import { creerPublieur, type PublieurReponses } from "@/lib/google/publication";
import { retenirCorrection, lireVoix } from "@/lib/voix/service";
import { motsEvitesPresents } from "@/lib/voix/reglages";
import { avecSignature, sansSignature } from "@/lib/voix/signature";
import { contexteAvis, formaterContexte, formaterContexteFile, type ContexteAvis } from "./contexte";
import { STATUTS_FILE, verifierTransition } from "./statuts";

/**
 * File « À traiter » (section 3.2) : lecture et actions. Jamais appelé
 * depuis le front ; les actions serveur de app/ vérifient la session,
 * valident les entrées puis délèguent ici.
 */

export interface AvisDeLaFile {
  id: string;
  auteur: string;
  note: number;
  dateCreation: Date;
  extrait: string;
  etablissement: string;
  statut: ReviewStatus;
  gravite: Gravite | null;
  resume: string | null;
}

function extrait(texte: string | null, max = 120): string {
  const t = texte?.trim() ?? "";
  if (!t) return "Avis sans texte.";
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

async function avisPourContexte(locationId: string) {
  return prisma.review.findMany({ where: { locationId, retireAt: null }, select: { note: true, dateCreation: true } });
}

/** Climat récent, affiché une fois en tête de la file (null s'il n'y a rien d'encourageant à dire). */
export async function contexteDeLaFile(maintenant = new Date()): Promise<string | null> {
  const tous = await prisma.review.findMany({ where: { retireAt: null }, select: { note: true, dateCreation: true } });
  return formaterContexteFile(contexteAvis(tous, maintenant));
}

/** Liste de la file, du plus récent au plus ancien. */
export async function listerFile(): Promise<AvisDeLaFile[]> {
  const avis = await prisma.review.findMany({
    where: { statut: { in: STATUTS_FILE }, retireAt: null },
    orderBy: { dateCreation: "desc" },
    include: { location: { select: { id: true, nom: true } }, analysis: { select: { gravite: true, resume: true } } },
  });
  return avis.map((a) => ({
    id: a.id,
    auteur: a.auteur,
    note: a.note,
    dateCreation: a.dateCreation,
    extrait: extrait(a.texte),
    etablissement: a.location.nom,
    statut: a.statut,
    gravite: a.analysis?.gravite ?? null,
    resume: a.analysis?.resume ?? null,
  }));
}

export interface FicheAvis {
  id: string;
  auteur: string;
  note: number;
  dateCreation: Date;
  texte: string | null;
  etablissement: string;
  statut: ReviewStatus;
  reponseGoogle: { texte: string; date: Date | null } | null;
  analyse: { gravite: Gravite | null; resume: string; horsSujet: boolean; themes: { libelle: string; polarite: string }[] } | null;
  contexte: ContexteAvis;
  contexteTexte: string;
  brouillon: { id: string; texte: string; version: number; consigne: string | null } | null;
  /** Signature de l'établissement, ajoutée à la publication (null si aucune). */
  signature: string | null;
  /** Mots que la gérante veut éviter et que le brouillon contient. */
  motsEvitesPresents: string[];
  notes: { id: string; texte: string; date: Date }[];
}

export async function ficheAvis(reviewId: string): Promise<FicheAvis | null> {
  const a = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: { select: { id: true, nom: true } },
      analysis: { include: { themes: { include: { theme: true } } } },
      drafts: { orderBy: { version: "desc" }, take: 1 },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!a) return null;
  const contexte = contexteAvis(await avisPourContexte(a.locationId), a.dateCreation);
  const brouillon = a.drafts[0];
  const { signature, motsEvites } = await lireVoix(a.locationId);
  return {
    id: a.id,
    auteur: a.auteur,
    note: a.note,
    dateCreation: a.dateCreation,
    texte: a.texte,
    etablissement: a.location.nom,
    statut: a.statut,
    reponseGoogle: a.reponseGoogleTexte ? { texte: a.reponseGoogleTexte, date: a.reponseGoogleDate } : null,
    analyse: a.analysis
      ? {
          gravite: a.analysis.gravite,
          resume: a.analysis.resume,
          horsSujet: a.analysis.horsSujet,
          themes: a.analysis.themes.map((t) => ({ libelle: t.theme.libelle, polarite: t.polarite })),
        }
      : null,
    contexte,
    contexteTexte: formaterContexte(contexte),
    brouillon: brouillon
      ? { id: brouillon.id, texte: sansSignature(brouillon.texte, signature), version: brouillon.version, consigne: brouillon.consigne }
      : null,
    signature,
    motsEvitesPresents: brouillon ? motsEvitesPresents(brouillon.texte, motsEvites) : [],
    notes: a.notes.map((n) => ({ id: n.id, texte: n.texte, date: n.createdAt })),
  };
}

export interface ReponsePubliee {
  id: string;
  auteur: string;
  note: number;
  dateCreation: Date;
  extrait: string;
  reponse: string;
  dateReponse: Date | null;
  etablissement: string;
}

/** Historique des réponses publiées, les plus récentes d'abord. */
export async function historiquePublies(limite = 50): Promise<ReponsePubliee[]> {
  const avis = await prisma.review.findMany({
    where: { statut: "PUBLIE", reponseGoogleTexte: { not: null } },
    orderBy: [{ reponseGoogleDate: "desc" }, { dateCreation: "desc" }],
    take: limite,
    include: { location: { select: { nom: true } } },
  });
  return avis.map((a) => ({
    id: a.id,
    auteur: a.auteur,
    note: a.note,
    dateCreation: a.dateCreation,
    extrait: extrait(a.texte),
    reponse: a.reponseGoogleTexte ?? "",
    dateReponse: a.reponseGoogleDate,
    etablissement: a.location.nom,
  }));
}

async function chargerStatut(reviewId: string) {
  const a = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, statut: true, googleReviewId: true, note: true, auteur: true, locationId: true } });
  if (!a) throw new Error("Avis introuvable.");
  return a;
}

/** Enregistre la version modifiée à la main du brouillon (nouvelle version, sans IA). */
export async function enregistrerBrouillon(reviewId: string, texte: string): Promise<void> {
  const a = await chargerStatut(reviewId);
  const precedent = await prisma.draft.findFirst({ where: { reviewId }, orderBy: { version: "desc" } });
  if (precedent?.texte === texte) return;
  await prisma.draft.create({
    data: { reviewId, texte, version: (precedent?.version ?? 0) + 1, consigne: "modification manuelle", modele: "humain" },
  });
  if (a.statut === "A_TRAITER") {
    verifierTransition(a.statut, "BROUILLON_PRET");
    await prisma.review.update({ where: { id: reviewId }, data: { statut: "BROUILLON_PRET" } });
  }
}

export async function regenererBrouillon(reviewId: string, consigne: string | undefined): Promise<void> {
  await genererBrouillon(reviewId, consigne || undefined);
}

export async function ignorerAvis(reviewId: string, userId: string): Promise<void> {
  const a = await chargerStatut(reviewId);
  verifierTransition(a.statut, "IGNORE");
  await prisma.review.update({ where: { id: reviewId }, data: { statut: "IGNORE" } });
  await logAudit({ userId, action: "avis_ignore", cible: reviewId });
}

export async function rouvrirAvis(reviewId: string): Promise<void> {
  const a = await chargerStatut(reviewId);
  verifierTransition(a.statut, "A_TRAITER");
  await prisma.review.update({ where: { id: reviewId }, data: { statut: "A_TRAITER" } });
}

export async function ajouterNote(reviewId: string, texte: string): Promise<void> {
  await chargerStatut(reviewId);
  await prisma.note.create({ data: { reviewId, texte } });
}

export async function supprimerNote(noteId: string, reviewId: string): Promise<void> {
  await prisma.note.deleteMany({ where: { id: noteId, reviewId } });
}

/**
 * Publie une réponse sur Google puis passe l'avis en « publié ». Appelé
 * uniquement depuis l'action de confirmation explicite (section 4.3).
 */
export async function publierReponse(
  reviewId: string,
  texte: string,
  userId: string,
  publieur: PublieurReponses = creerPublieur(),
): Promise<void> {
  const a = await chargerStatut(reviewId);
  verifierTransition(a.statut, "PUBLIE");
  // Le brouillon est stocké sans signature : elle est ajoutée ici, une seule fois, au texte publié.
  const corps = texte;
  const { signature } = await lireVoix(a.locationId);
  texte = avecSignature(corps, signature);
  const { dateReponse } = await publieur.publier({ googleReviewId: a.googleReviewId, texte });
  await prisma.$transaction(async (tx) => {
    const precedent = await tx.draft.findFirst({ where: { reviewId }, orderBy: { version: "desc" } });
    if (precedent?.texte !== corps) {
      await tx.draft.create({ data: { reviewId, texte: corps, version: (precedent?.version ?? 0) + 1, consigne: "version publiée", modele: "humain" } });
    }
    await tx.review.update({
      where: { id: reviewId },
      data: { statut: "PUBLIE", reponseGoogleTexte: texte, reponseGoogleDate: dateReponse },
    });
  });
  await recalculerPourAvis(reviewId);
  await retenirCorrection({ reviewId, locationId: a.locationId, publie: corps });
  await logAudit({
    userId,
    action: "publication_reponse",
    cible: reviewId,
    details: { note: a.note, auteur: a.auteur, simule: publieur.simule, longueur: texte.length },
  });
}

/** Mot de remerciement pré-rédigé pour le dernier avis 5 étoiles sans réponse (section 3.2). */
export interface RemerciementPropose {
  reviewId: string;
  auteur: string;
  texte: string;
  signature: string | null;
}

export async function remerciementDuMoment(): Promise<RemerciementPropose | null> {
  const avis = await prisma.review.findFirst({
    where: { note: 5, statut: "HORS_FILE", reponseGoogleTexte: null, retireAt: null, NOT: { texte: null } },
    orderBy: { dateCreation: "desc" },
    include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!avis) return null;
  let texte = avis.drafts[0]?.texte;
  if (!texte) {
    try {
      texte = await genererRemerciement(avis.id);
      await prisma.draft.create({ data: { reviewId: avis.id, texte, version: 1, consigne: "remerciement", modele: "ia" } });
    } catch (error) {
      console.error("Remerciement indisponible :", error instanceof Error ? error.message : error);
      return null;
    }
  }
  const { signature } = await lireVoix(avis.locationId);
  return { reviewId: avis.id, auteur: avis.auteur, texte: sansSignature(texte, signature), signature };
}
