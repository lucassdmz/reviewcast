import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, parseEncryptionKey } from "@/lib/crypto/secrets";

describe("chiffrement des secrets", () => {
  const key = randomBytes(32);

  it("restitue le texte d'origine après chiffrement puis déchiffrement", () => {
    const secret = "1//refresh-token-google-très-secret";
    const payload = encryptSecret(secret, key);
    expect(payload.startsWith("v1.")).toBe(true);
    expect(payload).not.toContain(secret);
    expect(decryptSecret(payload, key)).toBe(secret);
  });

  it("produit un résultat différent à chaque chiffrement (IV aléatoire)", () => {
    const a = encryptSecret("même texte", key);
    const b = encryptSecret("même texte", key);
    expect(a).not.toBe(b);
  });

  it("refuse une clé incorrecte", () => {
    const payload = encryptSecret("secret", key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
  });

  it("refuse un contenu altéré", () => {
    const payload = encryptSecret("secret", key);
    const parts = payload.split(".");
    parts[3] = Buffer.from("altéré").toString("base64");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });

  it("refuse un format inconnu", () => {
    expect(() => decryptSecret("v0.a.b.c", key)).toThrow(/Format/);
  });

  it("valide la longueur de la clé base64", () => {
    expect(parseEncryptionKey(randomBytes(32).toString("base64")).length).toBe(32);
    expect(() => parseEncryptionKey(randomBytes(16).toString("base64"))).toThrow(/32 octets/);
  });
});
