import { describe, expect, it } from "vitest";
import { parserSens, polariteDuSens } from "@/lib/analytics/requete";

describe("sens d'un thème ouvert depuis Tendances", () => {
  it("ne reconnaît que les deux listes de la page", () => {
    expect(parserSens("plait")).toBe("plait");
    expect(parserSens("probleme")).toBe("probleme");
    expect(parserSens("autre")).toBeNull();
    expect(parserSens(undefined)).toBeNull();
    expect(parserSens(["plait"])).toBeNull();
  });

  it("« ce qui plaît » ne garde que les mentions positives, « problème » que les négatives", () => {
    expect(polariteDuSens("plait")).toBe("POSITIF");
    expect(polariteDuSens("probleme")).toBe("NEGATIF");
  });
});
