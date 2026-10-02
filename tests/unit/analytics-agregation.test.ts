import { describe, expect, it } from "vitest";
import { classerThemes, courbeMensuelle, formaterDelai, reactivite, repartitionEtoiles, type LigneJour } from "@/lib/analytics/agregation";

const jour = (date: string, partiel: Partial<LigneJour>): LigneJour => ({
  jour: new Date(date),
  volume: 0,
  sommeNotes: 0,
  nb1: 0,
  nb2: 0,
  nb3: 0,
  nb4: 0,
  nb5: 0,
  nbNegatifs: 0,
  nbNegatifsRepondus: 0,
  sommeDelaiHeures: 0,
  ...partiel,
});

describe("classement des thèmes", () => {
  it("sépare ce qui plaît de ce qui revient comme problème, avec l'évolution", () => {
    const actuels = [
      { themeId: "a", libelle: "accueil", polarite: "POSITIF" as const, nombre: 3 },
      { themeId: "a", libelle: "accueil", polarite: "POSITIF" as const, nombre: 2 },
      { themeId: "d", libelle: "délais", polarite: "NEGATIF" as const, nombre: 4 },
      { themeId: "p", libelle: "prix", polarite: "NEGATIF" as const, nombre: 1 },
      { themeId: "m", libelle: "mixte", polarite: "MIXTE" as const, nombre: 9 },
    ];
    const precedents = [{ themeId: "d", libelle: "délais", polarite: "NEGATIF" as const, nombre: 2 }];
    const r = classerThemes(actuels, precedents);
    expect(r.positifs).toEqual([{ themeId: "a", libelle: "accueil", nombre: 5, evolution: null }]);
    expect(r.negatifs).toEqual([
      { themeId: "d", libelle: "délais", nombre: 4, evolution: 2 },
      { themeId: "p", libelle: "prix", nombre: 1, evolution: null },
    ]);
  });

  it("limite à 5 thèmes par liste", () => {
    const actuels = Array.from({ length: 8 }, (_, i) => ({ themeId: `t${i}`, libelle: `t${i}`, polarite: "POSITIF" as const, nombre: 8 - i }));
    expect(classerThemes(actuels, []).positifs).toHaveLength(5);
  });
});

describe("répartition et courbe", () => {
  const lignes = [
    jour("2026-08-10", { volume: 2, sommeNotes: 9, nb4: 1, nb5: 1 }),
    jour("2026-09-05", { volume: 2, sommeNotes: 3, nb1: 1, nb2: 1, nbNegatifs: 2, nbNegatifsRepondus: 1, sommeDelaiHeures: 30 }),
  ];

  it("répartit les étoiles en nombre et en pourcentage", () => {
    const r = repartitionEtoiles(lignes);
    expect(r.volume).toBe(4);
    expect(r.noteMoyenne).toBe(3);
    expect(r.etoiles).toEqual({ "1": 1, "2": 1, "3": 0, "4": 1, "5": 1 });
    expect(r.parts["5"]).toBe(25);
    expect(repartitionEtoiles([]).noteMoyenne).toBeNull();
  });

  it("produit un point par mois civil, vide compris", () => {
    const c = courbeMensuelle(lignes, new Date("2026-07-15T00:00:00Z"), new Date("2026-10-01T00:00:00Z"));
    expect(c.map((p) => p.noteMoyenne)).toEqual([null, 4.5, 1.5]);
    expect(c[0].mois).toEqual(new Date("2026-07-01T00:00:00Z"));
  });

  it("calcule le taux et le délai de réponse aux avis négatifs", () => {
    expect(reactivite(lignes)).toEqual({ nbNegatifs: 2, nbRepondus: 1, tauxReponse: 50, delaiMoyenHeures: 30 });
    expect(reactivite([]).tauxReponse).toBeNull();
  });

  it("formate un délai lisible", () => {
    expect(formaterDelai(null)).toBe("–");
    expect(formaterDelai(0.5)).toBe("moins d'une heure");
    expect(formaterDelai(30)).toBe("30 h");
    expect(formaterDelai(72)).toBe("3 j");
  });
});
