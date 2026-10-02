import { expect, test } from "@playwright/test";

test.describe("accès sans session", () => {
  test("la home redirige vers la page de connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByRole("heading", { name: "Éclaircie" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter avec Google" })).toBeVisible();
  });

  test("une page protégée conserve sa destination", async ({ page }) => {
    await page.goto("/a-traiter");
    await expect(page).toHaveURL(/\/connexion\?callbackUrl=%2Fa-traiter$/);
  });

  test("une route API protégée répond 401", async ({ request }) => {
    const reponse = await request.get("/api/sante");
    expect(reponse.status()).toBe(401);
    expect(await reponse.json()).toEqual({ erreur: "Authentification requise" });
  });

  test("un refus Google affiche un message en français", async ({ page }) => {
    await page.goto("/connexion?error=AccessDenied");
    await expect(page.getByRole("alert").filter({ hasText: "Google" })).toContainText("n'est pas autorisée");
  });

  test("la page de connexion tient sans défilement sur mobile", async ({ page }) => {
    await page.goto("/connexion");
    const hauteurs = await page.evaluate(() => ({
      document: document.documentElement.scrollHeight,
      fenetre: window.innerHeight,
    }));
    expect(hauteurs.document).toBeLessThanOrEqual(hauteurs.fenetre);
  });
});
