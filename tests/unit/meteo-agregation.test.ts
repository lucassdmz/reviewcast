import { describe, expect, it } from "vitest";
import { courbeHebdomadaire, douzeMoisGlissants, evolution, moisCourant, moisPrecedent, statsPeriode } from "@/lib/meteo/agregation";

const maintenant = new Date("2026-10-02T10:00:00Z");
const avis = [
  { note: 5, dateCreation: new Date("2026-10-01T09:00:00Z") },
  { note: 4, dateCreation: new Date("2026-09-30T09:00:00Z") },
  { note: 2, dateCreation: new Date("2026-09-15T09:00:00Z") },
  { note: 5, dateCreation: new Date("2026-09-01T00:00:00Z") },
  { note: 1, dateCreation: new Date("2025-10-15T09:00:00Z") },
  { note: 3, dateCreation: new Date("2025-09-30T09:00:00Z") },
];

describe("périodes", () => {
  it("borne le mois courant, le mois précédent et 12 mois glissants", () => {
    expect(moisCourant(maintenant)).toEqual({ debut: new Date("2026-10-01T00:00:00Z"), fin: new Date("2026-11-01T00:00:00Z") });
    expect(moisPrecedent(maintenant)).toEqual({ debut: new Date("2026-09-01T00:00:00Z"), fin: new Date("2026-10-01T00:00:00Z") });
    expect(douzeMoisGlissants(maintenant).debut).toEqual(new Date("2025-11-01T00:00:00Z"));
  });
});

describe("statistiques d'une période", () => {
  it("calcule volume, moyenne et part d'enthousiastes", () => {
    const s = statsPeriode(avis, moisPrecedent(maintenant));
    expect(s).toEqual({ volume: 3, noteMoyenne: 3.67, nbEnthousiastes: 2, partEnthousiastes: 66.67 });
  });

  it("renvoie des valeurs nulles sans avis", () => {
    expect(statsPeriode([], moisCourant(maintenant))).toEqual({ volume: 0, noteMoyenne: null, nbEnthousiastes: 0, partEnthousiastes: null });
  });

  it("exclut les avis hors des 12 mois glissants", () => {
    expect(statsPeriode(avis, douzeMoisGlissants(maintenant)).volume).toBe(4);
  });
});

describe("courbe hebdomadaire", () => {
  it("produit 8 semaines du lundi, la dernière contenant aujourd'hui", () => {
    const courbe = courbeHebdomadaire(avis, maintenant);
    expect(courbe).toHaveLength(8);
    expect(courbe[7].semaine).toEqual(new Date("2026-09-28T00:00:00Z"));
    expect(courbe[0].semaine).toEqual(new Date("2026-08-10T00:00:00Z"));
    expect(courbe[7]).toMatchObject({ noteMoyenne: 4.5, volume: 2 });
    expect(courbe[5]).toMatchObject({ noteMoyenne: 2, volume: 1 });
    expect(courbe[0].noteMoyenne).toBeNull();
  });
});

describe("évolution", () => {
  it("compare deux valeurs et tolère l'absence", () => {
    expect(evolution(4.5, 4.2)).toBe(0.3);
    expect(evolution(4.5, null)).toBeNull();
  });
});
