import { z } from "zod";
import { compterMots } from "@/lib/ai/schemas";

/** Entrées des actions de la file, validées avant tout traitement. */
export const identifiantSchema = z.string().min(1).max(64);

export const texteReponseSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "La réponse est vide.")
  .refine((s) => s.length <= 4096, "La réponse dépasse 4096 caractères, limite de Google.")
  .refine((s) => compterMots(s) >= 3, "La réponse est trop courte.");

export const consigneSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length <= 300, "La consigne dépasse 300 caractères.");

export const noteInterneSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "La note est vide.")
  .refine((s) => s.length <= 2000, "La note dépasse 2000 caractères.");

/** Raccourcis de régénération proposés dans la fiche. */
export const CONSIGNES_RAPIDES = [
  { libelle: "Plus court", consigne: "Plus court : deux ou trois phrases maximum." },
  { libelle: "Plus chaleureux", consigne: "Plus chaleureux et personnel, sans formule toute faite." },
  { libelle: "Proposer un geste", consigne: "Propose un geste commercial, sans promettre de remboursement." },
] as const;
