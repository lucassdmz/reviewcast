/**
 * Rythme des requêtes de liste. Google demande de ne pas dépasser une requête
 * de liste toutes les 15 minutes par fiche ; une notification en temps réel
 * peut passer plus vite, dans la limite d'un intervalle court contre les rafales.
 */
export type Declencheur = "connexion" | "ouverture" | "cron" | "notification";

export const INTERVALLE_LISTE_MS = 15 * 60_000;
export const INTERVALLE_NOTIFICATION_MS = 60_000;
/** Délai laissé à Google pour que l'avis notifié soit visible dans la liste. */
export const MARGE_NOTIFICATION_MS = 5_000;

export function intervallePour(declencheur: Declencheur): number {
  if (declencheur === "connexion") return 0;
  return declencheur === "notification" ? INTERVALLE_NOTIFICATION_MS : INTERVALLE_LISTE_MS;
}

/** Date avant laquelle la dernière liste doit remonter pour qu'une nouvelle soit permise. */
export function limitePourLister(declencheur: Declencheur, maintenant: Date): Date {
  return new Date(maintenant.getTime() - intervallePour(declencheur));
}

export type DecisionNotification = "deja-couverte" | "plus-tard" | "synchroniser";

/**
 * Que faire d'une notification : si une liste est partie assez longtemps après
 * sa publication, l'avis y figure déjà. Sinon, trop tôt pour lister : Pub/Sub
 * la représentera plus tard, rien n'est perdu.
 */
export function deciderNotification(publieLe: Date | null, derniereListe: Date | null, maintenant: Date): DecisionNotification {
  if (!derniereListe) return "synchroniser";
  if (publieLe && derniereListe.getTime() >= publieLe.getTime() + MARGE_NOTIFICATION_MS) return "deja-couverte";
  return maintenant.getTime() - derniereListe.getTime() >= INTERVALLE_NOTIFICATION_MS ? "synchroniser" : "plus-tard";
}
