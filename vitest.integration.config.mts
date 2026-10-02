import { defineConfig } from "vitest/config";

/** Tests d'intégration : appels réels au fournisseur IA, ignorés sans clé. */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 120_000,
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
