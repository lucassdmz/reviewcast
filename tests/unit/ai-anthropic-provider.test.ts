import { beforeEach, describe, expect, it, vi } from "vitest";

/** SDK simulé : on vérifie ce que le fournisseur envoie et comment il traite les réponses. */
const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    messages = { parse, batches: {} };
  }
  return { default: Anthropic };
});

const { AnthropicProvider } = await import("@/lib/ai/providers/anthropic");
const { AiOutputError, AiProviderError } = await import("@/lib/ai/validate");

const review = { auteur: "Julien M.", note: 1, texte: "Attente d'une heure.", dateCreation: new Date("2026-09-27"), etablissement: "Démo" };
const analyse = {
  sentiment: "NEGATIF",
  gravite: "FORTE",
  resume: "Le client a attendu une heure.",
  themes: [{ libelle: "délais", polarite: "NEGATIF", passage: null }],
  passages_cles: [],
  probleme_detecte: true,
  hors_sujet: false,
};

function reponse(parsed: unknown, extra: Partial<{ stop_reason: string; input_tokens: number }> = {}) {
  return {
    model: "claude-sonnet-5-5",
    stop_reason: extra.stop_reason ?? "end_turn",
    content: [{ type: "text", text: JSON.stringify(parsed) }],
    parsed_output: parsed,
    usage: { input_tokens: extra.input_tokens ?? 100, output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: 0 },
  };
}

describe("fournisseur Anthropic", () => {
  const ia = new AnthropicProvider("cle-test", { analyse: "claude-sonnet-5-5", redaction: "claude-opus-5-5" });

  beforeEach(() => parse.mockReset());

  it("envoie un prompt système mis en cache, un format JSON et l'avis encadré", async () => {
    parse.mockResolvedValue(reponse(analyse));
    const { data, usage } = await ia.analyzeReview({ review, themesConnus: ["accueil"] });
    expect(data.sentiment).toBe("NEGATIF");
    expect(usage).toEqual({ modele: "claude-sonnet-5-5", tokensIn: 100, tokensOut: 20, cacheRead: 50, cacheWrite: 0 });

    const params = parse.mock.calls[0][0];
    expect(params.model).toBe("claude-sonnet-5-5");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.output_config.effort).toBe("low");
    expect(params.messages[0].content).toContain("<avis auteur=\"Julien M.\"");
    expect(params.thinking).toBeUndefined();
  });

  it("utilise le modèle de rédaction pour les brouillons", async () => {
    parse.mockResolvedValue({ ...reponse({ reponse: Array(50).fill("mot").join(" ") }), model: "claude-opus-5-5" });
    await ia.draftReply({ review, analyse: null, ligneDeConduite: { texte: "Ton.", exemples: [] } });
    expect(parse.mock.calls[0][0].model).toBe("claude-opus-5-5");
  });

  it("réessaie une fois avec le motif, en cumulant les tokens", async () => {
    parse
      .mockResolvedValueOnce(reponse({ ...analyse, sentiment: "COLERE" }))
      .mockResolvedValueOnce(reponse(analyse, { input_tokens: 130 }));
    const { usage } = await ia.analyzeReview({ review, themesConnus: [] });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[1][0].messages[0].content).toMatch(/ne respectait pas le format attendu \(sentiment/);
    expect(usage.tokensIn).toBe(230);
  });

  it("échoue visiblement après deux sorties invalides", async () => {
    parse.mockResolvedValue(reponse({ ...analyse, sentiment: "COLERE" }));
    await expect(ia.analyzeReview({ review, themesConnus: [] })).rejects.toBeInstanceOf(AiOutputError);
  });

  it("signale un refus du modèle et une clé invalide en français", async () => {
    parse.mockResolvedValueOnce(reponse(analyse, { stop_reason: "refusal" }));
    await expect(ia.analyzeReview({ review, themesConnus: [] })).rejects.toThrow(/refusé/);

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    parse.mockRejectedValueOnce(new Anthropic.AuthenticationError(401, undefined, "401", new Headers()));
    const erreur = await ia.analyzeReview({ review, themesConnus: [] }).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(AiProviderError);
    expect((erreur as Error).message).toMatch(/Clé API/);
  });
});
