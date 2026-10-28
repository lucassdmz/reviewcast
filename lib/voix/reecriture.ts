import { creerRemerciement, genererBrouillon } from "@/lib/ai/service";
import { prisma } from "@/lib/db/client";
import { ecartsBrouillon, lireReglagesBrouillon, type Ecart } from "./fraicheur";
import type { Voix } from "./reglages";
import { lireVoix } from "./service";
import { sansSignature } from "./signature";

/**
 * Quand les réglages de la voix changent, les brouillons pas encore publiés
 * sont remis à jour. Ceux écrits par l'IA sont réécrits (l'ancienne version
 * reste dans l'historique) ; ceux que la gérante a retouchés ne sont jamais
 * écrasés, ils sont seulement signalés sur leur fiche. Rien n'est publié.
 */

export interface EtatBrouillon {
  reviewId: string;
  /** Dernière version écrite ou modifiée par la gérante. */
  humain: boolean;
  remerciement: boolean;
  ecarts: Ecart[];
}

/** Date du dernier enregistrement des réglages de la voix, pour les brouillons plus anciens que leur suivi. */
export async function derniereModificationReglages(locationId: string): Promise<Date | null> {
  const entree = await prisma.auditLog.findFirst({
    where: { action: "modification_ligne_de_conduite", cible: locationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return entree?.createdAt ?? null;
}

interface AvisAvecBrouillon {
  id: string;
  analysis: { themes: { theme: { libelle: string } }[] } | null;
  drafts: { texte: string; reglages: unknown; createdAt: Date; modele: string; consigne: string | null }[];
}

export function etatDuBrouillon(a: AvisAvecBrouillon, voix: Voix, reglagesModifiesLe: Date | null): EtatBrouillon | null {
  const d = a.drafts[0];
  if (!d) return null;
  const remerciement = d.consigne === "remerciement";
  return {
    reviewId: a.id,
    humain: d.modele === "humain",
    remerciement,
    ecarts: ecartsBrouillon(
      {
        texte: sansSignature(d.texte, voix.signature),
        utilises: lireReglagesBrouillon(d.reglages),
        ecritLe: d.createdAt,
        themes: a.analysis?.themes.map((t) => t.theme.libelle) ?? [],
        remerciement,
      },
      voix,
      reglagesModifiesLe,
    ),
  };
}

const AVEC_BROUILLON = {
  analysis: { include: { themes: { include: { theme: true } } } },
  drafts: { orderBy: { version: "desc" as const }, take: 1 },
};

/** Brouillons non publiés de l'établissement qui ne suivent plus ses réglages. */
export async function brouillonsDepasses(locationId: string): Promise<EtatBrouillon[]> {
  const [voix, modifiesLe, avis] = await Promise.all([
    lireVoix(locationId),
    derniereModificationReglages(locationId),
    prisma.review.findMany({
      where: {
        locationId,
        retireAt: null,
        reponseGoogleTexte: null,
        OR: [{ statut: { in: ["A_TRAITER", "BROUILLON_PRET"] } }, { statut: "HORS_FILE", note: { gte: 4 } }],
        drafts: { some: {} },
      },
      include: AVEC_BROUILLON,
    }),
  ]);
  return avis
    .filter((a) => a.statut !== "HORS_FILE" || a.drafts[0]?.consigne === "remerciement")
    .map((a) => etatDuBrouillon(a, voix, modifiesLe))
    .filter((e): e is EtatBrouillon => e !== null && e.ecarts.length > 0);
}

async function etatActuel(reviewId: string, locationId: string): Promise<EtatBrouillon | null> {
  const [voix, modifiesLe, avis] = await Promise.all([
    lireVoix(locationId),
    derniereModificationReglages(locationId),
    prisma.review.findFirst({ where: { id: reviewId, reponseGoogleTexte: null }, include: AVEC_BROUILLON }),
  ]);
  return avis ? etatDuBrouillon(avis, voix, modifiesLe) : null;
}

export interface PlanReecriture {
  /** Brouillons de l'IA à réécrire. */
  aReecrire: EtatBrouillon[];
  /** Brouillons retouchés par la gérante : signalés, jamais réécrits sans elle. */
  signales: number;
}

export async function planReecriture(locationId: string): Promise<PlanReecriture> {
  const depasses = await brouillonsDepasses(locationId);
  return { aReecrire: depasses.filter((e) => !e.humain), signales: depasses.filter((e) => e.humain).length };
}

/**
 * Réécrit les brouillons un par un. Chacun est revérifié juste avant : un
 * second enregistrement des réglages pendant la réécriture ne le fait pas
 * réécrire deux fois. Une erreur sur un avis n'arrête pas les autres.
 */
export async function reecrireBrouillons(locationId: string, cibles: EtatBrouillon[]): Promise<number> {
  let reecrits = 0;
  for (const cible of cibles) {
    try {
      const encore = await etatActuel(cible.reviewId, locationId);
      if (!encore || encore.humain || encore.ecarts.length === 0) continue;
      if (encore.remerciement) await creerRemerciement(cible.reviewId, "reglages");
      else await genererBrouillon(cible.reviewId, undefined, undefined, "reglages");
      reecrits += 1;
    } catch (error) {
      console.error("Réécriture du brouillon impossible :", cible.reviewId, error instanceof Error ? error.message : error);
    }
  }
  return reecrits;
}

/** Filet de sécurité de la tâche quotidienne : ce qu'une réécriture interrompue aurait laissé, pour tous les établissements. */
export async function reecrireTousLesBrouillonsDepasses(): Promise<{ reecrits: number }> {
  const lieux = await prisma.location.findMany({ select: { id: true } });
  let reecrits = 0;
  for (const { id } of lieux) {
    const { aReecrire } = await planReecriture(id);
    reecrits += await reecrireBrouillons(id, aReecrire);
  }
  return { reecrits };
}
