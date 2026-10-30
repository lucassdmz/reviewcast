/** Adresse de retour de l'OAuth de la fiche : à déclarer telle quelle dans Google Cloud. */
export function urlDeRetour(request: { url: string }): string {
  return new URL("/api/google/callback", process.env.AUTH_URL ?? request.url).toString();
}
