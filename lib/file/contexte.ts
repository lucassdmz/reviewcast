import { debutDuMois, statsPeriode, type AvisMinimal } from "@/lib/meteo/agregation";

/** Bandeau de contexte d'un avis négatif (section 3.2) : rassurer avant d'alerter. */
export interface ContexteAvis {
  nbPositifs: number;
  nbTotal: number;
  noteMoyenne: number | null;
}

/** Contexte calculé sur le mois civil de l'avis, tous avis confondus. */
export function contexteAvis(tous: AvisMinimal[], dateAvis: Date): ContexteAvis {
  const periode = { debut: debutDuMois(dateAvis), fin: debutDuMois(dateAvis, 1) };
  const stats = statsPeriode(tous, periode);
  return { nbPositifs: stats.nbEnthousiastes, nbTotal: stats.volume, noteMoyenne: stats.noteMoyenne };
}

const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Formulation positive et factuelle du contexte. */
export function formaterContexte(c: ContexteAvis): string {
  if (c.nbTotal <= 1) return "Premier avis de la période.";
  const positifs = c.nbPositifs === 1 ? "1 avis positif" : `${c.nbPositifs} avis positifs`;
  const autres = c.nbTotal - 1;
  const sur = autres === 1 ? "sur 1 autre avis" : `sur ${autres} autres avis`;
  const note = c.noteMoyenne === null ? "" : `, note moyenne du mois ${formatNote.format(c.noteMoyenne)} ★`;
  return `${positifs} ${sur} sur la même période${note}.`;
}

export const LIBELLES_GRAVITE = { FAIBLE: "faible", MOYENNE: "moyenne", FORTE: "forte" } as const;
