import type { FournisseurIa } from "@/lib/db/generated/enums";
import type { AiProvider } from "../types";
import { AiProviderError } from "../validate";

/** OpenAI et Ollama sont prévus par le cdc mais livrés dans un lot ultérieur. */
export class UnavailableProvider implements AiProvider {
  constructor(readonly nom: FournisseurIa) {}

  private indisponible(): never {
    throw new AiProviderError(`Le fournisseur ${this.nom} n'est pas encore disponible. Choisissez Anthropic dans Réglages.`);
  }

  analyzeReview(): never {
    return this.indisponible();
  }
  draftReply(): never {
    return this.indisponible();
  }
  thankYouNote(): never {
    return this.indisponible();
  }
  weatherSentence(): never {
    return this.indisponible();
  }
  summarize(): never {
    return this.indisponible();
  }
}
