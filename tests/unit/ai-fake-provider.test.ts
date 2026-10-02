import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FakeProvider } from "@/lib/ai/providers/fake";
import { reviewAnalysisSchema, draftReplySchema } from "@/lib/ai/schemas";
import type { ReviewForAi } from "@/lib/ai/types";

interface Fixture {
  google_review_id: string;
  auteur: string;
  note: number;
  texte: string | null;
  date_creation: string;
}

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/reviews.json", import.meta.url), "utf8")) as Fixture[];
const ligne = { texte: "Vouvoiement.", exemples: [] };

function versIa(f: Fixture): ReviewForAi {
  return { auteur: f.auteur, note: f.note, texte: f.texte, dateCreation: new Date(f.date_creation), etablissement: "Démo" };
}

describe("jeu de 20 avis fictifs", () => {
  it("contient 20 avis couvrant toutes les notes", () => {
    expect(fixtures).toHaveLength(20);
    expect(new Set(fixtures.map((f) => f.note))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});

describe("fournisseur simulé", () => {
  const ia = new FakeProvider();

  it("analyse les 20 avis avec des sorties conformes au schéma", async () => {
    for (const f of fixtures) {
      const { data } = await ia.analyzeReview({ review: versIa(f), themesConnus: [] });
      expect(reviewAnalysisSchema.safeParse(data).success).toBe(true);
    }
  });

  it("détecte l'avis hors sujet et le problème sur un 4 étoiles critique", async () => {
    const spam = fixtures.find((f) => f.google_review_id === "fx-014")!;
    expect((await ia.analyzeReview({ review: versIa(spam), themesConnus: [] })).data.hors_sujet).toBe(true);
    const quatre = fixtures.find((f) => f.google_review_id === "fx-003")!;
    expect((await ia.analyzeReview({ review: versIa(quatre), themesConnus: [] })).data.probleme_detecte).toBe(true);
  });

  it("rédige des brouillons conformes pour les avis négatifs, consigne comprise", async () => {
    for (const f of fixtures.filter((f) => f.note <= 3)) {
      const review = versIa(f);
      const { data: analyse } = await ia.analyzeReview({ review, themesConnus: [] });
      const brouillon = await ia.draftReply({ review, analyse, ligneDeConduite: ligne });
      expect(draftReplySchema.safeParse(brouillon.data).success).toBe(true);
      expect(brouillon.data.reponse).not.toMatch(/rembours/i);
      const court = await ia.draftReply({ review, analyse, ligneDeConduite: ligne, consigne: "plus court" });
      expect(court.data.reponse.length).toBeLessThan(brouillon.data.reponse.length);
    }
  });
});
