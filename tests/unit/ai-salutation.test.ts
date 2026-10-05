import { describe, expect, it } from "vitest";
import { prenomPourSalutation, salutation } from "@/lib/ai/salutation";

describe("salutation de l'auteur d'un avis", () => {
  it("ne garde que le prénom d'un nom complet", () => {
    expect(prenomPourSalutation("Camille Martin-Dupré")).toBe("Camille");
    expect(prenomPourSalutation("Hugo LEFEBVRE")).toBe("Hugo");
    expect(prenomPourSalutation("Inès B.")).toBe("Inès");
    expect(prenomPourSalutation("Jean-Baptiste Morel")).toBe("Jean-Baptiste");
    expect(salutation("Camille Martin-Dupré")).toBe("Bonjour Camille,");
  });

  it("remet la majuscule à un nom saisi en minuscules", () => {
    expect(prenomPourSalutation("manon girard")).toBe("Manon");
  });

  it("accepte un prénom seul", () => {
    expect(prenomPourSalutation("Mathilde")).toBe("Mathilde");
  });

  it("salue sans nom un pseudonyme, une enseigne ou des initiales", () => {
    for (const auteur of ["K4RIM", "Luna_772", "Momo f96", "nightowl", "A B", "Compagnie Anonyme", "Atelier Dupont & Fils", "Foodie Reviews Lyon!", "Grand Voyageur autour du Monde", "밍밍", ""]) {
      expect(prenomPourSalutation(auteur), auteur).toBeNull();
    }
    expect(salutation("K4RIM")).toBe("Bonjour,");
  });
});
