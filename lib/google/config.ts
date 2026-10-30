/**
 * Adresses des API Google. Elles sont surchargeables pour le faux serveur des
 * tests (tests/fake-google), jamais en production Vercel : un jeu de clés de
 * vérification ou un serveur de jetons choisi par variable d'environnement n'y
 * a pas sa place.
 */
function surcharge(nom: string): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  const valeur = process.env[nom]?.trim();
  return valeur ? valeur.replace(/\/+$/, "") : null;
}

export interface AdressesGoogle {
  autorisation: string;
  jeton: string;
  comptes: string;
  fiches: string;
  avis: string;
  notifications: string;
  clesOidc: string;
}

export function adressesGoogle(): AdressesGoogle {
  const api = surcharge("GOOGLE_API_BASE_URL");
  const oauth = surcharge("GOOGLE_OAUTH_BASE_URL");
  return {
    autorisation: oauth ? `${oauth}/o/oauth2/v2/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
    jeton: oauth ? `${oauth}/token` : "https://oauth2.googleapis.com/token",
    comptes: api ? `${api}/accountmanagement/v1` : "https://mybusinessaccountmanagement.googleapis.com/v1",
    fiches: api ? `${api}/businessinformation/v1` : "https://mybusinessbusinessinformation.googleapis.com/v1",
    avis: api ? `${api}/v4` : "https://mybusiness.googleapis.com/v4",
    notifications: api ? `${api}/notifications/v1` : "https://mybusinessnotifications.googleapis.com/v1",
    clesOidc: surcharge("GOOGLE_OIDC_JWKS_URL") ?? "https://www.googleapis.com/oauth2/v3/certs",
  };
}

export const SCOPE_FICHE = "https://www.googleapis.com/auth/business.manage";

/** Comptes Google : un jeton est valable une heure, on le renouvelle une minute avant. */
export const MARGE_JETON_MS = 60_000;

/** Tout appel à Google s'arrête au bout de ce délai plutôt que de bloquer une synchronisation. */
export const DELAI_APPEL_MS = 15_000;
