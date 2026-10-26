import { expect, test as base, type Page } from "@playwright/test";
import {
  creerEtablissementDeTest,
  supprimerEtablissementDeTest,
  type AvisACreer,
  type EtablissementDeTest,
} from "./helpers/etablissement";
import { choisirEtablissement, fermerSession, ouvrirSession } from "./helpers/session";

/**
 * Parcours clé du lot 4, avec le fournisseur IA simulé et le publieur
 * simulé : ouvrir un avis, modifier le brouillon, relire, publier, l'avis
 * sort des brouillons à relire. La file vit désormais dans la liste des avis,
 * où les brouillons sont en tête.
 *
 * Chaque parcours crée son propre établissement avec ses avis, l'affiche, puis
 * le supprime : les parcours ne consomment plus les brouillons de la
 * démonstration et peuvent tourner en parallèle.
 */
const test = base.extend<{ etablissement: (avis: AvisACreer[]) => Promise<EtablissementDeTest> }>({
  // `fournir` plutôt que `use` : la règle des hooks React le prendrait pour un hook.
  etablissement: async ({ context }, fournir) => {
    const crees: EtablissementDeTest[] = [];
    await fournir(async (avis) => {
      const etablissement = await creerEtablissementDeTest(avis);
      crees.push(etablissement);
      await choisirEtablissement(context, etablissement.id);
      return etablissement;
    });
    for (const etablissement of crees) await supprimerEtablissementDeTest(etablissement);
  },
});

const BROUILLON = "Bonjour, merci pour votre retour. Nous sommes désolés pour ce retard et revenons vers vous rapidement. L'équipe";

const ligne = (page: Page, auteur: string) => page.getByRole("link").filter({ hasText: auteur });
const brouillons = (page: Page) => page.getByRole("link").filter({ hasText: "Brouillon prêt à relire" });

test.describe("file à traiter", () => {
  let sessionToken = "";
  test.beforeEach(async ({ context }) => {
    sessionToken = await ouvrirSession(context);
  });
  test.afterEach(() => fermerSession(sessionToken));

  test("liste les brouillons à relire en tête des avis", async ({ page, etablissement }) => {
    const { avis } = await etablissement([
      { note: 2, joursAvant: 3, brouillon: BROUILLON },
      { note: 5, joursAvant: 1 },
    ]);
    const [aRelire, recent] = avis;
    await page.goto("/avis");
    await expect(page.getByRole("heading", { name: "Tous les avis" })).toBeVisible();
    await expect(ligne(page, aRelire.auteur)).toContainText("Brouillon prêt à relire");
    // Le brouillon passe devant l'avis plus récent qui n'est pas dans la file.
    await expect(page.getByRole("link").filter({ hasText: /Client [0-9a-f]+-\d/ }).first()).toContainText(aRelire.auteur);
    await expect(ligne(page, recent.auteur)).toBeVisible();
    await expect(page.getByText(/négatif/i)).toHaveCount(0);
  });

  test("modifie le brouillon, relit, publie et l'avis quitte la file", async ({ page, etablissement }) => {
    const { avis } = await etablissement([{ note: 2, brouillon: BROUILLON }]);
    const { auteur } = avis[0];
    await page.goto("/avis");
    await ligne(page, auteur).click();
    await expect(page.getByRole("heading", { level: 1, name: auteur })).toBeVisible();
    await expect(page.getByText(/reçus en 40 jours|seul avis reçu/)).toBeVisible();

    const zone = page.getByLabel("Texte de la réponse");
    await expect(zone).not.toBeEmpty();
    const marqueur = `référence ${Date.now()}`;
    await zone.fill(`Bonjour, merci pour votre retour détaillé. Nous vous rappelons dès demain pour trouver une solution ensemble (${marqueur}). L'équipe`);
    await page.getByRole("button", { name: "Relire et publier" }).click();

    await expect(page.getByRole("heading", { name: "Publier cette réponse sur Google ?" })).toBeVisible();
    await expect(page.getByText(marqueur)).toBeVisible();
    await page.getByRole("button", { name: "Confirmer la publication" }).click();

    await expect(page).toHaveURL(/\/avis\?publie=/);
    await expect(page.getByRole("status")).toContainText("Réponse publiée");
    await expect(ligne(page, auteur)).toBeVisible();
    await expect(brouillons(page).filter({ hasText: auteur })).toHaveCount(0);

    await page.goto("/a-traiter/historique");
    await expect(page.getByText(marqueur)).toBeVisible();
  });

  test("régénère avec une consigne et ajoute une note interne", async ({ page, etablissement }) => {
    const { avis } = await etablissement([{ note: 3, brouillon: BROUILLON }]);
    await page.goto("/avis");
    await ligne(page, avis[0].auteur).click();
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

  test("marque un avis comme traité sans répondre", async ({ page, etablissement }) => {
    const { avis } = await etablissement([{ note: 4, brouillon: BROUILLON }]);
    const { auteur } = avis[0];
    await page.goto("/avis");
    await ligne(page, auteur).click();
    await page.getByRole("button", { name: "Marquer comme traité sans répondre" }).click();
    await expect(page).toHaveURL(/\/avis\?traite=1/);
    await expect(ligne(page, auteur)).toBeVisible();
    await expect(brouillons(page).filter({ hasText: auteur })).toHaveCount(0);
  });
});
