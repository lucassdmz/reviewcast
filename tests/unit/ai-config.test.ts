import { describe, expect, it } from "vitest";
import { lireLigneDeConduiteFichier, parserLigneDeConduite } from "@/lib/ai/ligne-de-conduite";

describe("ligne de conduite", () => {
  it("sépare le texte des exemples de réponses", async () => {
    const ligne = await lireLigneDeConduiteFichier(new URL("../fixtures/ligne-de-conduite-test.md", import.meta.url).pathname);
    expect(ligne.texte).toContain("## Interdits");
    expect(ligne.texte).not.toContain("Bonjour Marie");
    expect(ligne.exemples).toHaveLength(3);
    expect(ligne.exemples[0]).toMatch(/^Bonjour Marie/);
  });

  it("tolère un document sans section d'exemples", () => {
    expect(parserLigneDeConduite("# Ton\n\nChaleureux.")).toEqual({ texte: "# Ton\n\nChaleureux.", exemples: [] });
  });

  it("renvoie une ligne vide si le fichier est absent", async () => {
    expect(await lireLigneDeConduiteFichier("/chemin/inexistant.md")).toEqual({ texte: "", exemples: [] });
  });
});
