import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "@/lib/auth/allowlist";

describe("liste blanche des e-mails", () => {
  it("découpe la variable d'environnement en ignorant casse et espaces", () => {
    expect(parseAllowedEmails(" Lucas@Exemple.fr , autre@exemple.fr,, ")).toEqual([
      "lucas@exemple.fr",
      "autre@exemple.fr",
    ]);
  });

  it("autorise une adresse présente quelle que soit la casse", () => {
    const allowed = parseAllowedEmails("lucas@exemple.fr");
    expect(isAllowedEmail("LUCAS@exemple.fr", allowed)).toBe(true);
  });

  it("refuse une adresse absente, vide ou nulle", () => {
    const allowed = parseAllowedEmails("lucas@exemple.fr");
    expect(isAllowedEmail("inconnu@exemple.fr", allowed)).toBe(false);
    expect(isAllowedEmail("", allowed)).toBe(false);
    expect(isAllowedEmail(null, allowed)).toBe(false);
    expect(isAllowedEmail(undefined, allowed)).toBe(false);
  });
});
