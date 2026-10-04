import { logAudit } from "@/lib/audit/log";
import { prisma } from "@/lib/db/client";
import { NB_CORRECTIONS_UTILISEES, correctionSignificative } from "./apprentissage";
import { REGLES_PAR_DEFAUT, VOIX_PAR_DEFAUT, lireRegles, type RegleSujet, type Voix } from "./reglages";
import { sansSignature } from "./signature";

/**
 * Lecture et écriture de la voix d'un établissement. Jamais appelé depuis le
 * front : les actions serveur vérifient la session puis délèguent ici.
 */

export async function lireVoix(locationId: string | null): Promise<Voix> {
  const s = locationId ? await prisma.settings.findUnique({ where: { locationId } }) : null;
  if (!s) return VOIX_PAR_DEFAUT;
  return {
    signature: s.signature,
    personne: s.personne,
    registre: s.registre,
    longueur: s.longueur,
    emojis: s.emojisAutorises,
    apprendreCorrections: s.apprendreCorrections,
    contact: s.contact,
    // null en base : l'établissement n'a jamais touché aux règles, on propose celles de départ.
    regles: s.reglesSujets === null ? REGLES_PAR_DEFAUT : lireRegles(s.reglesSujets),
    motsEvites: s.motsEvites,
  };
}

export async function enregistrerVoix(locationId: string, voix: Voix, userId: string): Promise<void> {
  const donnees = {
    signature: voix.signature,
    personne: voix.personne,
    registre: voix.registre,
    longueur: voix.longueur,
    emojisAutorises: voix.emojis,
    apprendreCorrections: voix.apprendreCorrections,
    contact: voix.contact,
    reglesSujets: voix.regles.map((r) => ({ ...r })),
    motsEvites: voix.motsEvites,
  };
  await prisma.settings.upsert({ where: { locationId }, update: donnees, create: { locationId, ...donnees } });
  await logAudit({
    userId,
    action: "modification_ligne_de_conduite",
    cible: locationId,
    details: {
      signature: voix.signature,
      personne: voix.personne,
      registre: voix.registre,
      longueur: voix.longueur,
      emojis: voix.emojis.join(""),
      apprendreCorrections: voix.apprendreCorrections,
      contactRenseigne: voix.contact !== null,
      nbRegles: voix.regles.length,
      nbMotsEvites: voix.motsEvites.length,
    },
  });
}

export interface SujetSansRegle {
  theme: string;
  nombre: number;
}

/**
 * Thèmes qui reviennent comme problème sur 12 mois sans règle pour les
 * traiter : l'application propose d'en créer une.
 */
export async function sujetsSansRegle(locationId: string, regles: RegleSujet[], seuil = 3): Promise<SujetSansRegle[]> {
  const depuis = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const groupes = await prisma.reviewAnalysisTheme.groupBy({
    by: ["themeId"],
    where: { polarite: "NEGATIF", analysis: { review: { locationId, retireAt: null, dateCreation: { gte: depuis } } } },
    _count: { themeId: true },
  });
  const frequents = groupes.filter((g) => g._count.themeId >= seuil);
  if (frequents.length === 0) return [];
  const themes = await prisma.theme.findMany({ where: { id: { in: frequents.map((g) => g.themeId) } }, select: { id: true, libelle: true } });
  const couverts = new Set(regles.flatMap((r) => r.themes.map((t) => t.trim().toLowerCase())));
  return frequents
    .map((g) => ({ theme: themes.find((t) => t.id === g.themeId)?.libelle ?? "", nombre: g._count.themeId }))
    .filter((s) => s.theme && !couverts.has(s.theme.toLowerCase()))
    .sort((a, b) => b.nombre - a.nombre)
    .slice(0, 5);
}

export interface CorrectionRetenue {
  id: string;
  auteurAvis: string;
  texte: string;
  date: Date;
}

/** Corrections retenues pour un établissement, les plus récentes d'abord. */
export async function listerCorrections(locationId: string): Promise<CorrectionRetenue[]> {
  const lignes = await prisma.correction.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    include: { review: { select: { auteur: true } } },
  });
  return lignes.map((c) => ({ id: c.id, auteurAvis: c.review.auteur, texte: c.texte, date: c.createdAt }));
}

/** Les dernières corrections, données au modèle comme réponses de référence (vide si l'apprentissage est coupé). */
export async function exemplesAppris(locationId: string | null, voix: Voix): Promise<string[]> {
  if (!locationId || !voix.apprendreCorrections) return [];
  const lignes = await prisma.correction.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    take: NB_CORRECTIONS_UTILISEES,
    select: { texte: true },
  });
  return lignes.map((l) => l.texte);
}

/**
 * À la publication : si la gérante a vraiment réécrit le brouillon proposé par
 * l'IA et que l'apprentissage est activé, sa version est retenue. Renvoie true
 * si une correction a été enregistrée.
 */
export async function retenirCorrection(params: { reviewId: string; locationId: string; publie: string }): Promise<boolean> {
  const voix = await lireVoix(params.locationId);
  if (!voix.apprendreCorrections) return false;
  const propose = await prisma.draft.findFirst({
    where: { reviewId: params.reviewId, modele: { not: "humain" }, OR: [{ consigne: null }, { consigne: { not: "remerciement" } }] },
    orderBy: { version: "desc" },
  });
  if (!propose) return false;
  const texte = sansSignature(params.publie, voix.signature);
  const brouillon = sansSignature(propose.texte, voix.signature);
  if (!correctionSignificative(brouillon, texte)) return false;
  await prisma.correction.upsert({
    where: { reviewId: params.reviewId },
    update: { texte, brouillon },
    create: { reviewId: params.reviewId, locationId: params.locationId, texte, brouillon },
  });
  return true;
}

export async function retirerCorrection(id: string, userId: string): Promise<void> {
  await prisma.correction.deleteMany({ where: { id } });
  await logAudit({ userId, action: "modification_ligne_de_conduite", cible: id, details: { correctionRetiree: true } });
}
