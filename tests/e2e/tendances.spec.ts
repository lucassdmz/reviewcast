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
    await expect(page.getByText("Point de vigilance")).toBeVisible({ timeout: 15_000 });
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

  test("les chiffres n'attendent pas la synthèse, qui arrive ensuite", async ({ page }) => {
    // Période jamais demandée : la synthèse reste à rédiger (fournisseur simulé lent).
    const debut = Date.now();
    await page.goto(`/tendances?periode=perso&debut=2025-11-${String(1 + (Date.now() % 9)).padStart(2, "0")}&fin=2026-10-${String(10 + (Date.now() % 19)).padStart(2, "0")}`);
    await expect(page.getByRole("heading", { name: "Ce qui plaît" })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(2000);
    await expect(page.getByTestId("synthese-en-attente")).toBeVisible();
    await expect(page.getByText("Point de vigilance")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("synthese-en-attente")).toHaveCount(0);
  });

  test("deux périodes du même mois gardent chacune leur synthèse, sans nouvel appel", async ({ page }) => {
    const demandes: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/tendances/synthese")) demandes.push(r.url());
    });
    const a = "/tendances?periode=perso&debut=2025-12-01&fin=2026-09-10";
    const b = "/tendances?periode=perso&debut=2025-12-01&fin=2026-09-20";
    for (const adresse of [a, b]) {
      await page.goto(adresse);
      await expect(page.getByText("Point de vigilance")).toBeVisible({ timeout: 15_000 });
    }
    demandes.length = 0;
    for (const adresse of [a, b]) {
      await page.goto(adresse);
      await expect(page.getByText("Point de vigilance")).toBeVisible();
    }
    await page.waitForTimeout(300);
    expect(demandes).toEqual([]);
  });

  test("deux demandes simultanées ne paient qu'une rédaction", async ({ page }) => {
    await page.goto("/tendances?periode=30j");
    const corps = { periode: "perso", debut: "2025-12-02", fin: `2026-08-${String(1 + (Date.now() % 28)).padStart(2, "0")}` };
    const etats = await page.evaluate(async (c) => {
      const envoyer = () => fetch("/api/tendances/synthese", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) }).then((r) => r.json() as Promise<{ etat: string }>);
      const [x, y] = await Promise.all([envoyer(), envoyer()]);
      return [x.etat, y.etat].sort();
    }, corps);
    expect(etats).toEqual(["en_cours", "prete"]);
  });

  test("changer de période répond à l'instant, avant les chiffres", async ({ page }) => {
    // Serveur ralenti dès le chargement : le préchargement du lien, lancé à l'affichage, est ralenti lui aussi.
    await page.route(/\/tendances\?.*periode=12m/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto("/tendances?periode=30j");
    await expect(page.getByRole("heading", { name: "Ce qui plaît" })).toBeVisible();
    await page.getByRole("link", { name: "12 mois" }).click();
    await expect(page.locator('[data-periode-en-cours="true"]')).toBeVisible({ timeout: 500 });
    await expect(page.getByRole("link", { name: "12 mois" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByText("Mise à jour des chiffres…")).toBeVisible();
    await expect(page.getByText("12 derniers mois", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-periode-en-cours="true"]')).toHaveCount(0);
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
