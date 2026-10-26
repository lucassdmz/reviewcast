import "dotenv/config";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

export const EMAIL_DE_TEST = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim() || "test@exemple.fr";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie";

/** Préfixe des identifiants Google des données créées par les parcours, pour les reconnaître et les nettoyer. */
export const PREFIXE_E2E = "e2e/";

/**
 * Accès SQL direct pour les parcours : le client Prisma n'est pas chargeable
 * depuis Playwright.
 */
export async function avecBase<T>(action: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

export function idDeTest(): string {
  return `e2e_${randomBytes(8).toString("hex")}`;
}

/** L'utilisateur de test, créé au besoin. */
export async function utilisateurDeTest(db: Client): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES ($1, $2, 'Testeuse Playwright', now(), now())
     ON CONFLICT (email) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [idDeTest(), EMAIL_DE_TEST],
  );
  return rows[0].id;
}
