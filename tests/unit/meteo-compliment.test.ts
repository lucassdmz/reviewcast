import { describe, expect, it } from "vitest";
import { choisirCompliment, extraitCourt } from "@/lib/meteo/compliment";

const candidats = [
  { auteur: "A", note: 5, texte: "Accueil parfait. Et rapide.", passagesCles: [], dateCreation: new Date("2026-09-01") },
  { auteur: "B", note: 5, texte: "Très bien.", passagesCles: ["Équipe à l'écoute"], dateCreation: new Date("2026-09-20") },
  { auteur: "C", note: 4, texte: "Bien.", passagesCles: [], dateCreation: new Date("2026-09-25") },
  { auteur: "D", note: 5, texte: null, passagesCles: [], dateCreation: new Date("2026-09-26") },
];

describe("compliment du moment", () => {
  it("ne retient que les 5 étoiles avec du texte et préfère les passages clés", () => {
    expect(choisirCompliment(candidats, 0)).toEqual({ texte: "Équipe à l'écoute", auteur: "B" });
    expect(choisirCompliment(candidats, 0.99)).toEqual({ texte: "Accueil parfait.", auteur: "A" });
  });

  it("tourne selon le tirage et reste dans les bornes", () => {
    expect(choisirCompliment(candidats, 1.5)?.auteur).toBe("A");
    expect(choisirCompliment(candidats, -1)?.auteur).toBe("B");
  });

  it("renvoie null sans candidat", () => {
    expect(choisirCompliment([candidats[2], candidats[3]], 0.5)).toBeNull();
  });

  it("coupe les extraits trop longs sur la première phrase", () => {
    expect(extraitCourt("Première phrase. Deuxième phrase.")).toBe("Première phrase.");
    expect(extraitCourt("a".repeat(200), 20)).toHaveLength(20);
    expect(extraitCourt("a".repeat(200), 20).endsWith("…")).toBe(true);
  });
});
