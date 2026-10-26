import { randomBytes } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { PREFIXE_E2E, avecBase, idDeTest, utilisateurDeTest } from "./base";

/** Cookie lu par le serveur pour choisir l'établissement affiché (lib/etablissements/actif.ts). */
const COOKIE_ETABLISSEMENT = "etablissement";

/**
 * Ouvre une session Auth.js directement en base (SQL, sans le client Prisma
 * qui n'est pas chargeable depuis Playwright) pour l'utilisateur de test, et
 * pose le cookie correspondant : les parcours protégés se jouent sans Google.
 *
 * La session est épinglée sur l'établissement de démonstration : un parcours
 * qui crée son propre établissement en parallèle ne fait pas basculer les
 * autres en vue d'ensemble.
 */
export async function ouvrirSession(context: BrowserContext): Promise<string> {
  const sessionToken = randomBytes(32).toString("hex");
  const demo = await avecBase(async (db) => {
    const userId = await utilisateurDeTest(db);
    await db.query(
      `INSERT INTO sessions (id, session_token, user_id, expires) VALUES ($1, $2, $3, now() + interval '1 hour')`,
      [idDeTest(), sessionToken, userId],
    );
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM locations WHERE google_location_id NOT LIKE $1 ORDER BY nom LIMIT 1`,
      [`${PREFIXE_E2E}%`],
    );
    return rows[0]?.id ?? null;
  });
  await context.addCookies([
    { name: "authjs.session-token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  if (demo) await choisirEtablissement(context, demo);
  return sessionToken;
}

/** Affiche cet établissement dans le navigateur du parcours. */
export async function choisirEtablissement(context: BrowserContext, locationId: string): Promise<void> {
  await context.addCookies([{ name: COOKIE_ETABLISSEMENT, value: locationId, domain: "localhost", path: "/", sameSite: "Lax" }]);
}

/** Ferme la session de ce test uniquement : les tests tournent en parallèle. */
export async function fermerSession(sessionToken: string): Promise<void> {
  await avecBase((db) => db.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken]));
}
