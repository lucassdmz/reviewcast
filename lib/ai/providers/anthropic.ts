import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ParsedMessage } from "@anthropic-ai/sdk/lib/parser";
import type { z } from "zod";
import {
  analyzePrompt,
  draftPrompt,
  summaryPrompt,
  systemPrompt,
  thankYouPrompt,
  weatherPrompt,
} from "../prompts";
import {
  draftReplySchema,
  monthlySummarySchema,
  reviewAnalysisSchema,
  thankYouSchema,
  weatherSentenceSchema,
  type ReviewAnalysisOutput,
} from "../schemas";
import type {
  AiModels,
  AiProvider,
  AiResult,
  AiTask,
  AiUsage,
  AnalyzeReviewInput,
  DraftReplyInput,
  LigneDeConduite,
  SummarizeInput,
  ThankYouInput,
  WeatherSentenceInput,
} from "../types";
import { AiOutputError, AiProviderError, validerAvecNouvelEssai } from "../validate";

/** Ligne de conduite neutre pour les tâches qui n'en dépendent pas (analyse, météo, synthèse). */
const LIGNE_NEUTRE: LigneDeConduite = { texte: "", exemples: [] };

/**
 * Fournisseur Anthropic (section 4.1) : sorties structurées validées par zod,
 * prompt système mis en cache, nouvel essai unique en cas de sortie invalide.
 */
export class AnthropicProvider implements AiProvider {
  readonly nom = "ANTHROPIC" as const;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly modeles: AiModels,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  analyzeReview(input: AnalyzeReviewInput) {
    return this.appeler("analyse", this.modeles.analyse, LIGNE_NEUTRE, analyzePrompt(input), reviewAnalysisSchema, "low");
  }

  draftReply(input: DraftReplyInput) {
    return this.appeler("brouillon", this.modeles.redaction, input.ligneDeConduite, draftPrompt(input), draftReplySchema, "medium");
  }

  thankYouNote(input: ThankYouInput) {
    return this.appeler("remerciement", this.modeles.analyse, input.ligneDeConduite, thankYouPrompt(input), thankYouSchema, "low");
  }

  weatherSentence(input: WeatherSentenceInput) {
    return this.appeler("meteo", this.modeles.analyse, LIGNE_NEUTRE, weatherPrompt(input), weatherSentenceSchema, "low");
  }

  summarize(input: SummarizeInput) {
    return this.appeler("synthese", this.modeles.redaction, LIGNE_NEUTRE, summaryPrompt(input), monthlySummarySchema, "medium");
  }

  /**
   * Analyse par lots via la Batch API (section 4.3, traitement nocturne à −50 %).
   * Renvoie l'identifiant du lot ; les résultats se récupèrent avec `recupererLotAnalyses`.
   */
  async soumettreLotAnalyses(items: { id: string; input: AnalyzeReviewInput }[]): Promise<string> {
    const batch = await this.client.messages.batches.create({
      requests: items.map((item) => ({
        custom_id: item.id,
        params: this.parametres(this.modeles.analyse, LIGNE_NEUTRE, analyzePrompt(item.input), reviewAnalysisSchema, "low"),
      })),
    });
    return batch.id;
  }

  async recupererLotAnalyses(batchId: string): Promise<{
    termine: boolean;
    resultats: Map<string, AiResult<ReviewAnalysisOutput> | AiOutputError | AiProviderError>;
  }> {
    const batch = await this.client.messages.batches.retrieve(batchId);
    const resultats = new Map<string, AiResult<ReviewAnalysisOutput> | AiOutputError | AiProviderError>();
    if (batch.processing_status !== "ended") return { termine: false, resultats };

    for await (const item of await this.client.messages.batches.results(batchId)) {
      if (item.result.type !== "succeeded") {
        resultats.set(item.custom_id, new AiProviderError(`Lot ${batchId} : requête ${item.custom_id} en état ${item.result.type}`));
        continue;
      }
      const message = item.result.message;
      const texte = message.content.find((b) => b.type === "text")?.text ?? "";
      const parse = reviewAnalysisSchema.safeParse(tenterJson(texte));
      resultats.set(
        item.custom_id,
        parse.success
          ? { data: parse.data, usage: usageDepuis(message.model, message.usage) }
          : new AiOutputError("analyse", parse.error.issues.map((i) => i.message).join(" ; "), texte),
      );
    }
    return { termine: true, resultats };
  }

  private parametres<T>(
    modele: string,
    ligne: LigneDeConduite,
    prompt: string,
    schema: z.ZodType<T>,
    effort: "low" | "medium",
  ): Anthropic.MessageCreateParamsNonStreaming {
    return {
      model: modele,
      max_tokens: 2048,
      system: [{ type: "text", text: systemPrompt(ligne), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
      output_config: { effort, format: zodOutputFormat(schema) },
    };
  }

  private async appeler<T>(
    tache: AiTask,
    modele: string,
    ligne: LigneDeConduite,
    prompt: string,
    schema: z.ZodType<T>,
    effort: "low" | "medium",
  ): Promise<AiResult<T>> {
    let usage: AiUsage = { modele, tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0 };
    const data = await validerAvecNouvelEssai(tache, schema, async (_tentative, motif) => {
      const contenu = motif
        ? `${prompt}\n\nVotre réponse précédente ne respectait pas le format attendu (${motif}). Corrigez-la.`
        : prompt;
      let message: ParsedMessage<T>;
      try {
        message = await this.client.messages.parse({
          ...this.parametres(modele, ligne, contenu, schema, effort),
          output_config: { effort, format: zodOutputFormat(schema) },
        });
      } catch (error) {
        throw new AiProviderError(decrireErreurApi(error), error);
      }
      if (message.stop_reason === "refusal") {
        throw new AiProviderError("Le modèle a refusé de traiter cette demande.");
      }
      const u = usageDepuis(message.model, message.usage);
      usage = {
        modele: u.modele,
        tokensIn: usage.tokensIn + u.tokensIn,
        tokensOut: usage.tokensOut + u.tokensOut,
        cacheRead: usage.cacheRead + u.cacheRead,
        cacheWrite: usage.cacheWrite + u.cacheWrite,
      };
      if (message.parsed_output !== null && message.parsed_output !== undefined) return message.parsed_output;
      const texte = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
      return tenterJson(texte);
    });
    return { data, usage };
  }
}

function usageDepuis(modele: string, usage: Anthropic.Messages.Usage): AiUsage {
  return {
    modele,
    tokensIn: usage.input_tokens,
    tokensOut: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
  };
}

function tenterJson(texte: string): unknown {
  try {
    return JSON.parse(texte);
  } catch {
    return texte;
  }
}

function decrireErreurApi(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "Clé API Anthropic invalide. Vérifiez-la dans Réglages.";
  if (error instanceof Anthropic.RateLimitError) return "Quota Anthropic atteint. Réessayez dans quelques minutes.";
  if (error instanceof Anthropic.APIError) return `Erreur Anthropic (${error.status}) : ${error.message}`;
  if (error instanceof Error) return `Fournisseur IA injoignable : ${error.message}`;
  return "Fournisseur IA injoignable.";
}
