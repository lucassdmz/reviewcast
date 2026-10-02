import { z } from "zod";

/**
 * Schémas des sorties IA (section 4.1 du cdc). Les contraintes de longueur
 * sont portées par des `refine` : elles sont vérifiées après réception, mais
 * n'entrent pas dans le schéma JSON transmis au modèle.
 */

export const sentimentSchema = z.enum(["POSITIF", "NEUTRE", "MIXTE", "NEGATIF"]);
export const graviteSchema = z.enum(["FAIBLE", "MOYENNE", "FORTE"]);
export const polariteSchema = z.enum(["POSITIF", "NEGATIF", "MIXTE"]);

export function compterMots(texte: string): number {
  return texte.trim().split(/\s+/).filter(Boolean).length;
}

export const themeDetecteSchema = z.object({
  libelle: z.string().refine((s) => s.trim().length > 0 && s.length <= 40, "libellé vide ou trop long"),
  polarite: polariteSchema,
  passage: z.string().nullable(),
});

export const reviewAnalysisSchema = z.object({
  sentiment: sentimentSchema,
  gravite: graviteSchema.nullable(),
  resume: z.string().refine((s) => compterMots(s) >= 3 && compterMots(s) <= 60, "résumé en une phrase"),
  themes: z.array(themeDetecteSchema).refine((t) => t.length <= 6, "6 thèmes maximum"),
  passages_cles: z.array(z.string()).refine((p) => p.length <= 5, "5 passages maximum"),
  probleme_detecte: z.boolean(),
  hors_sujet: z.boolean(),
});
export type ReviewAnalysisOutput = z.infer<typeof reviewAnalysisSchema>;

export const draftReplySchema = z.object({
  reponse: z
    .string()
    .refine((s) => compterMots(s) >= 25 && compterMots(s) <= 140, "réponse entre 40 et 120 mots"),
});
export type DraftReplyOutput = z.infer<typeof draftReplySchema>;

export const thankYouSchema = z.object({
  message: z.string().refine((s) => compterMots(s) >= 5 && compterMots(s) <= 60, "deux phrases maximum"),
});
export type ThankYouOutput = z.infer<typeof thankYouSchema>;

export const weatherSentenceSchema = z.object({
  phrase: z.string().refine((s) => s.length >= 10 && s.length <= 220, "une seule phrase courte"),
});
export type WeatherSentenceOutput = z.infer<typeof weatherSentenceSchema>;

export const monthlySummarySchema = z.object({
  constats: z.array(z.string()).refine((c) => c.length >= 1 && c.length <= 3, "1 à 3 constats"),
  vigilance: z.string(),
  action: z.string(),
});
export type MonthlySummaryOutput = z.infer<typeof monthlySummarySchema>;

/** Rend la synthèse mensuelle en 5 lignes maximum (section 3.3). */
export function synthesEnLignes(s: MonthlySummaryOutput): string[] {
  return [...s.constats, `Point de vigilance : ${s.vigilance}`, `Action suggérée : ${s.action}`];
}
