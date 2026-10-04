import { describe, expect, it } from "vitest";
import { lireTheme } from "@/lib/apparence";

describe("apparence", () => {
  it("est claire par défaut, sans cookie ou avec une valeur inconnue", () => {
    expect(lireTheme(undefined)).toBe("clair");
    expect(lireTheme(null)).toBe("clair");
    expect(lireTheme("")).toBe("clair");
    expect(lireTheme("fuchsia")).toBe("clair");
  });

  it("respecte le choix enregistré", () => {
    expect(lireTheme("sombre")).toBe("sombre");
    expect(lireTheme("systeme")).toBe("systeme");
    expect(lireTheme("clair")).toBe("clair");
  });
});
