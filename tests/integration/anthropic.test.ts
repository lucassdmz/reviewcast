import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lireLigneDeConduiteFichier } from "@/lib/ai/ligne-de-conduite";
import { MODELES_PAR_DEFAUT } from "@/lib/ai/pricing";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { TAXONOMIE_INITIALE } from "@/lib/ai/taxonomy";
import type { ReviewForAi } from "@/lib/ai/types";

/**
 * Critère d'acceptation du lot 2 : sur le jeu de 20 avis, 100 % des sorties
 * passent le schéma zod. Exécuté seulement avec ANTHROPIC_API_KEY
 * (npm run test:integration). Coût indicatif : moins de 0,50 $.
 */
interface Fixture {
  google_review_id: string;
  auteur: string;
  note: number;
  texte: string | null;
  jours_avant: number;
}

const cle = process.env.ANTHROPIC_API_KEY;
function dateIlYA(jours: number): Date {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
}

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/reviews.json", import.meta.url), "utf8")) as Fixture[];

describe.skipIf(!cle)("fournisseur Anthropic sur les 20 avis fictifs", () => {
  const ia = new AnthropicProvider(cle ?? "", { ...MODELES_PAR_DEFAUT });
  const themesConnus = TAXONOMIE_INITIALE.map((t) => t.libelle);

  it("analyse puis rédige, avec des sorties valides et la ligne de conduite respectée", async () => {
    const ligneDeConduite = await lireLigneDeConduiteFichier(
      new URL("../fixtures/ligne-de-conduite-test.md", import.meta.url).pathname,
    );
    for (const f of fixtures) {
      const review: ReviewForAi = { auteur: f.auteur, note: f.note, texte: f.texte, dateCreation: dateIlYA(f.jours_avant), etablissement: "Établissement de démonstration" };
      const { data: analyse, usage } = await ia.analyzeReview({ review, themesConnus });
      expect(usage.tokensOut).toBeGreaterThan(0);
      if (f.google_review_id === "fx-014") expect(analyse.hors_sujet).toBe(true);

      if (f.note <= 3) {
        const { data } = await ia.draftReply({ review, analyse, ligneDeConduite });
        expect(data.reponse).not.toMatch(/rembours/i);
        expect(data.reponse).not.toMatch(/Jean-Michel/);
        console.log(`\n[${f.google_review_id}] ${f.note}★ ${f.auteur}\n${data.reponse}`);
      }
    }
  });
});
