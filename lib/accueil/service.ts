import QRCode from "qrcode";
import { creerRemerciement } from "@/lib/ai/service";
import { prisma } from "@/lib/db/client";
import { STATUTS_FILE } from "@/lib/file/statuts";
import { LIBELLES_FENETRE } from "@/lib/fenetre/adaptative";
import { fenetreDeLaVue, fenetresParEtablissement, filtreRecents } from "@/lib/fenetre/service";
import { lireVoix } from "@/lib/voix/service";
import { sansSignature } from "@/lib/voix/signature";
import { prochainPalier } from "./palier";
import { prenomDepuisSignature } from "./phrase";
import {
  FENETRE_SUJET_JOURS,
  choisirReconquete,
  choisirSourire,
  effetSurLaNote,
  formaterNote,
  ilYA,
  initiales,
  noteAffichee,
  raisonsPriorite,
  sujetQuiRevient,
  texteDeCarte,
  type Carte,
  type CandidatReconquete,
  type MerciPret,
  type OccurrencesSujet,
} from "./rituel";

/** Lien d'avis Google saisi dans Réglages (validé par lienAvisSchema avant d'arriver ici). */
export async function enregistrerLienAvis(locationId: string, lien: string | null): Promise<void> {
  await prisma.settings.upsert({
    where: { locationId },
    create: { locationId, lienAvis: lien },
    update: { lienAvis: lien },
  });
}

export async function lireLienAvis(locationId: string): Promise<string | null> {
  const r = await prisma.settings.findUnique({ where: { locationId }, select: { lienAvis: true } });
  return r?.lienAvis ?? null;
}

/** Au plus quatre mercis par matin : au delà, la validation groupée n'est plus une relecture. */
const MERCIS_MAX = 4;

export interface Entete {
  prenom: string | null;
  /** Clients contents (4 et 5 étoiles) sur la fenêtre adaptative de la vue. */
  contents: number;
  volume: number;
  /** Cette fenêtre, dite en mots : « ces 6 dernières semaines », « ces 2 derniers mois ». */
  periode: string;
  /** Note affichée, « 4,4 », ou null sans avis. */
  note: string | null;
}

export interface Rituel {
  entete: Entete;
  cartes: Carte[];
}

function filtre(locationId: string | null): { locationId?: string } {
  return locationId ? { locationId } : {};
}

function enMinuscule(libelle: string): string {
  return libelle.charAt(0).toLocaleLowerCase("fr") + libelle.slice(1);
}

/** Remerciements prêts pour les avis positifs récents sans réponse ; rédigés à la demande s'il n'y en a pas. */
async function mercisPrets(locationId: string | null, depuis: Date): Promise<MerciPret[]> {
  const avis = await prisma.review.findMany({
    where: { ...filtre(locationId), note: { gte: 4 }, statut: "HORS_FILE", reponseGoogleTexte: null, retireAt: null, dateCreation: { gte: depuis }, NOT: { texte: null } },
    orderBy: { dateCreation: "desc" },
    take: MERCIS_MAX,
    include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
  });
  const prets: MerciPret[] = [];
  for (const a of avis) {
    let texte = a.drafts[0]?.texte;
    if (!texte) {
      try {
        texte = await creerRemerciement(a.id);
      } catch (error) {
        console.error("Remerciement indisponible :", error instanceof Error ? error.message : error);
        continue;
      }
    }
    const { signature } = await lireVoix(a.locationId);
    prets.push({
      reviewId: a.id,
      auteur: a.auteur,
      initiales: initiales(a.auteur),
      note: a.note,
      extrait: a.texte ? texteDeCarte(a.texte, 60) : null,
      texte: sansSignature(texte, signature),
    });
  }
  return prets;
}

async function qrSvg(lien: string): Promise<string | null> {
  try {
    return await QRCode.toString(lien, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#15140F", light: "#FFFFFF" } });
  } catch {
    return null;
  }
}

/**
 * Prépare l'accueil : l'en-tête (bonjour, clients contents, note) et la pile
 * de cartes du matin, dans l'ordre sourire, cliente à reconquérir, mercis,
 * levier. Une carte sans contenu n'apparaît pas.
 */
export async function preparerRituel(locationId: string | null, locationPourVoix: string | null, maintenant = new Date()): Promise<Rituel> {
  // Les chiffres se lisent sur la fenêtre de la vue ; la file, sur celle de chaque établissement.
  const [fenetre, fenetres] = await Promise.all([fenetreDeLaVue(locationId, maintenant), fenetresParEtablissement(maintenant)]);
  const depuisSujet = new Date(maintenant.getTime() - FENETRE_SUJET_JOURS * 86_400_000);

  const [toutes, recents, aTraiter, voix, lienAvis] = await Promise.all([
    prisma.review.findMany({ where: { ...filtre(locationId), retireAt: null }, select: { note: true, dateCreation: true } }),
    prisma.review.findMany({
      where: { ...filtre(locationId), retireAt: null, dateCreation: { gte: fenetre.debut } },
      select: {
        id: true,
        auteur: true,
        note: true,
        texte: true,
        dateCreation: true,
        analysis: { select: { passagesCles: true, themes: { where: { polarite: "NEGATIF" }, select: { themeId: true, theme: { select: { libelle: true } } } } } },
      },
    }),
    prisma.review.findMany({
      where: { ...filtre(locationId), retireAt: null, statut: { in: STATUTS_FILE }, ...filtreRecents(fenetres) },
      include: {
        drafts: { orderBy: { version: "desc" }, take: 1, select: { texte: true } },
        analysis: { select: { gravite: true, resume: true, themes: { where: { polarite: "NEGATIF" }, select: { theme: { select: { libelle: true } } } } } },
      },
    }),
    lireVoix(locationPourVoix),
    locationPourVoix ? lireLienAvis(locationPourVoix) : null,
  ]);

  const notes = toutes.map((a) => a.note);
  const note = noteAffichee(notes);
  const entete: Entete = {
    prenom: prenomDepuisSignature(voix.signature),
    contents: recents.filter((a) => a.note >= 4).length,
    volume: recents.length,
    periode: LIBELLES_FENETRE[fenetre.jours].dernieres,
    note: note === null ? null : formaterNote(note),
  };

  // Sujets négatifs des 10 derniers jours : ce qui revient pèse dans la priorité et nourrit le levier.
  const occurrences: OccurrencesSujet = new Map();
  const themeDuSujet = new Map<string, string>();
  for (const a of recents) {
    if (a.dateCreation < depuisSujet) continue;
    for (const t of a.analysis?.themes ?? []) {
      const sujet = enMinuscule(t.theme.libelle);
      occurrences.set(sujet, (occurrences.get(sujet) ?? 0) + 1);
      themeDuSujet.set(sujet, t.themeId);
    }
  }

  const cartes: Carte[] = [];

  // 1. Le sourire d'abord.
  const jourDeLAnnee = Math.floor((maintenant.getTime() - Date.UTC(maintenant.getUTCFullYear(), 0, 1)) / 86_400_000);
  const sourire = choisirSourire(
    recents.map((a) => ({ id: a.id, auteur: a.auteur, note: a.note, texte: a.texte, dateCreation: a.dateCreation, passagesCles: a.analysis?.passagesCles ?? [] })),
    (jourDeLAnnee % 10) / 10,
  );
  if (sourire?.texte) {
    cartes.push({
      type: "sourire",
      reviewId: sourire.id,
      auteur: sourire.auteur,
      initiales: initiales(sourire.auteur),
      quand: ilYA(sourire.dateCreation, maintenant),
      texte: texteDeCarte(sourire.texte),
      // Seuls les passages courts (« le cortado ») se citent ; une phrase entière répéterait l'avis.
      cite: sourire.passagesCles.filter((p) => p.length <= 32).slice(0, 2),
    });
  }

  // 2. La cliente à reconquérir : un seul avis, le plus prioritaire.
  const candidats: CandidatReconquete[] = aTraiter.map((a) => {
    const sujet = a.analysis?.themes[0]?.theme.libelle;
    return {
      id: a.id,
      auteur: a.auteur,
      note: a.note,
      texte: a.texte,
      dateCreation: a.dateCreation,
      gravite: a.analysis?.gravite ?? null,
      resume: a.analysis?.resume ?? null,
      sujet: sujet ? enMinuscule(sujet) : null,
      brouillon: a.statut === "BROUILLON_PRET" ? (a.drafts[0]?.texte ?? null) : null,
    };
  });
  const choisi = choisirReconquete(candidats, occurrences, maintenant);
  if (choisi) {
    const effet = effetSurLaNote(notes, choisi.note);
    cartes.push({
      type: "reconquete",
      reviewId: choisi.id,
      auteur: choisi.auteur,
      initiales: initiales(choisi.auteur),
      quand: ilYA(choisi.dateCreation, maintenant),
      note: choisi.note,
      resume: choisi.resume ?? texteDeCarte(choisi.texte ?? "Avis sans texte.", 140),
      raisons: raisonsPriorite(choisi, occurrences, maintenant),
      effet: effet && effet.avant !== effet.apres ? { avant: formaterNote(effet.avant, 2), apres: formaterNote(effet.apres, 2) } : null,
      brouillon: choisi.brouillon ? sansSignature(choisi.brouillon, voix.signature) : null,
      signature: voix.signature,
    });
  }

  // 3. Les mercis prêts, validés d'un geste.
  const mercis = await mercisPrets(locationId, fenetre.debut);
  if (mercis.length > 0) cartes.push({ type: "mercis", mercis });

  // 4. Le levier : le palier, le QR du comptoir, le sujet qui revient.
  const palier = prochainPalier(notes);
  const sujet = sujetQuiRevient(occurrences);
  if (palier || sujet || note !== null) {
    cartes.push({
      type: "levier",
      palier,
      noteActuelle: entete.note,
      sujet: sujet ? { libelle: sujet.sujet, nombre: sujet.nombre, themeId: themeDuSujet.get(sujet.sujet) ?? null } : null,
      qrSvg: lienAvis ? await qrSvg(lienAvis) : null,
      lienAvis,
    });
  }

  return { entete, cartes };
}
