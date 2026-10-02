import { describe, expect, it } from "vitest";
import { compterThemes } from "@/lib/meteo/agregation";

describe("thèmes du mois", () => {
  it("classe les thèmes par polarité détectée et par fréquence", () => {
    const avis = [
      { analysis: { themes: [{ theme: { libelle: "accueil", polarite: "POSITIF" } }, { theme: { libelle: "délais", polarite: "NEGATIF" } }] } },
      { analysis: { themes: [{ theme: { libelle: "accueil", polarite: "POSITIF" } }, { theme: { libelle: "prix", polarite: "MIXTE" } }] } },
      { analysis: { themes: [{ theme: { libelle: "rapidité", polarite: "POSITIF" } }] } },
      { analysis: null },
    ];
    expect(compterThemes(avis)).toEqual({ positifs: ["accueil", "rapidité"], negatifs: ["délais"] });
    expect(compterThemes(avis, 1)).toEqual({ positifs: ["accueil"], negatifs: ["délais"] });
  });
});
