import { expect, test, type Page } from "@playwright/test";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Lot 6 : sans réseau, l'accueil, la file et les tendances déjà chargés
 * restent lisibles, un bandeau le dit, et un écran jamais ouvert affiche la
 * page « hors ligne ». Les pages gardées sont effacées à la déconnexion.
 */
async function pagesGardees(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const noms = await caches.keys();
    const nom = noms.find((n) => n.startsWith("eclaircie-pages-"));
    if (!nom) return [];
    return (await (await caches.open(nom)).keys()).map((r) => new URL(r.url).pathname);
  });
}

/** Attend que le service worker contrôle la page et ait gardé les trois écrans. */
async function preparerHorsLigne(page: Page) {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Le premier chargement n'est pas encore contrôlé : on recharge une fois.
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await expect.poll(() => pagesGardees(page), { timeout: 15_000 }).toEqual(expect.arrayContaining(["/", "/a-traiter", "/tendances"]));
}

test.describe("hors ligne", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("relit les écrans déjà chargés et le dit", async ({ page, context }) => {
    await preparerHorsLigne(page);
    await context.setOffline(true);

    await page.goto("/tendances");
    await expect(page.getByRole("heading", { level: 1, name: "Tendances" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toContainText("derniers avis chargés");

    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "À traiter" }).click();
    await expect(page).toHaveURL(/\/a-traiter$/);
    await expect(page.getByRole("heading", { level: 1, name: /à traiter/ })).toBeVisible();

    await page.goto("/reglages/apparence");
    await expect(page.getByRole("heading", { level: 1, name: "Pas de réseau pour le moment" })).toBeVisible();

    await context.setOffline(false);
    await page.goto("/reglages/apparence");
    await expect(page.getByRole("heading", { level: 1, name: "Apparence" })).toBeVisible();
  });

  test("garde une action faite sans réseau et l'envoie au retour", async ({ page, context }) => {
    await page.goto("/a-traiter");
    await page.getByRole("list", { name: "Avis à traiter" }).getByRole("link").first().click();
    const zone = page.getByLabel("Texte de la réponse");
    await expect(zone).not.toBeEmpty();
    const marqueur = `hors ligne ${Date.now()}`;
    await zone.fill(`Bonjour, merci pour votre retour. Nous revenons vers vous très vite (${marqueur}).`);

    await context.setOffline(true);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("button", { name: "En attente du réseau…" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toContainText("Votre action partira au retour du réseau");

    await context.setOffline(false);
    await expect(page.getByRole("button", { name: "Enregistrer" })).toBeEnabled({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByLabel("Texte de la réponse")).toHaveValue(new RegExp(marqueur));
  });

  test("efface les pages gardées quand la session se termine", async ({ page }) => {
    await preparerHorsLigne(page);
    await fermerSession(sessionToken);
    await page.goto("/connexion");
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    await expect.poll(() => pagesGardees(page)).toEqual([]);
  });
});
