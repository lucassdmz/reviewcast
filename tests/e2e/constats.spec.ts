import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { DATABASE_URL, fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Les fiches de constat n'ont pas de place réservée : on crée un sujet qui
 * monte sur les données de démonstration, sa fiche apparaît, puis une fois vue
 * elle ne revient plus. Le QR, lui, se trouve dans Réglages.
 */
const EMAIL = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim() || "test@exemple.fr";
const THEME = "e2e-theme-constat";
const LIBELLE = "Sujet de test";

async function base<T>(action: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    return await action(c);
  } finally {
    await c.end();
  }
}

async function nettoyer(c: Client) {
  await c.query(`DELETE FROM constats_vus WHERE cle = $1`, [`sujet_monte:${THEME}`]);
  await c.query(`DELETE FROM reviews WHERE google_review_id LIKE 'e2e-constat-%'`);
  await c.query(`DELETE FROM themes WHERE id = $1`, [THEME]);
}

test.describe("constats de l'accueil", () => {
  let sessionToken = "";
  let locationId = "";

  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
    await base(async (c) => {
      await nettoyer(c);
      const { rows } = await c.query<{ id: string }>(
        `SELECT l.id FROM locations l JOIN google_connections g ON g.id = l.google_connection_id JOIN users u ON u.id = g.user_id
         WHERE u.email = $1 ORDER BY l.created_at LIMIT 1`,
        [EMAIL],
      );
      locationId = rows[0].id;
      await c.query(`INSERT INTO themes (id, libelle, polarite, origine) VALUES ($1, $2, 'NEGATIF', 'IA')`, [THEME, LIBELLE]);
      // Six avis récents sur le sujet, et une référence neutre plus ancienne : le sujet passe devant tous les autres.
      for (let i = 0; i < 16; i++) {
        const recent = i < 6;
        const id = `e2e-constat-${i}`;
        await c.query(
          `INSERT INTO reviews (id, google_review_id, location_id, auteur, note, texte, date_creation, date_maj, updated_at)
           VALUES ($1, $1, $2, 'Client de test', $3, 'Avis de test.', now() - make_interval(days => $4), now(), now())`,
          [id, locationId, recent ? 2 : 4, recent ? 3 : 30],
        );
        await c.query(`INSERT INTO review_analyses (id, review_id, sentiment, resume, modele) VALUES ($1, $1, 'MIXTE', 'Résumé.', 'test')`, [id]);
        if (recent) await c.query(`INSERT INTO review_analysis_themes (analysis_id, theme_id, polarite) VALUES ($1, $2, 'NEGATIF')`, [id, THEME]);
      }
    });
  });

  test.afterEach(async () => {
    await base(nettoyer);
    await fermerSession(sessionToken);
  });

  test("le sujet qui monte apparaît quand ses critères sont remplis, puis ne se répète pas", async ({ page }) => {
    await page.goto("/");
    const pile = page.getByRole("region", { name: "Les gestes du matin" });
    const active = pile.locator('[data-pos="0"]');
    await expect(pile.getByText("Sujet de test")).toHaveCount(1);
    // Aucune carte ne publie : on passe chacune jusqu'à la fiche.
    for (let i = 0; i < 6 && !(await active.getByText("Le sujet qui monte").isVisible()); i++) {
      await active.getByRole("button", { name: /Suivant|Plus tard|Terminer/ }).first().click();
    }
    await expect(active.getByText(LIBELLE)).toBeVisible();
    await expect(active.getByText("6 avis en parlent ces 14 derniers jours, c’était rare jusqu’ici.")).toBeVisible();
    await expect(active.getByRole("link", { name: "Lire ces avis" })).toHaveAttribute("href", `/tendances/theme/${THEME}`);

    await active.getByRole("button", { name: /Suivant|Terminer/ }).click();
    await expect.poll(() => base(async (c) => (await c.query(`SELECT 1 FROM constats_vus WHERE cle = $1`, [`sujet_monte:${THEME}`])).rowCount)).toBe(1);
    await page.reload();
    await expect(page.getByRole("region", { name: "Les gestes du matin" }).getByText(LIBELLE)).toHaveCount(0);
  });

  test("le QR ne figure plus dans la pile : il se trouve dans Réglages", async ({ page }) => {
    await base((c) => c.query(`UPDATE settings SET lien_avis = 'https://g.page/r/demo/review' WHERE location_id = $1`, [locationId]));
    try {
      await page.goto("/");
      await expect(page.getByText("Afficher mon QR")).toHaveCount(0);
      await expect(page.getByText(/Demandez un avis à chaque client/)).toHaveCount(0);
      await page.goto("/reglages");
      await page.getByRole("link", { name: /Lien d’avis Google/ }).click();
      await expect(page.getByRole("region", { name: "Votre QR d’avis" }).locator("svg")).toBeVisible();
      await expect(page.getByRole("link", { name: "Télécharger mon QR" })).toHaveAttribute("download", "qr-avis-google.svg");
    } finally {
      await base((c) => c.query(`UPDATE settings SET lien_avis = NULL WHERE location_id = $1`, [locationId]));
    }
  });
});
