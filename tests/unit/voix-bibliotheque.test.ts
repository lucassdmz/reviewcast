import { describe, expect, it } from "vitest";
import { compterExcuses, contientMontant } from "@/lib/ai/controles";
import { SUJETS_COURANTS, sujetsCourantsDisponibles, trouverSujetCourant } from "@/lib/voix/bibliotheque";
import { REGLES_PAR_DEFAUT, regleSujetSchema } from "@/lib/voix/reglages";

describe("bibliothèque de sujets courants", () => {
  it("propose des sujets valides, sans montant ni excuse, et sans « je » ni « nous »", () => {
    for (const s of SUJETS_COURANTS) {
      expect(regleSujetSchema.safeParse(s).success).toBe(true);
      expect(contientMontant(s.dire)).toBe(false);
      expect(compterExcuses(s.dire)).toBe(0);
      expect(s.dire).not.toMatch(/\b(je|nous)\b/i);
    }
    expect(new Set(SUJETS_COURANTS.map((s) => s.cle)).size).toBe(SUJETS_COURANTS.length);
  });

  it("n'offre que les sujets pas encore couverts", () => {
    const tous = sujetsCourantsDisponibles([]).map((s) => s.cle);
    expect(tous).toEqual(SUJETS_COURANTS.map((s) => s.cle));
    const restants = sujetsCourantsDisponibles(REGLES_PAR_DEFAUT).map((s) => s.cle);
    expect(restants).not.toContain("prix");
    expect(restants).not.toContain("accueil");
    expect(restants).not.toContain("places");
    expect(restants).toContain("attente");
  });

  it("retrouve un sujet par sa clé", () => {
    expect(trouverSujetCourant("attente")?.sujet).toBe("L'attente");
    expect(trouverSujetCourant("inconnu")).toBeUndefined();
  });
});

describe("règles de départ", () => {
  it("assument le prix sans l'excuser ni le chiffrer", () => {
    const prix = REGLES_PAR_DEFAUT.find((r) => r.sujet === "Le prix");
    expect(prix?.dire).not.toMatch(/désolé|excuse|regrett/i);
    expect(contientMontant(prix?.dire ?? "")).toBe(false);
    expect(prix?.nePasDire).toContain("Un montant");
  });
});
