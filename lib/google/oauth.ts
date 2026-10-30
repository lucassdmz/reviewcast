import { adressesGoogle, DELAI_APPEL_MS, SCOPE_FICHE } from "./config";
import { erreurJetonSchema, jetonSchema, type ReponseJeton } from "./schemas";

/**
 * Points OAuth de la connexion de la fiche, distincte de la connexion à
 * l'application : scope business.manage, accès hors ligne, consentement
 * toujours demandé pour obtenir un refresh token.
 */
export interface IdentifiantsOAuth {
  clientId: string;
  clientSecret: string;
}

export function urlAutorisation(identifiants: IdentifiantsOAuth, urlRetour: string, etat: string): string {
  const url = new URL(adressesGoogle().autorisation);
  url.search = new URLSearchParams({
    client_id: identifiants.clientId,
    redirect_uri: urlRetour,
    response_type: "code",
    scope: SCOPE_FICHE,
    access_type: "offline",
    prompt: "consent",
    state: etat,
  }).toString();
  return url.toString();
}

/** Google a retiré l'accès (révocation, mot de passe changé) : seule une nouvelle connexion le rétablit. */
export class AccesRetire extends Error {
  constructor() {
    super("Google ne reconnaît plus cet accès : reconnectez votre fiche dans Réglages.");
    this.name = "AccesRetire";
  }
}

async function demanderJeton(parametres: Record<string, string>): Promise<ReponseJeton> {
  const reponse = await fetch(adressesGoogle().jeton, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parametres).toString(),
    signal: AbortSignal.timeout(DELAI_APPEL_MS),
  });
  const corps: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    if (erreurJetonSchema.safeParse(corps).data?.error === "invalid_grant") throw new AccesRetire();
    throw new Error(`Google a refusé la demande de jeton (${reponse.status}).`);
  }
  return jetonSchema.parse(corps);
}

export function echangerCode(identifiants: IdentifiantsOAuth, code: string, urlRetour: string): Promise<ReponseJeton> {
  return demanderJeton({
    grant_type: "authorization_code",
    code,
    redirect_uri: urlRetour,
    client_id: identifiants.clientId,
    client_secret: identifiants.clientSecret,
  });
}

export function renouvelerJeton(identifiants: IdentifiantsOAuth, refreshToken: string): Promise<ReponseJeton> {
  return demanderJeton({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: identifiants.clientId,
    client_secret: identifiants.clientSecret,
  });
}

/** L'écran de consentement de Google permet de décocher un droit : on vérifie qu'il a bien été accordé. */
export function scopeAccorde(scope: string | undefined): boolean {
  return (scope ?? "").split(/\s+/).includes(SCOPE_FICHE);
}
