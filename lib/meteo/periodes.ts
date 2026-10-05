/**
 * Périodes de la météo de la home. On parle en « mois » dès que la période
 * dépasse un mois : « 3 mois » se lit mieux que « 90 jours » pour un
 * commerçant, et c'est l'usage des outils d'avis et de statistiques
 * (30 jours, 3 mois, 12 mois). Les trois périodes sont glissantes.
 */
export const PERIODES_METEO = ["30j", "3m", "12m"] as const;
export type PeriodeMeteo = (typeof PERIODES_METEO)[number];

/** Trois mois par défaut : assez long pour lisser une mauvaise semaine, assez court pour rester d'actualité. */
export const PERIODE_METEO_PAR_DEFAUT: PeriodeMeteo = "3m";

export const JOURS_PERIODE: Record<PeriodeMeteo, number> = { "30j": 30, "3m": 90, "12m": 365 };

export const LIBELLES_PERIODE: Record<PeriodeMeteo, { court: string; long: string; precedente: string }> = {
  "30j": { court: "30 jours", long: "les 30 derniers jours", precedente: "les 30 jours précédents" },
  "3m": { court: "3 mois", long: "les 3 derniers mois", precedente: "les 3 mois précédents" },
  "12m": { court: "12 mois", long: "les 12 derniers mois", precedente: "les 12 mois précédents" },
};

export function lirePeriodeMeteo(valeur: string | undefined | null): PeriodeMeteo {
  return (PERIODES_METEO as readonly string[]).includes(valeur ?? "") ? (valeur as PeriodeMeteo) : PERIODE_METEO_PAR_DEFAUT;
}
