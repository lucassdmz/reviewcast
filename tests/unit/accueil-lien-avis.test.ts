import { describe, expect, it } from "vitest";
import { lienAvisSchema } from "@/lib/accueil/lien-avis";

describe("lienAvisSchema", () => {
  it("accepte les liens d'avis Google", () => {
    expect(lienAvisSchema.parse(" https://g.page/r/CabcDEF/review ")).toBe("https://g.page/r/CabcDEF/review");
    expect(lienAvisSchema.parse("https://search.google.com/local/writereview?placeid=ChIJ")).toContain("writereview");
  });
  it("vide le lien quand le champ est vide", () => {
    expect(lienAvisSchema.parse("   ")).toBeNull();
  });
  it("refuse un lien qui ne mène pas à Google", () => {
    expect(lienAvisSchema.safeParse("https://exemple.fr/avis").success).toBe(false);
    expect(lienAvisSchema.safeParse("http://g.page/r/abc").success).toBe(false);
    expect(lienAvisSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
