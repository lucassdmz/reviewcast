import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement AES-256-GCM des secrets stockés en base (refresh tokens Google,
 * clés IA). Format stocké : `v1.<iv>.<tag>.<données>` en base64.
 * La clé vient de ENCRYPTION_KEY (32 octets en base64).
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";

export function parseEncryptionKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("La clé de chiffrement doit faire 32 octets");
  }
  return key;
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string, key: Buffer): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Format de secret chiffré non reconnu");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
