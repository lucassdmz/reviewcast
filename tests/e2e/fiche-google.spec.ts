import { expect, test, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";
import { URL_FAUX_GOOGLE } from "./helpers/faux-google";
import { DATABASE_URL, fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Connexion de la fiche, sur le faux serveur Google : autorisation, choix de
 * l'établissement, avis à l'écran, puis notification en temps réel, réponse
 * donnée sur Google, avis retiré. Un utilisateur à part : ses fiches ne se
 * mêlent pas à la démonstration des autres parcours.
 */
const EMAIL = "fiche-google@exemple.fr";
const AVIS = "accounts/101/locations/9001/reviews";

async function base<T>(action: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    return await action(c);
  } finally {
    await c.end();
  }
}

const controle = (request: APIRequestContext, chemin: string, data: unknown = {}) => request.post(`${URL_FAUX_GOOGLE}/__controle/${chemin}`, { data });

/** Ouvre l'intervalle entre deux listes : le test n'attend pas la minute réelle. */
const oublierDerniereListe = () => base((c) => c.query(`UPDATE locations SET derniere_liste_at = now() at time zone 'utc' - interval '1 hour' WHERE google_location_id = 'locations/9001'`));

async function pousser(request: APIRequestContext, jeton: string | null, ressource: string) {
  const data = Buffer.from(JSON.stringify({ notificationType: "NEW_REVIEW", locationName: "accounts/101/locations/9001", reviewName: ressource })).toString("base64");
  return request.post("/api/google/notifications", {
    headers: jeton ? { authorization: `Bearer ${jeton}` } : {},
    data: { message: { data, messageId: "1", publishTime: new Date().toISOString() }, subscription: "projects/eclaircie-test/subscriptions/push" },
  });
}

const nouvelAvis = (id: string, auteur: string, note: string, comment: string) => ({
  name: `${AVIS}/${id}`,
  reviewer: { displayName: auteur },
  starRating: note,
  comment,
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString(),
});

test.describe("connexion de la fiche Google", () => {
  test.describe.configure({ mode: "serial" });
  let sessionToken = "";

  test.beforeAll(async ({ request }) => {
    await controle(request, "reinitialiser");
    await base((c) => c.query(`DELETE FROM google_connections WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [EMAIL]));
  });
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context, EMAIL);
  });
  test.afterEach(async () => {
    await fermerSession(sessionToken);
  });

  test("sans fiche, aucun avis d'un autre compte n'est visible", async ({ page }) => {
    await page.goto("/a-traiter");
    await expect(page.getByRole("list", { name: "Avis à traiter" })).toHaveCount(0);
  });

  test("connecter, choisir l'établissement, retrouver ses avis", async ({ page, request }) => {
    await page.goto("/reglages");
    await page.getByRole("link", { name: "Connecter ma fiche Google" }).click();

    // Le faux Google renvoie ici, avec un `state` vérifié ; la fiche vue depuis deux comptes n'apparaît qu'une fois.
    await expect(page).toHaveURL(/\/reglages\/fiche-google$/);
    await expect(page.getByRole("heading", { name: "Quel établissement voulez-vous suivre ?" })).toBeVisible();
    await expect(page.getByText("Café des Éclaircies")).toHaveCount(1);
    await expect(page.getByText("3 place des Terreaux, 69001 Lyon")).toBeVisible();
    await expect(page.getByText("Atelier Roche")).toBeVisible();

    await page.getByRole("listitem").filter({ hasText: "Café des Éclaircies" }).getByRole("button", { name: "Choisir" }).click();
    await expect(page).toHaveURL(/\/avis$/);
    await expect(page.getByRole("link", { name: /Camille Lefort/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Noé Garnier.*Accueil adorable, je reviendrai\./ })).toBeVisible();

    await page.goto("/a-traiter");
    await expect(page.getByRole("list", { name: "Avis à traiter" }).getByText("Camille Lefort")).toBeVisible();
    // Une réponse déjà donnée sur Google : l'avis n'est pas à traiter.
    await expect(page.getByText("Inès Marchand")).toHaveCount(0);

    // Le jeton n'est stocké que chiffré, et le temps réel est enregistré sur le compte.
    const { rows } = await base((c) =>
      c.query<{ refresh_token_encrypted: string; n: string }>(
        `SELECT g.refresh_token_encrypted, (SELECT count(*) FROM reviews r JOIN locations l ON l.id = r.location_id WHERE l.google_connection_id = g.id) AS n
         FROM google_connections g JOIN users u ON u.id = g.user_id WHERE u.email = $1`,
        [EMAIL],
      ),
    );
    expect(rows[0].refresh_token_encrypted).toMatch(/^v1\./);
    expect(Number(rows[0].n)).toBe(59);
    const compteurs = await (await controle(request, "compteurs")).json();
    expect(compteurs.reglage["accounts/101"].notificationTypes).toEqual(["NEW_REVIEW", "UPDATED_REVIEW"]);
  });

  test("l'historique part en lot, repris au passage suivant, sans relire Google", async ({ page, request }) => {
    const avant = (await (await controle(request, "compteurs")).json()).listes;
    const lot = async () =>
      (await base((c) => c.query<{ statut: string; nb_avis: number; fournisseur: boolean }>(`SELECT b.statut, b.nb_avis, b.id_fournisseur IS NOT NULL AS fournisseur FROM lots_analyse b JOIN locations l ON l.id = b.location_id WHERE l.google_location_id = 'locations/9001'`))).rows;

    // L'ouverture de l'écran soumet le lot : un seul, pour tout l'historique.
    await page.goto("/reglages/fiche-google");
    await expect.poll(async () => (await lot())[0]?.statut, { timeout: 30_000 }).toBe("EN_COURS");
    expect(await lot()).toEqual([{ statut: "EN_COURS", nb_avis: 59, fournisseur: true }]);
    await expect(page.getByText(/peut prendre jusqu'à 24 heures/)).toBeVisible();

    // Le passage suivant relève le lot, une fois l'intervalle écoulé.
    await base((c) => c.query(`UPDATE lots_analyse SET releve_le = NULL`));
    await page.goto("/avis");
    await expect.poll(async () => (await lot())[0]?.statut, { timeout: 30_000 }).toBe("TERMINE");
    await expect
      .poll(async () => (await base((c) => c.query<{ n: string }>(`SELECT count(*) AS n FROM reviews r JOIN locations l ON l.id = r.location_id WHERE l.google_location_id = 'locations/9001' AND r.analyse_a_faire`))).rows[0].n, { timeout: 30_000 })
      .toBe("0");
    await page.goto("/avis");
    expect((await (await controle(request, "compteurs")).json()).listes).toBe(avant);
    // Un avis récent à traiter a reçu son brouillon, rien n'est parti sur Google.
    await page.goto("/a-traiter");
    await expect
      .poll(
        async () => {
          await page.goto("/a-traiter");
          return page.getByRole("list", { name: "Avis à traiter" }).getByRole("link").filter({ hasText: "Camille Lefort" }).filter({ hasText: "Brouillon prêt à relire" }).count();
        },
        { timeout: 30_000 },
      )
      .toBe(1);
    expect((await (await controle(request, "compteurs")).json()).reponses).toEqual([]);
  });

  test("une notification sans jeton valide est rejetée", async ({ request }) => {
    expect((await pousser(request, null, `${AVIS}/x`)).status()).toBe(401);
    expect((await pousser(request, "pas-un-jeton", `${AVIS}/x`)).status()).toBe(401);
  });

  test("une notification signée fait entrer le nouvel avis", async ({ page, request }) => {
    await controle(request, "ajouter-avis", nouvelAvis("r-push", "Sacha Pruvost", "ONE", "Commande oubliée deux fois de suite."));
    const { jeton } = await (await controle(request, "jeton-push")).json();

    // Trop tôt après la liste précédente : Pub/Sub représentera le message.
    await base((c) => c.query(`UPDATE locations SET derniere_liste_at = now() at time zone 'utc' WHERE google_location_id = 'locations/9001'`));
    expect((await pousser(request, jeton, `${AVIS}/r-push`)).status()).toBe(429);

    await oublierDerniereListe();
    expect((await pousser(request, jeton, `${AVIS}/r-push`)).status()).toBe(204);
    await expect
      .poll(
        async () => {
          await page.goto("/a-traiter");
          return page.getByRole("list", { name: "Avis à traiter" }).getByText("Sacha Pruvost").count();
        },
        { timeout: 30_000 },
      )
      .toBe(1);
  });

  test("une réponse donnée sur Google et un avis retiré sont repris sans rien effacer", async ({ page, request }) => {
    await controle(request, "repondre", { name: `${AVIS}/r-push`, comment: "Toutes nos excuses." });
    await controle(request, "retirer-avis", { name: `${AVIS}/r-negatif` });
    await oublierDerniereListe();
    const { jeton } = await (await controle(request, "jeton-push")).json();
    expect((await pousser(request, jeton, `${AVIS}/r-push`)).status()).toBe(204);

    const lire = () =>
      base(async (c) => (await c.query<{ google_review_id: string; statut: string; retire_at: Date | null }>(`SELECT google_review_id, statut, retire_at FROM reviews WHERE google_review_id = ANY($1)`, [[`${AVIS}/r-push`, `${AVIS}/r-negatif`]])).rows);
    await expect
      .poll(async () => (await lire()).map((r) => `${r.statut}:${r.retire_at !== null}`).sort(), { timeout: 30_000 })
      .toEqual(["BROUILLON_PRET:true", "PUBLIE:false"]);

    await page.goto("/a-traiter");
    await expect(page.getByText("Sacha Pruvost")).toHaveCount(0);
    await expect(page.getByText("Camille Lefort")).toHaveCount(0);
  });
});
