import { parserDate, parserSelection, periodeTendances, type PeriodeTendances } from "./periodes";

/** Lit les paramètres d'URL de la page Tendances et en déduit la période. L'établissement, lui, vient du choix global. */
export interface ParametresTendances {
  periode: PeriodeTendances;
  /** Chaîne de requête à reporter sur les liens internes. */
  requete: string;
}

export function lireParametres(params: Record<string, string | string[] | undefined>, maintenant = new Date()): ParametresTendances {
  const texte = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const selection = parserSelection(texte("periode"));
  const periode = periodeTendances(selection, maintenant, { debut: parserDate(texte("debut")) ?? null, fin: parserDate(texte("fin")) ?? null });
  const q = new URLSearchParams();
  q.set("periode", periode.selection);
  if (periode.selection === "perso") {
    q.set("debut", texte("debut") ?? "");
    q.set("fin", texte("fin") ?? "");
  }
  return { periode, requete: q.toString() };
}
