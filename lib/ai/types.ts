import type { FournisseurIa } from "@/lib/db/generated/enums";
import type { Voix } from "@/lib/voix/reglages";
import type {
  DraftReplyOutput,
  MonthlySummaryOutput,
  ReviewAnalysisOutput,
  ThankYouOutput,
  WeatherSentenceOutput,
} from "./schemas";

/** Tâches IA du cahier des charges (section 4.1). */
export type AiTask = "analyse" | "brouillon" | "remerciement" | "meteo" | "synthese";

/** Consommation d'un appel, telle que renvoyée par le fournisseur. */
export interface AiUsage {
  modele: string;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface AiResult<T> {
  data: T;
  usage: AiUsage;
}

/** Avis tel que vu par l'IA : jamais d'identifiant interne, jamais de donnée inutile. */
export interface ReviewForAi {
  auteur: string;
  note: number;
  texte: string | null;
  dateCreation: Date;
  etablissement: string;
}

/** Ligne de conduite (section 4.2) : texte libre + réponses de référence. */
export interface LigneDeConduite {
  texte: string;
  exemples: string[];
  /** Réglages de la voix de l'établissement, pour les fournisseurs qui ne lisent pas le texte (simulé). */
  voix?: Voix;
}

export interface AnalyzeReviewInput {
  review: ReviewForAi;
  /** Libellés de la taxonomie et des thèmes déjà créés, pour favoriser la réutilisation. */
  themesConnus: string[];
}

export interface DraftReplyInput {
  review: ReviewForAi;
  analyse: ReviewAnalysisOutput | null;
  ligneDeConduite: LigneDeConduite;
  /** Consigne de régénération (« plus court », « propose un geste commercial »). */
  consigne?: string;
  brouillonPrecedent?: string;
}

export interface ThankYouInput {
  review: ReviewForAi;
  ligneDeConduite: LigneDeConduite;
}

export interface WeatherSentenceInput {
  etablissement: string | null;
  mois: string;
  volume: number;
  nbEnthousiastes: number;
  noteMoyenne: number;
  themesPositifs: string[];
  themesNegatifs: string[];
}

export interface SummarizeInput {
  etablissement: string | null;
  periode: string;
  volume: number;
  noteMoyenne: number;
  noteMoyennePrecedente: number | null;
  repartition: Record<"1" | "2" | "3" | "4" | "5", number>;
  themesPositifs: { libelle: string; nombre: number }[];
  themesNegatifs: { libelle: string; nombre: number }[];
  tauxReponse: number | null;
}

/**
 * Contrat commun à tous les fournisseurs. Chaque méthode renvoie une sortie
 * déjà validée par zod (section 4.1) et la consommation de l'appel.
 */
export interface AiProvider {
  readonly nom: FournisseurIa | "FAKE";
  analyzeReview(input: AnalyzeReviewInput): Promise<AiResult<ReviewAnalysisOutput>>;
  draftReply(input: DraftReplyInput): Promise<AiResult<DraftReplyOutput>>;
  thankYouNote(input: ThankYouInput): Promise<AiResult<ThankYouOutput>>;
  weatherSentence(input: WeatherSentenceInput): Promise<AiResult<WeatherSentenceOutput>>;
  summarize(input: SummarizeInput): Promise<AiResult<MonthlySummaryOutput>>;
}

/** Modèles utilisés par un fournisseur, surchargeables dans les réglages. */
export interface AiModels {
  analyse: string;
  redaction: string;
}

export interface AiConfig {
  fournisseur: FournisseurIa | "FAKE";
  apiKey: string | null;
  modeles: AiModels;
}
