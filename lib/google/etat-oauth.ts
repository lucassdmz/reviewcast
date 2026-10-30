import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Paramètre `state` de l'OAuth de la fiche, signé contre le CSRF : il lie le
 * retour de Google à l'utilisateur connecté et à ce navigateur (un nombre
 * aléatoire aussi posé dans un cookie), pour dix minutes.
 */
export const COOKIE_ETAT_OAUTH = "eclaircie_oauth_fiche";
export const DUREE_ETAT_MS = 10 * 60_000;

const charge = z.object({ u: z.string().min(1), n: z.string().min(16), e: z.number() });

function signer(donnees: string, secret: string): string {
  return createHmac("sha256", `oauth-fiche-google:${secret}`).update(donnees).digest("base64url");
}

export function creerEtat(userId: string, secret: string, maintenant = Date.now()): { etat: string; nonce: string } {
  const nonce = randomBytes(24).toString("base64url");
  const donnees = Buffer.from(JSON.stringify({ u: userId, n: nonce, e: maintenant + DUREE_ETAT_MS })).toString("base64url");
  return { etat: `${donnees}.${signer(donnees, secret)}`, nonce };
}

export interface AttenduEtat {
  userId: string;
  nonce: string | undefined;
  secret: string;
  maintenant?: number;
}

export function etatValide(etat: string | null, attendu: AttenduEtat): boolean {
  if (!etat || !attendu.nonce) return false;
  const [donnees, signature, ...reste] = etat.split(".");
  if (!donnees || !signature || reste.length > 0) return false;
  const a = Buffer.from(signature);
  const b = Buffer.from(signer(donnees, attendu.secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  let brut: unknown;
  try {
    brut = JSON.parse(Buffer.from(donnees, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  const lu = charge.safeParse(brut);
  if (!lu.success) return false;
  return lu.data.u === attendu.userId && lu.data.n === attendu.nonce && lu.data.e > (attendu.maintenant ?? Date.now());
}
