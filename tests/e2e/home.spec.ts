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

  test("les mercis arrivent dans la pile sans retarder l'accueil", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/mercis? prêts?/i)).toBeAttached({ timeout: 20_000 });
    // La carte visible n'a pas changé : le merci prend place plus loin dans la pile.
    await expect(page.locator('.pile-carte[data-pos="0"]')).toBeVisible();
  });

  test("rappelle en haut l'établissement affiché", async ({ page }) => {
    await page.goto("/");
    const entete = page.locator("main.entree > :first-child");
    await expect(entete).toBeInViewport({ ratio: 1 });
    await expect(entete.locator("span.titre-display")).not.toBeEmpty();
    await expect(entete.locator("h1")).toHaveCount(0);
  });

  test("la carte occupe la hauteur libre, sans vide au-dessus de la barre d'onglets", async ({ page }) => {
    await page.goto("/");
    const carte = page.locator('.pile-carte[data-pos="0"]');
    await expect(carte).toBeVisible();
    const basCarte = await carte.evaluate((c) => c.getBoundingClientRect().bottom);
    const hautBarre = await page.getByRole("navigation", { name: "Navigation principale" }).locator("> *").first().evaluate((b) => b.getBoundingClientRect().top);
    expect(hautBarre - basCarte).toBeLessThan(100);
  });

  test("la note mène à Tendances", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Note Google .* voir les tendances/ }).click();
    await expect(page).toHaveURL(/\/tendances$/);
  });
});
