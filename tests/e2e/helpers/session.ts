import "dotenv/config";
import { randomBytes } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { Client } from "pg";

const EMAIL = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim() || "test@exemple.fr";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie";

async function avecBase<T>(action: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

/**
 * Ouvre une session Auth.js directement en base (SQL, sans le client Prisma
 * qui n'est pas chargeable depuis Playwright) pour l'utilisateur de test, et
 * pose le cookie correspondant : les parcours protégés se jouent sans Google.
 */
export async function ouvrirSession(context: BrowserContext): Promise<string> {
  const sessionToken = randomBytes(32).toString("hex");
  await avecBase(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (id, email, name, created_at, updated_at)
       VALUES ($1, $2, 'Testeuse Playwright', now(), now())
       ON CONFLICT (email) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [`e2e_${randomBytes(8).toString("hex")}`, EMAIL],
    );
    await db.query(
      `INSERT INTO sessions (id, session_token, user_id, expires) VALUES ($1, $2, $3, now() + interval '1 hour')`,
      [`e2e_${randomBytes(8).toString("hex")}`, sessionToken, rows[0].id],
    );
  });
  await context.addCookies([
    { name: "authjs.session-token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  return sessionToken;
}

/** Ferme la session de ce test uniquement : les tests tournent en parallèle. */
export async function fermerSession(sessionToken: string): Promise<void> {
  await avecBase((db) => db.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken]));
}
