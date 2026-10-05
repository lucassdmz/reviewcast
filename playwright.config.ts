import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours Playwright. Le serveur Next est lancé automatiquement avec des
 * variables d'environnement factices : les parcours du lot 0 ne font pas
 * d'appel réel à Google.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "fr-FR",
    // Permet d'utiliser un Chromium déjà installé (ex. PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium).
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
  },
  // Gabarit iPhone 13 émulé dans Chromium (seul navigateur installé en CI).
  projects: [{ name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/connexion",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? "secret-de-test-playwright-0000",
      AUTH_URL: "http://localhost:3000",
      AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "id-google-factice",
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "secret-google-factice",
      ALLOWED_EMAILS: process.env.ALLOWED_EMAILS ?? "test@exemple.fr",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/eclaircie",
      // Fournisseur IA simulé : aucun appel réseau pendant les parcours.
      AI_PROVIDER: "fake",
      PUBLICATION_GOOGLE: "simulee",
    },
  },
});
