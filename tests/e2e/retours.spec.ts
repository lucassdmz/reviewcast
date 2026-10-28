import "dotenv/config";
import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Bulle de remarques de la bêta (RETOURS_BETA=1) : un testeur écrit ce qui ne
 * va pas, montre l'élément en cause, et la remarque arrive en base rattachée
 * à son écran, avec la capture. La bulle se range et garde sa place.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie";

async function sql<T>(requete: string, valeurs: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(requete, valeurs)).rows as T[];
  } finally {
    await client.end();
  }
}

test.describe("remarques de bêta", () => {
  let jeton = "";
  // Un marqueur par test : les parcours tournent en parallèle sur la même base.
  let marque = "";

  test.beforeEach(async ({ context }) => {
    jeton = await ouvrirSession(context);
    marque = `e2e-${randomBytes(6).toString("hex")}`;
  });
  test.afterEach(async () => {
    await fermerSession(jeton);
    await sql(`DELETE FROM retours_beta WHERE texte LIKE $1`, [`%${marque}%`]);
  });

  test("une remarque part avec son écran, l'élément montré et une capture", async ({ page }) => {
    await page.goto("/tendances");
    const titre = page.getByRole("heading", { level: 1, name: "Tendances" });
    await expect(titre).toBeVisible();

    await page.getByRole("button", { name: "Afficher les remarques de bêta" }).click();
    const bulle = page.getByRole("dialog", { name: "Remarques de bêta" });
    await expect(bulle.getByText("Tendances", { exact: true })).toBeVisible();
    await bulle.getByLabel("Votre remarque").fill(`Le titre est trop gros ${marque}`);

    // Montrer le titre de l'écran du doigt, puis valider.
    await bulle.getByRole("button", { name: "Montrer l’élément" }).click();
    const cadre = await titre.boundingBox();
    if (!cadre) throw new Error("titre introuvable");
    await page.mouse.click(cadre.x + cadre.width / 2, cadre.y + cadre.height / 2);
    await expect(page.getByText("C’est bien celui-ci ?")).toBeVisible();
    await page.getByRole("button", { name: "Valider", exact: true }).click();
    await expect(bulle.getByText(/titre « Tendances »/)).toBeVisible();

    await bulle.getByRole("button", { name: "Envoyer la remarque" }).click();
    await expect(bulle.getByText("Merci, c’est noté.")).toBeVisible({ timeout: 15_000 });
    await expect(bulle.getByText(`Le titre est trop gros ${marque}`)).toBeVisible();

    const [ligne] = await sql<{ chemin: string; gabarit: string; ecran: string; element: { balise: string; texte: string }; taille: number; contexte: { theme: string } }>(
      `SELECT chemin, gabarit, ecran, element, octet_length(capture) AS taille, contexte FROM retours_beta WHERE texte LIKE $1`,
      [`%${marque}%`],
    );
    expect(ligne).toMatchObject({ chemin: "/tendances", gabarit: "/tendances", ecran: "Tendances", element: { balise: "h1", texte: "Tendances" }, contexte: { theme: "clair" } });
    expect(ligne.taille).toBeGreaterThan(5_000);
  });

  test("la remarque reste rattachée à la fiche, et le testeur peut la retirer", async ({ page }) => {
    await page.goto("/reglages/apparence");
    await page.getByRole("button", { name: "Afficher les remarques de bêta" }).click();
    const bulle = page.getByRole("dialog", { name: "Remarques de bêta" });
    await expect(bulle.getByText("Réglages › Apparence")).toBeVisible();
    await bulle.getByLabel("Joindre une capture de l’écran").uncheck();
    await bulle.getByLabel("Votre remarque").fill(`Trop de choix ${marque}`);
    await bulle.getByRole("button", { name: "Envoyer la remarque" }).click();
    await expect(bulle.getByText("Merci, c’est noté.")).toBeVisible();

    const [ligne] = await sql<{ gabarit: string; capture: Buffer | null }>(`SELECT gabarit, capture FROM retours_beta WHERE texte LIKE $1`, [`%${marque}%`]);
    expect(ligne).toEqual({ gabarit: "/reglages/apparence", capture: null });

    await bulle.getByRole("listitem").filter({ hasText: marque }).getByRole("button", { name: "Retirer" }).click();
    await expect(bulle.getByText(`Trop de choix ${marque}`)).toBeHidden();
    expect(await sql(`SELECT 1 FROM retours_beta WHERE texte LIKE $1`, [`%${marque}%`])).toHaveLength(0);
  });

  test("au départ rangée contre le bord, la bulle garde ensuite la place choisie", async ({ page }) => {
    await page.goto("/");
    // Première visite : une simple languette, rien de l'écran n'est caché.
    await expect(page.getByRole("button", { name: /^Remarques de bêta/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Afficher les remarques de bêta" }).click();
    await page.getByRole("button", { name: "Réduire" }).click();
    await expect(page.getByRole("button", { name: /^Remarques de bêta/ })).toBeVisible();

    await page.goto("/reglages");
    await page.getByRole("button", { name: /^Remarques de bêta/ }).click();
    const bulle = page.getByRole("dialog", { name: "Remarques de bêta" });
    await expect(bulle.getByText("Réglages", { exact: true })).toBeVisible();
    await bulle.getByRole("button", { name: "Ranger sur le côté" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Afficher les remarques de bêta" })).toBeVisible();
  });
});
