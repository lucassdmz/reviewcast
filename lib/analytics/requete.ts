import { parserDate, parserSelection, periodeTendances, type PeriodeTendances } from "./periodes";

/** Lit les paramètres d'URL de la page Tendances et en déduit la période. */
export interface ParametresTendances {
  periode: PeriodeTendances;
  locationId: string | null;
  /** Chaîne de requête à reporter sur les liens internes. */
  requete: string;
}

export function lireParametres(params: Record<string, string | string[] | undefined>, maintenant = new Date()): ParametresTendances {
  const texte = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const selection = parserSelection(texte("periode"));
  const periode = periodeTendances(selection, maintenant, { debut: parserDate(texte("debut")) ?? null, fin: parserDate(texte("fin")) ?? null });
  const locationId = texte("etablissement") ?? null;
  const q = new URLSearchParams();
  q.set("periode", periode.selection);
  if (periode.selection === "perso") {
    q.set("debut", texte("debut") ?? "");
    q.set("fin", texte("fin") ?? "");
  }
  if (locationId) q.set("etablissement", locationId);
  return { periode, locationId, requete: q.toString() };
}
