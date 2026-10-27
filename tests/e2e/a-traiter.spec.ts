import { expect, test, type Page } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours clé du lot 4 sur les données de démonstration, avec le
 * fournisseur IA simulé et le publieur simulé : ouvrir un avis, modifier le
 * brouillon, relire, publier, l'avis sort de la file. La file a son onglet,
 * « À traiter ».
 */
const brouillons = (page: Page) =>
  page.getByRole("list", { name: "Avis à traiter" }).getByRole("link").filter({ hasText: "Brouillon prêt à relire" });

/** Le nom de l'auteur, dans la ligne de conversation : la première ligne qui n'est pas l'avatar (ses initiales). */
async function auteurDe(lien: ReturnType<typeof brouillons>): Promise<string> {
  const lignes = (await lien.innerText()).split("\n").map((l) => l.trim());
  return lignes.find((l) => l.length > 0 && !/^\p{Lu}{1,3}$/u.test(l)) ?? "";
}

test.describe("file à traiter", () => {
  // Les tests modifient la même file : ils s'enchaînent, chacun sur un avis distinct.
  test.describe.configure({ mode: "serial" });
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("l'onglet À traiter liste les avis qui attendent une réponse", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "À traiter" }).click();
    await expect(page).toHaveURL(/\/a-traiter$/);
    await expect(page.getByRole("heading", { level: 1, name: /avis à traiter/ })).toBeVisible();
    expect(await brouillons(page).count()).toBeGreaterThan(0);
    await expect(page.getByText(/négatif/i)).toHaveCount(0);
  });

  test("modifie le brouillon, relit, publie et l'avis quitte la file", async ({ page }) => {
    await page.goto("/a-traiter");
    const premiere = brouillons(page).first();
    const auteur = await auteurDe(premiere);
    await premiere.click();
    await expect(page.getByRole("heading", { level: 1, name: auteur })).toBeVisible();
    await expect(page.getByText(/reçus en 40 jours|seul avis reçu/)).toBeVisible();

    const zone = page.getByLabel("Texte de la réponse");
    await expect(zone).not.toBeEmpty();
    const marqueur = `référence ${Date.now()}`;
    await zone.fill(`Bonjour, merci pour votre retour détaillé. Nous vous rappelons dès demain pour trouver une solution ensemble (${marqueur}). L'équipe`);
    await page.getByRole("button", { name: "Relire et publier" }).click();

    await expect(page.getByRole("heading", { name: "Publier cette réponse sur Google ?" })).toBeVisible();
    await expect(page.getByText(marqueur)).toBeVisible();
    await page.getByRole("button", { name: "Confirmer la publication" }).click();

    await expect(page).toHaveURL(/\/a-traiter\?publie=/);
    await expect(page.getByRole("status")).toContainText("Réponse publiée");
    await expect(brouillons(page).filter({ hasText: auteur })).toHaveCount(0);

    await page.goto("/a-traiter/historique");
    await expect(page.getByText(marqueur)).toBeVisible();
  });

  test("régénère avec une consigne et ajoute une note interne", async ({ page }) => {
    await page.goto("/a-traiter");
    await brouillons(page).first().click();
    const zone = page.getByLabel("Texte de la réponse");
    const avant = await zone.inputValue();
    const version = await page.getByText(/version \d+/).textContent();
    await page.getByRole("button", { name: "Plus court" }).click();
    await expect(page.getByText(/version \d+/)).not.toHaveText(version ?? "");
    await expect(zone).toBeEnabled();
    await expect(zone).not.toHaveValue(avant);

    await page.getByLabel("Nouvelle note").fill("Client rappelé ce matin");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Client rappelé ce matin")).toBeVisible();
  });

  test("marque un avis comme traité sans répondre", async ({ page }) => {
    await page.goto("/a-traiter");
    const derniere = brouillons(page).last();
    const auteur = await auteurDe(derniere);
    await derniere.click();
    await page.getByRole("button", { name: "Marquer comme traité sans répondre" }).click();
    await expect(page).toHaveURL(/\/a-traiter\?traite=1/);
    await expect(brouillons(page).filter({ hasText: auteur })).toHaveCount(0);
  });
});
