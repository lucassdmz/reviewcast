import { expect, test } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours clé du lot 4 sur les données de démonstration, avec le
 * fournisseur IA simulé et le publieur simulé : ouvrir un avis, modifier le
 * brouillon, relire, publier, l'avis sort de la file.
 */
test.describe("file à traiter", () => {
  // Les tests modifient la même file : ils s'enchaînent, chacun sur un avis distinct.
  test.describe.configure({ mode: "serial" });
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("liste les avis à traiter avec leur contexte", async ({ page }) => {
    await page.goto("/a-traiter");
    await expect(page.getByRole("heading", { name: /avis à traiter/ })).toBeVisible();
    const cartes = page.getByRole("list").first().getByRole("link");
    expect(await cartes.count()).toBeGreaterThan(0);
    await expect(cartes.first()).toContainText(/sur la même période|Premier avis/);
    await expect(page.getByText(/négatif/i)).toHaveCount(0);
  });

  test("modifie le brouillon, relit, publie et l'avis quitte la file", async ({ page }) => {
    await page.goto("/a-traiter");
    const premiere = page.getByRole("list").first().getByRole("link").first();
    const auteur = (await premiere.locator("p").first().textContent()) ?? "";
    await premiere.click();
    await expect(page.getByRole("heading", { level: 1, name: auteur })).toBeVisible();
    await expect(page.getByText(/sur la même période|Premier avis/)).toBeVisible();

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
    await expect(page.getByRole("list").first().getByRole("link", { name: new RegExp(auteur) })).toHaveCount(0);

    await page.goto("/a-traiter/historique");
    await expect(page.getByText(marqueur)).toBeVisible();
  });

  test("régénère avec une consigne et ajoute une note interne", async ({ page }) => {
    await page.goto("/a-traiter");
    await page.getByRole("list").first().getByRole("link").nth(1).click();
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
    const derniere = page.getByRole("list").first().getByRole("link").last();
    const auteur = (await derniere.locator("p").first().textContent()) ?? "";
    await derniere.click();
    await page.getByRole("button", { name: "Marquer comme traité sans répondre" }).click();
    await expect(page).toHaveURL(/\/a-traiter\?traite=1/);
    await expect(page.getByRole("list").first().getByRole("link", { name: new RegExp(auteur) })).toHaveCount(0);
  });
});
