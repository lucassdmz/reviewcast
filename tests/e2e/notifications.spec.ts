import "dotenv/config";
import { createECDH, randomBytes } from "node:crypto";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { devices, expect, test } from "@playwright/test";
import { Client } from "pg";
import { fermerSession, ouvrirSession } from "./helpers/session";
import { SECRET_TACHES_TEST } from "./helpers/taches";

/**
 * Lot 6 : notifications push. Un faux service de push local remplace ceux
 * d'Apple ou de Google : on vérifie que les tâches planifiées lui envoient
 * une notification chiffrée et signée, une seule fois par avis.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie";

async function sql<T>(requete: string, valeurs: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(requete, valeurs)).rows as T[];
  } finally {
    await client.end();
  }
}

interface Recu {
  entetes: IncomingHttpHeaders;
  taille: number;
}

test.describe("notifications", () => {
  test.describe.configure({ mode: "serial" });
  let serveur: Server;
  const recus: Recu[] = [];
  let endpoint = "";

  test.beforeAll(async () => {
    serveur = createServer((req, res) => {
      let taille = 0;
      req.on("data", (morceau: Buffer) => (taille += morceau.length));
      req.on("end", () => {
        recus.push({ entetes: req.headers, taille });
        res.writeHead(201).end();
      });
    });
    await new Promise<void>((resolve) => serveur.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}/push/${randomBytes(6).toString("hex")}`;

    // Un appareil abonné aux deux notifications, avec de vraies clés de chiffrement.
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    const [utilisateur] = await sql<{ id: string }>(
      `INSERT INTO users (id, email, name, created_at, updated_at) VALUES ($1, 'push-e2e@exemple.fr', 'Notifications', now(), now())
       ON CONFLICT (email) DO UPDATE SET updated_at = now() RETURNING id`,
      [`e2e_${randomBytes(6).toString("hex")}`],
    );
    await sql(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, nouvel_avis, resume_hebdo, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, true, now())`,
      [`e2e_${randomBytes(6).toString("hex")}`, utilisateur.id, endpoint, ecdh.getPublicKey("base64url"), randomBytes(16).toString("base64url")],
    );
  });

  test.afterAll(async () => {
    await sql("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    await new Promise((resolve) => serveur.close(resolve));
  });

  test("les tâches planifiées exigent leur secret", async ({ request }) => {
    expect((await request.get("/api/taches/avis-a-traiter")).status()).toBe(401);
    const r = await request.get("/api/taches/resume-hebdo", { headers: { Authorization: "Bearer mauvais-secret-de-test-long" } });
    expect(r.status()).toBe(401);
    expect(recus).toHaveLength(0);
  });

  test("un nouvel avis à traiter est notifié une seule fois", async ({ request }) => {
    // Un seul avis de la file est nouveau ; les autres sont déjà notifiés.
    await sql("UPDATE reviews SET notifie_at = now()");
    const [avis] = await sql<{ id: string }>("SELECT id FROM reviews WHERE statut IN ('A_TRAITER', 'BROUILLON_PRET') AND retire_at IS NULL LIMIT 1");
    await sql("UPDATE reviews SET notifie_at = NULL, date_creation = now() - interval '1 day' WHERE id = $1", [avis.id]);

    const autorisation = { Authorization: `Bearer ${SECRET_TACHES_TEST}` };
    const premiere = await request.get("/api/taches/avis-a-traiter", { headers: autorisation });
    expect(await premiere.json()).toEqual({ avis: 1, envoyes: 1 });
    expect(recus).toHaveLength(1);
    expect(recus[0].entetes["content-encoding"]).toBe("aes128gcm");
    expect(recus[0].entetes.authorization).toMatch(/^vapid t=.+, k=.+/);
    expect(recus[0].taille).toBeGreaterThan(0);

    const seconde = await request.get("/api/taches/avis-a-traiter", { headers: autorisation });
    expect(await seconde.json()).toEqual({ avis: 0, envoyes: 0 });
    expect(recus).toHaveLength(1);
  });

  test("le résumé du lundi part vers les appareils abonnés", async ({ request }) => {
    const r = await request.get("/api/taches/resume-hebdo", { headers: { Authorization: `Bearer ${SECRET_TACHES_TEST}` } });
    expect(await r.json()).toEqual({ envoyes: 1 });
    expect(recus).toHaveLength(2);
  });

  test("sur iPhone, Réglages demande d'abord d'installer l'application", async ({ page, context }) => {
    const sessionToken = await ouvrirSession(context);
    try {
      await page.goto("/reglages");
      await page.getByRole("link", { name: /Notifications/ }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
      await expect(page.getByText(/ajoutez d'abord Éclaircie à l'écran d'accueil/)).toBeVisible();
    } finally {
      await fermerSession(sessionToken);
    }
  });

  test("sur Android, Réglages présente les deux notifications", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 7"], baseURL: "http://localhost:3000", locale: "fr-FR" });
    // Chromium sans interface répond toujours « refusé » : on simule un téléphone qui n'a pas encore été sollicité.
    await context.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "default" }));
    const sessionToken = await ouvrirSession(context);
    try {
      const page = await context.newPage();
      await page.goto("/reglages/notifications");
      await page.evaluate(() => navigator.serviceWorker.ready);
      // Le service worker s'installe au premier écran ; l'écran des notifications l'attend.
      await page.reload();
      await expect(page.getByRole("switch", { name: /Avis à traiter/ })).not.toBeChecked();
      await expect(page.getByRole("switch", { name: /Résumé du lundi/ })).not.toBeChecked();
      await expect(page.getByText(/ni nom de client ni texte d'avis/)).toBeVisible();
    } finally {
      await fermerSession(sessionToken);
      await context.close();
    }
  });
});
