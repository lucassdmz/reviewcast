import type { AiProvider, AiResult, AnalyzeReviewInput } from "./types";
import type { ReviewAnalysisOutput } from "./schemas";

/**
 * Analyse par lots (Batch API, −50 %) de l'historique importé. Un lot met de
 * quelques minutes à 24 h : rien n'attend sa fin. Chaque passage, si court
 * soit-il, soumet ou relève ce qu'il peut, et tout l'état est en base : un
 * passage coupé en route est repris par le suivant.
 */
export type ResultatLot = AiResult<ReviewAnalysisOutput> | Error;

export interface FournisseurLots {
  soumettreLotAnalyses(items: { id: string; input: AnalyzeReviewInput }[]): Promise<string>;
  recupererLotAnalyses(idLot: string): Promise<{ termine: boolean; resultats: Map<string, ResultatLot> }>;
}

export function gereLesLots(fournisseur: AiProvider): fournisseur is AiProvider & FournisseurLots {
  const f = fournisseur as Partial<FournisseurLots>;
  return typeof f.soumettreLotAnalyses === "function" && typeof f.recupererLotAnalyses === "function";
}

/** Le fournisseur ne connaît plus ce lot (résultats expirés, fournisseur redémarré). */
export class LotIntrouvable extends Error {
  constructor(idLot: string) {
    super(`Lot introuvable : ${idLot}`);
    this.name = "LotIntrouvable";
  }
}

export const TAILLE_MAX_LOT = 5_000;
/** Temps minimal entre deux relevés d'un même lot, qui sert aussi de verrou entre passages simultanés. */
export const INTERVALLE_RELEVE_MS = 60_000;
/** Un lot resté « en préparation » au-delà : le passage qui le soumettait s'est arrêté avant d'en garder l'identifiant. */
export const PREPARATION_MAX_MS = 10 * 60_000;
/** Anthropic garde les résultats 29 jours. */
export const CONSERVATION_RESULTATS_MS = 29 * 24 * 60 * 60_000;

export function decouperEnLots<T>(elements: T[], taille = TAILLE_MAX_LOT): T[][] {
  const lots: T[][] = [];
  for (let i = 0; i < elements.length; i += taille) lots.push(elements.slice(i, i + taille));
  return lots;
}

export function preparationAbandonnee(creeLe: Date, maintenant: Date): boolean {
  return maintenant.getTime() - creeLe.getTime() > PREPARATION_MAX_MS;
}

export function lotExpire(soumisLe: Date, maintenant: Date): boolean {
  return maintenant.getTime() - soumisLe.getTime() > CONSERVATION_RESULTATS_MS;
}

/** Ce dont le relevé a besoin en base. Une implémentation Prisma en production, en mémoire dans les tests. */
export interface DepotLot {
  /** Avis du lot encore en attente de leur analyse. */
  avisEnAttente(lotId: string): Promise<string[]>;
  /**
   * Enregistre l'analyse puis marque l'avis comme fait. Rejouable : un passage
   * coupé entre les deux recommence sans rien compter deux fois.
   */
  appliquer(lotId: string, avisId: string, resultat: AiResult<ReviewAnalysisOutput>): Promise<void>;
  /** Rend l'avis aux appels unitaires : son résultat ne viendra pas. */
  relacher(lotId: string, avisId: string): Promise<void>;
  /** Fin du lot. */
  clore(lotId: string, statut: "TERMINE" | "ABANDONNE"): Promise<void>;
}

export interface BilanReleve {
  etat: "en-cours" | "partiel" | "termine" | "abandonne";
  appliques: number;
  relaches: number;
}

/**
 * Relève un lot soumis, dans la limite du budget de temps. S'il manque du
 * temps, le reste attend le passage suivant : les résultats restent disponibles
 * chez le fournisseur et les avis déjà traités ne sont pas repris.
 */
export async function releverLot(
  lot: { id: string; idFournisseur: string; soumisLe: Date },
  fournisseur: FournisseurLots,
  depot: DepotLot,
  options: { echeance: number; maintenant: Date; horloge?: () => number },
): Promise<BilanReleve> {
  const horloge = options.horloge ?? Date.now;

  const abandonner = async (): Promise<BilanReleve> => {
    const avis = await depot.avisEnAttente(lot.id);
    for (const id of avis) await depot.relacher(lot.id, id);
    await depot.clore(lot.id, "ABANDONNE");
    return { etat: "abandonne", appliques: 0, relaches: avis.length };
  };

  if (lotExpire(lot.soumisLe, options.maintenant)) return abandonner();

  let releve: Awaited<ReturnType<FournisseurLots["recupererLotAnalyses"]>>;
  try {
    releve = await fournisseur.recupererLotAnalyses(lot.idFournisseur);
  } catch (error) {
    if (error instanceof LotIntrouvable) return abandonner();
    // Panne passagère : le lot reste en cours, le prochain passage réessaie.
    throw error;
  }
  if (!releve.termine) return { etat: "en-cours", appliques: 0, relaches: 0 };

  let appliques = 0;
  let relaches = 0;
  for (const id of await depot.avisEnAttente(lot.id)) {
    if (horloge() >= options.echeance) return { etat: "partiel", appliques, relaches };
    const resultat = releve.resultats.get(id);
    if (!resultat || resultat instanceof Error) {
      await depot.relacher(lot.id, id);
      relaches += 1;
    } else {
      await depot.appliquer(lot.id, id, resultat);
      appliques += 1;
    }
  }
  await depot.clore(lot.id, "TERMINE");
  return { etat: "termine", appliques, relaches };
}
