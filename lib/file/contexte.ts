import { fenetreAdaptative, LIBELLES_FENETRE, type JoursFenetre } from "@/lib/fenetre/adaptative";
import { fenetreGlissante, statsPeriode, type AvisMinimal } from "@/lib/meteo/agregation";

/** Bandeau de contexte d'un avis négatif (section 3.2) : rassurer avant d'alerter. */
export interface ContexteAvis {
  /** Avis 4 ou 5 étoiles sur la période. */
  nbPositifs: number;
  /** Tous les avis de la période, celui-ci compris. */
  nbTotal: number;
  noteMoyenne: number | null;
  /** Durée de la période : la fenêtre adaptative de l'établissement à cette date. */
  jours: JoursFenetre;
}

/**
 * Contexte d'un avis : tout ce qui a été reçu dans la fenêtre qui le précède,
 * lui compris. C'est la fenêtre de la file « À traiter », calée sur le rythme
 * de l'établissement : six semaines, deux mois ou trois mois.
 */
export function contexteAvis(tous: AvisMinimal[], dateAvis: Date): ContexteAvis {
  const { jours } = fenetreAdaptative(
    tous.map((a) => a.dateCreation),
    dateAvis,
  );
  const stats = statsPeriode(tous, fenetreGlissante(dateAvis, jours));
  return { nbPositifs: stats.nbEnthousiastes, nbTotal: stats.volume, noteMoyenne: stats.noteMoyenne, jours };
}

/** Une phrase simple qui replace l'avis parmi les autres, sans jargon ni chiffre à décoder. */
export function formaterContexte(c: ContexteAvis): string {
  const duree = LIBELLES_FENETRE[c.jours].duree;
  if (c.nbTotal <= 1) return `C'est le seul avis reçu en ${duree}.`;
  const recus = `Cet avis fait partie de ${c.nbTotal} avis reçus en ${duree}`;
  if (c.nbPositifs === 0) return `${recus}.`;
  const contents = c.nbPositifs === 1 ? "1 d'un client content" : `${c.nbPositifs} de clients contents`;
  return `${recus}, dont ${contents} (4 ou 5 étoiles).`;
}

/** Contexte dit une seule fois, en tête de la file : le climat récent avant la liste des tâches. */
export function formaterContexteFile(c: ContexteAvis): string | null {
  if (c.nbTotal === 0 || c.nbPositifs === 0) return null;
  const contents = c.nbPositifs === 1 ? "1 client content" : `${c.nbPositifs} clients contents`;
  return `${contents} sur ${c.nbTotal} avis reçus ${LIBELLES_FENETRE[c.jours].dernieres}.`;
}

export const LIBELLES_GRAVITE = { FAIBLE: "faible", MOYENNE: "moyenne", FORTE: "forte" } as const;
