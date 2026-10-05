import { AnthropicProvider } from "./providers/anthropic";
import { FakeProvider } from "./providers/fake";
import { UnavailableProvider } from "./providers/unavailable";
import type { AiConfig, AiProvider } from "./types";
import { AiProviderError } from "./validate";

/** Instancie le fournisseur choisi dans les réglages (section 4). */
export function createProvider(config: AiConfig): AiProvider {
  switch (config.fournisseur) {
    case "FAKE":
      return new FakeProvider();
    case "ANTHROPIC":
      if (!config.apiKey) {
        throw new AiProviderError("Aucune clé API Anthropic : renseignez-la dans Réglages ou via ANTHROPIC_API_KEY.");
      }
      return new AnthropicProvider(config.apiKey, config.modeles);
    case "OPENAI":
    case "OLLAMA":
      return new UnavailableProvider(config.fournisseur);
  }
}
