import type { AiUsage } from "./types";

/** Tarifs en dollars par million de tokens (tarifs Anthropic au 25/09/2026). */
interface Tarif {
  entree: number;
  sortie: number;
  cacheLecture: number;
  cacheEcriture: number;
}

const TARIFS: Record<string, Tarif> = {
  "claude-opus-5-5": { entree: 4, sortie: 20, cacheLecture: 0.2, cacheEcriture: 5 },
  "claude-sonnet-5-5": { entree: 2, sortie: 10, cacheLecture: 0.2, cacheEcriture: 2.5 },
  "claude-haiku-4-5": { entree: 1, sortie: 5, cacheLecture: 0.1, cacheEcriture: 1.25 },
};

export const MODELES_PAR_DEFAUT = {
  analyse: "claude-sonnet-5-5",
  redaction: "claude-opus-5-5",
} as const;

/** Coût estimé en dollars. La Batch API applique une remise de 50 % (section 4.3). */
export function estimerCout(usage: AiUsage, batch = false): number {
  const tarif = TARIFS[usage.modele];
  if (!tarif) return 0;
  const brut =
    (usage.tokensIn * tarif.entree +
      usage.tokensOut * tarif.sortie +
      usage.cacheRead * tarif.cacheLecture +
      usage.cacheWrite * tarif.cacheEcriture) /
    1_000_000;
  return batch ? brut / 2 : brut;
}

export function tarifConnu(modele: string): boolean {
  return modele in TARIFS;
}
