import { expect, test } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/** Page Tendances sur les données de démonstration : périodes, thèmes, passages surlignés. */
test.describe("tendances", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("affiche les deux listes, la courbe, la répartition et la synthèse en moins d'une seconde", async ({ page }) => {
    await page.goto("/tendances?periode=12m");
    const debut = Date.now();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ce qui plaît" })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(1000);
    await expect(page.getByRole("heading", { name: "Ce qui revient comme problème" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Note moyenne par mois" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Répartition des étoiles" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Synthèse de la période" })).toBeVisible();
    await expect(page.getByText("Point de vigilance")).toBeVisible();
    await expect(page.getByText(/de réponses aux avis à traiter/)).toBeVisible();
  });

  test("change de période et accepte une plage personnalisée", async ({ page }) => {
    await page.goto("/tendances");
    await expect(page.getByText("30 derniers jours", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "3 mois" }).click();
    await expect(page).toHaveURL(/periode=90j/);
    await expect(page.getByText("3 derniers mois", { exact: true })).toBeVisible();

    await page.getByText("Choisir des dates").click();
    await page.getByLabel("Du").fill("2026-01-01");
    await page.getByLabel("au").fill("2026-03-31");
    await page.getByRole("button", { name: "Appliquer" }).click();
    await expect(page).toHaveURL(/periode=perso/);
    await expect(page.getByText("du 1 janv. 2026 au 31 mars 2026", { exact: true })).toBeVisible();
  });

  test("un thème ouvre les avis concernés avec le passage surligné", async ({ page }) => {
    await page.goto("/tendances?periode=12m");
    const premier = page.getByRole("region", { name: "Ce qui plaît" }).getByRole("link").first();
    // Le lien porte le nom du thème puis son nombre d'avis : le nom est la première ligne.
    const libelle = ((await premier.innerText()).split("\n")[0] ?? "").trim();
    // Le nombre d'avis est dit en toutes lettres pour les lecteurs d'écran (« 28 avis »).
    const nombre = Number((await premier.locator(".sr-only").innerText()).match(/\d+/)?.[0]);
    await premier.click();
    await expect(page).toHaveURL(/\/tendances\/theme\/.*sens=plait/);
    // Seules les mentions positives : autant d'avis que le nombre de la ligne cliquée.
    await expect(page.locator("main li.bloc")).toHaveCount(nombre);
    await expect(page.getByRole("heading", { name: `Thème : ${libelle}` })).toBeVisible();
    expect(await page.locator("mark").count()).toBeGreaterThan(0);
  });
});
