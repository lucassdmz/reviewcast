import { expect, test } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours de l'accueil sur les données de démonstration (npm run db:seed) :
 * la phrase, le score et le fil s'affichent en moins de 2 s, et l'essentiel
 * tient sans défilement sur un gabarit iPhone 13.
 */
test.describe("accueil", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("affiche la phrase, le score et le fil des avis", async ({ page }) => {
    const debut = Date.now();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /clients? contents? sur|Pas encore d’avis/ })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(2000);

    await expect(page.getByRole("link", { name: /Note sur 3 mois/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Derniers avis" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  });

  test("livre l'information principale sans défilement sur un iPhone 13", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("link", { name: /Note sur 3 mois/ })).toBeInViewport({ ratio: 1 });
    const h = await page.evaluate(() => ({ largeur: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(h.largeur).toBeLessThanOrEqual(h.ecran);
  });

  test("le score mène à Tendances", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Note sur 3 mois/ }).click();
    await expect(page).toHaveURL(/\/tendances$/);
  });
});
