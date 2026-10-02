import { debutDuMois } from "@/lib/meteo/agregation";

/** Sélections de période de la page Tendances (section 3.3). */
export type SelectionPeriode = "30j" | "90j" | "12m" | "perso";

export interface PeriodeTendances {
  selection: SelectionPeriode;
  libelle: string;
  /** Inclus, à minuit UTC. */
  debut: Date;
  /** Exclu, à minuit UTC. */
  fin: Date;
  /** Période précédente de même longueur, pour les évolutions. */
  precedente: { debut: Date; fin: Date };
}

export function jourUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ajouterJours(date: Date, jours: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + jours);
  return d;
}

const formatJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function parserSelection(valeur: string | undefined): SelectionPeriode {
  return valeur === "90j" || valeur === "12m" || valeur === "perso" ? valeur : "30j";
}

export function parserDate(valeur: string | undefined): Date | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const d = new Date(`${valeur}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calcule la période demandée. 30 et 90 jours finissent aujourd'hui inclus ;
 * 12 mois couvre les 12 mois civils jusqu'au mois en cours ; la période
 * personnalisée est bornée par deux dates incluses (repli sur 30 jours si invalide).
 */
export function periodeTendances(
  selection: SelectionPeriode,
  maintenant: Date,
  perso?: { debut: Date | null; fin: Date | null },
): PeriodeTendances {
  const aujourdHui = jourUtc(maintenant);
  const demain = ajouterJours(aujourdHui, 1);

  if (selection === "perso" && perso?.debut && perso?.fin && perso.debut <= perso.fin) {
    const debut = jourUtc(perso.debut);
    const fin = ajouterJours(jourUtc(perso.fin), 1);
    const longueur = Math.round((fin.getTime() - debut.getTime()) / 86_400_000);
    return {
      selection,
      libelle: `du ${formatJour.format(debut)} au ${formatJour.format(perso.fin)}`,
      debut,
      fin,
      precedente: { debut: ajouterJours(debut, -longueur), fin: debut },
    };
  }
  if (selection === "12m") {
    const debut = debutDuMois(maintenant, -11);
    const fin = debutDuMois(maintenant, 1);
    return { selection, libelle: "12 derniers mois", debut, fin, precedente: { debut: debutDuMois(maintenant, -23), fin: debut } };
  }
  const jours = selection === "90j" ? 90 : 30;
  const debut = ajouterJours(demain, -jours);
  return {
    selection: selection === "perso" ? "30j" : selection,
    libelle: `${jours} derniers jours`,
    debut,
    fin: demain,
    precedente: { debut: ajouterJours(debut, -jours), fin: debut },
  };
}
