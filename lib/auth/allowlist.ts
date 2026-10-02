/**
 * Liste blanche des adresses autorisées à se connecter (V1 : un seul utilisateur).
 * La comparaison ignore la casse et les espaces.
 */
export function parseAllowedEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function isAllowedEmail(email: string | null | undefined, allowed: string[]): boolean {
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
