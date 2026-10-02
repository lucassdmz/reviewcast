import { describe, expect, it } from "vitest";
import { estimerCout, tarifConnu } from "@/lib/ai/pricing";

describe("estimation des coûts IA", () => {
  const usage = { modele: "claude-sonnet-5-5", tokensIn: 1_000_000, tokensOut: 100_000, cacheRead: 500_000, cacheWrite: 0 };

  it("applique les tarifs par million de tokens", () => {
    // 1M entrée à 2 $ + 0,1M sortie à 10 $ + 0,5M cache lu à 0,20 $
    expect(estimerCout(usage)).toBeCloseTo(2 + 1 + 0.1, 6);
  });

  it("divise par deux avec la Batch API", () => {
    expect(estimerCout(usage, true)).toBeCloseTo(1.55, 6);
  });

  it("renvoie 0 pour un modèle sans tarif connu", () => {
    expect(estimerCout({ ...usage, modele: "inconnu" })).toBe(0);
    expect(tarifConnu("claude-opus-5-5")).toBe(true);
    expect(tarifConnu("fake")).toBe(false);
  });
});
