import "dotenv/config";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Changer un réglage de la voix remet à jour les brouillons pas encore
 * publiés : ceux de l'IA sont réécrits, ceux retouchés à la main sont
 * seulement signalés sur leur fiche. Fournisseur IA simulé.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie";

async function requete<T>(sql: string, valeurs: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, valeurs)).rows as T[];
  } finally {
    await client.end();
  }
}

test.describe("brouillons à jour des réglages", () => {
  test.describe.configure({ mode: "serial" });
  let sessionToken = "";
  let locationId = "";
  let personneInitiale: "JE" | "NOUS" = "NOUS";
  let motsInitiaux: string[] = [];

  test.beforeAll(async () => {
    const [lieu] = await requete<{ location_id: string }>(
      `SELECT r.location_id FROM reviews r JOIN drafts d ON d.review_id = r.id WHERE r.statut = 'BROUILLON_PRET' GROUP BY r.location_id ORDER BY count(*) DESC LIMIT 1`,
    );
    locationId = lieu.location_id;
    const [reglages] = await requete<{ personne: "JE" | "NOUS"; mots_evites: string[] }>(`SELECT personne, mots_evites FROM settings WHERE location_id = $1`, [locationId]);
    personneInitiale = reglages?.personne ?? "NOUS";
    motsInitiaux = reglages?.mots_evites ?? [];
  });

  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
    await context.addCookies([{ name: "etablissement", value: locationId, domain: "localhost", path: "/" }]);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test.afterAll(async () => {
    await requete(`UPDATE settings SET personne = $2::personne, mots_evites = $3 WHERE location_id = $1`, [locationId, personneInitiale, motsInitiaux]);
  });

  test("passer de « nous » à « je » réécrit les brouillons de l'IA", async ({ page }) => {
    const cible = personneInitiale === "NOUS" ? "JE" : "NOUS";
    await page.goto("/reglages/ton");
    await page.getByText(cible === "JE" ? "« Je regrette que… »" : "« Nous sommes désolés que… »").click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toContainText("réécrit");

    // La réécriture tourne après la réponse : on attend qu'un brouillon de l'établissement porte les nouveaux réglages.
    let reviewId = "";
    await expect
      .poll(
        async () => {
          const [d] = await requete<{ review_id: string }>(
            `SELECT d.review_id FROM drafts d JOIN reviews r ON r.id = d.review_id
             WHERE r.location_id = $1 AND r.statut = 'BROUILLON_PRET' AND d.motif = 'reglages' AND d.reglages->>'personne' = $2 LIMIT 1`,
            [locationId, cible],
          );
          reviewId = d?.review_id ?? "";
          return reviewId;
        },
        { timeout: 30_000 },
      )
      .not.toBe("");

    await page.goto(`/a-traiter/${reviewId}`);
    await expect(page.getByText(/à jour de vos réglages/)).toBeVisible();
    await expect(page.getByText("Ce brouillon ne suit plus vos réglages.")).toHaveCount(0);
  });

  test("un brouillon retouché à la main est signalé, jamais réécrit sans vous", async ({ page }) => {
    const [avis] = await requete<{ id: string }>(`SELECT id FROM reviews WHERE location_id = $1 AND statut = 'BROUILLON_PRET' ORDER BY date_creation DESC LIMIT 1`, [locationId]);
    const mot = `zorglub${Date.now()}`;
    await page.goto(`/a-traiter/${avis.id}`);
    await page.getByLabel("Texte de la réponse").fill(`Merci pour votre retour, ${mot}, au plaisir de vous revoir.`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(async () => (await requete(`SELECT 1 FROM drafts WHERE review_id = $1 AND modele = 'humain' AND texte LIKE $2`, [avis.id, `%${mot}%`])).length).toBe(1);

    await page.goto("/reglages/sujets");
    await page.locator("#motsEvites").fill([...motsInitiaux, mot].join(", "));
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toContainText("Un brouillon que vous aviez modifié ne suit plus ces réglages");

    await page.goto(`/a-traiter/${avis.id}`);
    await expect(page.getByText("Ce brouillon ne suit plus vos réglages.")).toBeVisible();
    await expect(page.getByLabel("Texte de la réponse")).toHaveValue(new RegExp(mot));

    await page.getByRole("button", { name: "Réécrire avec mes réglages" }).click();
    await expect(page.getByText(/à jour de vos réglages/)).toBeVisible();
    await expect(page.getByLabel("Texte de la réponse")).not.toHaveValue(new RegExp(mot));
  });
});
