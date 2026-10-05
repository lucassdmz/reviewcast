import { z } from "zod";

/**
 * Variables d'environnement côté serveur, validées au premier accès.
 * Les clés ne sont jamais exposées au front : ce module ne doit être importé
 * que depuis du code serveur (lib/, routes API, composants serveur).
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET doit faire au moins 16 caractères"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  ALLOWED_EMAILS: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, "base64").length === 32,
      "ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64",
    ),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration invalide (.env) :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}
