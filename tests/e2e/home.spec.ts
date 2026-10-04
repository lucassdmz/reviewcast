import { expect, test } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours de la home sur les données de démonstration (npm run db:seed) :
 * l'écran s'affiche en moins de 2 s et reste lisible sans défilement
 * sur un gabarit iPhone 13.
 */
test.describe("home météo", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("affiche la météo du mois, le compliment et la carte à traiter", async ({ page }) => {
    const debut = Date.now();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Grand soleil|Soleil voilé|Nuageux|Pluie légère/ })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(2000);

    await expect(page.getByText(/^Note moyenne/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Le compliment du moment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Note moyenne sur 8 semaines" })).toBeVisible();
    await expect(page.getByRole("link", { name: /avis à traiter/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  });

  test("livre l'information principale sans défilement sur un iPhone 13", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/^Note moyenne/).first()).toBeVisible();
    // La météo du mois et l'accès à la file tiennent dans le premier écran ; le reste se découvre en défilant.
    await expect(page.getByRole("heading", { name: /Grand soleil|Soleil voilé|Nuageux|Pluie légère/ })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("link", { name: /avis à traiter/ })).toBeInViewport({ ratio: 1 });
    const h = await page.evaluate(() => ({ largeur: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(h.largeur).toBeLessThanOrEqual(h.ecran);
  });

  test("la carte à traiter mène à la file", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /avis à traiter/ }).click();
    await expect(page).toHaveURL(/\/a-traiter$/);
  });
});
