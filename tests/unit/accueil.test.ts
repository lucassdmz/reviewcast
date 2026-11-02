import { describe, expect, it } from "vitest";
import { prenomDepuisSignature, salutation } from "@/lib/accueil/phrase";

describe("prenomDepuisSignature", () => {
  it("prend le prénom avant la virgule", () => {
    expect(prenomDepuisSignature("Valentine, The Coffee Jacobins")).toBe("Valentine");
  });
  it("ne prend rien quand la signature n'est pas un prénom", () => {
    expect(prenomDepuisSignature("L’équipe The Coffee")).toBeNull();
    expect(prenomDepuisSignature(null)).toBeNull();
  });
});

describe("salutation", () => {
  it("dit bonjour le jour, avec le prénom", () => {
    expect(salutation(9, "Margaux")).toBe("Bonjour Margaux");
  });
  it("dit bonsoir le soir et la nuit, et se passe de prénom", () => {
    expect(salutation(20, null)).toBe("Bonsoir");
    expect(salutation(3, "Margaux")).toBe("Bonsoir Margaux");
  });
});
