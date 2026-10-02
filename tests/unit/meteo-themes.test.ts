import { describe, expect, it } from "vitest";
import { compterThemes } from "@/lib/meteo/agregation";

describe("thèmes du mois", () => {
  it("classe les thèmes par polarité détectée et par fréquence", () => {
    const avis = [
      { analysis: { themes: [{ polarite: "POSITIF", theme: { libelle: "accueil" } }, { polarite: "NEGATIF", theme: { libelle: "délais" } }] } },
      { analysis: { themes: [{ polarite: "POSITIF", theme: { libelle: "accueil" } }, { polarite: "MIXTE", theme: { libelle: "prix" } }] } },
      { analysis: { themes: [{ polarite: "POSITIF", theme: { libelle: "rapidité" } }] } },
      { analysis: null },
    ];
    expect(compterThemes(avis)).toEqual({ positifs: ["accueil", "rapidité"], negatifs: ["délais"] });
    expect(compterThemes(avis, 1)).toEqual({ positifs: ["accueil"], negatifs: ["délais"] });
  });
});
