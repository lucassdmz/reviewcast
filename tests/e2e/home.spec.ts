import { expect, test } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours de l'accueil sur les données de démonstration (npm run db:seed) :
 * le bandeau (clients contents, note) et la première carte de la pile
 * s'affichent en moins de 2 s et tiennent sans défilement sur un iPhone 13.
 */
test.describe("accueil", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("affiche le bandeau et la pile du matin", async ({ page }) => {
    const debut = Date.now();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /clients? contents?|Pas encore d’avis/ })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(2000);

    await expect(page.getByRole("region", { name: "Les gestes du matin" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  });

  test("livre l'information principale sans défilement sur un iPhone 13", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
    const h = await page.evaluate(() => ({ largeur: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(h.largeur).toBeLessThanOrEqual(h.ecran);
  });

  test("passe d'une carte à l'autre sans rien publier avec « Plus tard » et « Suivant »", async ({ page }) => {
    await page.goto("/");
    const pile = page.getByRole("region", { name: "Les gestes du matin" });
    const indicateur = pile.getByRole("img", { name: /Carte 1 sur/ });
    await expect(indicateur).toBeVisible();
    await pile.locator('[data-pos="0"]').getByRole("button", { name: /Suivant|Plus tard|Terminer/ }).first().click();
    await expect(pile.getByRole("img", { name: /Carte 2 sur|Carte 1 sur 1/ }).or(pile.getByText("Tout est fait."))).toBeVisible();
  });

  test("la note mène à Tendances", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Note Google .* voir les tendances/ }).click();
    await expect(page).toHaveURL(/\/tendances$/);
  });
});
