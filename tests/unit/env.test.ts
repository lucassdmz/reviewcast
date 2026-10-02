import { afterEach, describe, expect, it, vi } from "vitest";

const valide = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/eclaircie",
  AUTH_SECRET: "un-secret-suffisamment-long",
  AUTH_GOOGLE_ID: "id",
  AUTH_GOOGLE_SECRET: "secret",
  ALLOWED_EMAILS: "lucas@exemple.fr",
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
};

async function chargerEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  const mod = await import("@/lib/env");
  return mod.getEnv();
}

describe("validation des variables d'environnement", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepte une configuration complète", async () => {
    const env = await chargerEnv(valide);
    expect(env.ALLOWED_EMAILS).toBe("lucas@exemple.fr");
  });

  it("refuse une clé de chiffrement de mauvaise taille", async () => {
    await expect(chargerEnv({ ...valide, ENCRYPTION_KEY: "court" })).rejects.toThrow(/ENCRYPTION_KEY/);
  });

  it("refuse un secret d'authentification trop court", async () => {
    await expect(chargerEnv({ ...valide, AUTH_SECRET: "x" })).rejects.toThrow(/AUTH_SECRET/);
  });
});
