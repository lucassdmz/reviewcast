import { z } from "zod";
import { elementSchema } from "./element";

/** Remarques de bêta : tout ce qui vient du navigateur est validé ici avant d'entrer en base. */
export const TEXTE_RETOUR_MAX = 2000;
export const CAPTURE_MAX_OCTETS = 1_500_000;

export const texteRetourSchema = z
  .string()
  .trim()
  .min(2, "Écrivez quelques mots.")
  .max(TEXTE_RETOUR_MAX, `${TEXTE_RETOUR_MAX} caractères au plus.`);

export const contexteRetourSchema = z.object({
  largeur: z.number().int().min(0).max(10000),
  hauteur: z.number().int().min(0).max(10000),
  ratioPixels: z.number().min(0).max(10),
  defilement: z.number().int().min(0).max(1_000_000),
  theme: z.enum(["clair", "sombre"]),
  navigateur: z.string().max(400),
});
export type ContexteRetour = z.infer<typeof contexteRetourSchema>;

export const retourSchema = z.object({
  texte: texteRetourSchema,
  chemin: z.string().startsWith("/").max(500),
  appareil: z.uuid(),
  element: elementSchema.nullable(),
  contexte: contexteRetourSchema,
});
export type RetourSaisi = z.infer<typeof retourSchema>;

/** Seules les captures JPEG produites par la bulle sont acceptées, et pas au-delà de 1,5 Mo. */
export function captureValide(octets: Uint8Array): boolean {
  return octets.length > 3 && octets.length <= CAPTURE_MAX_OCTETS && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
}

export const STATUTS_RETOUR = ["ouvert", "traite", "ecarte"] as const;
export type StatutRetour = (typeof STATUTS_RETOUR)[number];
export const statutRetourSchema = z.enum(STATUTS_RETOUR);
