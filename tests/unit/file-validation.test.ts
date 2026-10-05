import { describe, expect, it } from "vitest";
import { consigneSchema, noteInterneSchema, texteReponseSchema } from "@/lib/file/validation";

describe("validation des entrées de la file", () => {
  it("nettoie et accepte une réponse correcte", () => {
    expect(texteReponseSchema.parse("  Bonjour, merci pour votre retour.  ")).toBe("Bonjour, merci pour votre retour.");
  });

  it("refuse une réponse vide, trop courte ou trop longue", () => {
    expect(texteReponseSchema.safeParse("   ").success).toBe(false);
    expect(texteReponseSchema.safeParse("Merci.").success).toBe(false);
    expect(texteReponseSchema.safeParse("a ".repeat(2100)).success).toBe(false);
  });

  it("borne la consigne et la note interne", () => {
    expect(consigneSchema.parse("")).toBe("");
    expect(consigneSchema.safeParse("x".repeat(301)).success).toBe(false);
    expect(noteInterneSchema.safeParse("").success).toBe(false);
    expect(noteInterneSchema.parse(" client rappelé ")).toBe("client rappelé");
  });
});
