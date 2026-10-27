import { timingSafeEqual } from "node:crypto";

/**
 * Les tâches planifiées (cron Vercel ou autre) appellent des routes API sans
 * session : elles présentent `Authorization: Bearer <CRON_SECRET>`. Sans
 * secret configuré, aucune tâche n'est acceptée.
 */
export function tacheAutorisee(entete: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !entete) return false;
  const attendu = Buffer.from(`Bearer ${secret}`);
  const recu = Buffer.from(entete);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}
