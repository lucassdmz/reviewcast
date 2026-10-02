/**
 * Noms possibles du cookie de session Auth.js, selon que l'app est servie
 * en HTTPS (préfixe __Secure-) ou non. Utilisé par le proxy pour une
 * vérification légère, sans accès à la base.
 */
export const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

export function hasSessionCookie(getCookie: (name: string) => boolean): boolean {
  return SESSION_COOKIE_NAMES.some((name) => getCookie(name));
}

/** Chemins accessibles sans session. */
const PUBLIC_PATHS = ["/connexion", "/api/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
