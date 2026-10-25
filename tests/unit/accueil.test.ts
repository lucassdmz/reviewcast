import { describe, expect, it } from "vitest";
import { prochainPalier } from "@/lib/accueil/palier";
import { phraseAccueil, prenomDepuisSignature } from "@/lib/accueil/phrase";

describe("prochainPalier", () => {
  it("vise le demi-point suivant et compte les 5 étoiles qu'il faut", () => {
    // 24 avis, somme 91 : 3,79 affiché 3,8. Pour afficher 4,0 il faut (91+5n)/(24+n) >= 3,95, soit n = 4.
    const notes = [...Array(14).fill(5), ...Array(5).fill(3), ...Array(4).fill(1), 2].map(Number);
    expect(notes.reduce((s, n) => s + n, 0)).toBe(91);
    const palier = prochainPalier(notes);
    expect(palier).toEqual({ cible: 4, avisCinqEtoiles: 4 });
  });

  it("vise 4,5 depuis 4,2", () => {
    expect(prochainPalier([4, 4, 4, 5, 4])?.cible).toBe(4.5);
  });

  it("n'affiche rien au-dessus de 4,5 arrondi vers 5, ni quand l'objectif est hors de portée", () => {
    expect(prochainPalier(Array(10).fill(5))).toBeNull();
    expect(prochainPalier(Array(200).fill(2))).toBeNull();
    expect(prochainPalier([])).toBeNull();
  });
});

describe("prenomDepuisSignature", () => {
  it("prend le prénom avant la virgule", () => {
    expect(prenomDepuisSignature("Valentine, The Coffee Jacobins")).toBe("Valentine");
  });
  it("ne prend rien quand la signature n'est pas un prénom", () => {
    expect(prenomDepuisSignature("L’équipe The Coffee")).toBeNull();
    expect(prenomDepuisSignature(null)).toBeNull();
  });
});

describe("phraseAccueil", () => {
  it("parle des clients contents puis de ce qui attend", () => {
    const p = phraseAccueil({ prenom: "Valentine", volume: 24, nbContents: 17, aRelire: 2, heure: 9 });
    expect(p.ouverture).toBe("Bonjour, Valentine.");
    expect(p.contents).toBe("17 clients contents sur 24");
    expect(p.suite).toBe(", et 2 avis attendent un mot de vous.");
  });
  it("dit bonsoir et se passe de prénom", () => {
    const p = phraseAccueil({ prenom: null, volume: 3, nbContents: 1, aRelire: 0, heure: 20 });
    expect(p.ouverture).toBe("Bonsoir.");
    expect(p.contents).toBe("1 client content sur 3");
    expect(p.suite).toBe(", et rien n’attend votre réponse.");
  });
});
