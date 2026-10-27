import { z } from "zod";

/**
 * Contenu des notifications push (lot 6). Ton neutre et factuel, positif
 * d'abord, jamais de nom de client ni de texte d'avis : la notification passe
 * par le service de push du téléphone (Apple, Google, Mozilla).
 */
export interface MessagePush {
  titre: string;
  corps: string;
  /** Écran ouvert par un appui sur la notification. */
  url: string;
  /** Une notification du même type remplace la précédente au lieu de s'empiler. */
  tag: string;
}

/** Ce que le service worker reçoit : validé des deux côtés. */
export const messagePushSchema = z.object({
  titre: z.string().min(1).max(80),
  corps: z.string().min(1).max(200),
  url: z.string().startsWith("/"),
  tag: z.string().min(1).max(40),
});

function avis(n: number): string {
  return n > 1 ? `${n} avis` : "1 avis";
}

/** Nouveaux avis entrés dans la file, regroupés en une notification. */
export function messageAvisATraiter(nouveaux: number, brouillonsPrets: number): MessagePush {
  const attendent = nouveaux > 1 ? "attendent votre réponse" : "attend votre réponse";
  const brouillon =
    brouillonsPrets === 0 ? "" : brouillonsPrets === nouveaux ? (nouveaux > 1 ? " Les brouillons sont prêts." : " Le brouillon est prêt.") : ` ${avis(brouillonsPrets)} avec un brouillon prêt.`;
  return { titre: "Éclaircie", corps: `${avis(nouveaux)} ${attendent}.${brouillon}`, url: "/a-traiter", tag: "a-traiter" };
}

export interface Semaine {
  /** Avis reçus ces 7 derniers jours. */
  recus: number;
  /** Parmi eux, 4 et 5 étoiles. */
  contents: number;
  /** Avis récents qui attendent une réponse. */
  aTraiter: number;
  /** Réponses publiées ces 7 derniers jours. */
  reponses: number;
}

/** Résumé du lundi matin : les clients contents d'abord, puis ce qui reste à faire. */
export function messageResumeHebdo(s: Semaine): MessagePush {
  const phrases: string[] = [];
  if (s.recus === 0) phrases.push("Semaine calme, aucun nouvel avis.");
  else if (s.contents === s.recus) phrases.push(`${avis(s.recus)} cette semaine, ${s.recus > 1 ? "tous" : "un client"} content${s.recus > 1 ? "s" : ""}.`);
  else phrases.push(`${s.contents} client${s.contents > 1 ? "s" : ""} content${s.contents > 1 ? "s" : ""} sur ${avis(s.recus)} cette semaine.`);
  if (s.reponses > 0) phrases.push(`${s.reponses} réponse${s.reponses > 1 ? "s" : ""} publiée${s.reponses > 1 ? "s" : ""}.`);
  phrases.push(s.aTraiter === 0 ? "Rien à traiter." : `${avis(s.aTraiter)} à traiter.`);
  return { titre: "Votre semaine", corps: phrases.join(" "), url: "/", tag: "resume-hebdo" };
}

/** Abonnement envoyé par le navigateur (`PushSubscription.toJSON()`). */
export const abonnementSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export const choixNotificationsSchema = z.object({
  nouvelAvis: z.boolean(),
  resumeHebdo: z.boolean(),
});

export type Abonnement = z.infer<typeof abonnementSchema>;
export type ChoixNotifications = z.infer<typeof choixNotificationsSchema>;
