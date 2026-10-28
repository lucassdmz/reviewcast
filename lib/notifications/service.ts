import webpush from "web-push";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { STATUTS_FILE } from "@/lib/file/statuts";
import { fenetresParEtablissement, filtreRecents } from "@/lib/fenetre/service";
import { messageAvisATraiter, messagePushSchema, messageResumeHebdo, type Abonnement, type ChoixNotifications, type MessagePush } from "./messages";

/**
 * Notifications push (lot 6) : abonnements par appareil, envoi, et les deux
 * tâches planifiées (nouveaux avis à traiter, résumé du lundi). Les clés
 * VAPID restent côté serveur ; seule la clé publique est donnée au navigateur.
 */

const configSchema = z.object({
  VAPID_PUBLIC_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUJET: z.string().regex(/^(mailto:|https:\/\/)/, "VAPID_SUJET commence par mailto: ou https://"),
});

type ConfigPush = z.infer<typeof configSchema>;

/** Null tant que les clés ne sont pas renseignées : les notifications sont alors simplement indisponibles. */
export function configurationPush(): ConfigPush | null {
  const r = configSchema.safeParse(process.env);
  return r.success ? r.data : null;
}

export function clePubliquePush(): string | null {
  return configurationPush()?.VAPID_PUBLIC_KEY ?? null;
}

/** Un avis plus ancien que cela n'est jamais notifié : l'import initial ne déclenche rien. */
const FRAICHEUR_NOTIFICATION_JOURS = 7;

export async function enregistrerAbonnement(userId: string, abonnement: Abonnement, choix: ChoixNotifications): Promise<void> {
  const donnees = { userId, p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth, ...choix };
  await prisma.pushAbonnement.upsert({ where: { endpoint: abonnement.endpoint }, create: { endpoint: abonnement.endpoint, ...donnees }, update: donnees });
}

export async function lireChoix(userId: string, endpoint: string): Promise<ChoixNotifications | null> {
  const a = await prisma.pushAbonnement.findUnique({ where: { endpoint } });
  return a && a.userId === userId ? { nouvelAvis: a.nouvelAvis, resumeHebdo: a.resumeHebdo } : null;
}

export async function retirerAbonnement(userId: string, endpoint: string): Promise<void> {
  await prisma.pushAbonnement.deleteMany({ where: { endpoint, userId } });
}

type Destinataire = { id: string; endpoint: string; p256dh: string; auth: string };

/**
 * Envoie à chaque appareil ; un abonnement expiré (404, 410) est supprimé.
 * web-push chiffre et signe la notification, l'envoi passe par fetch.
 * Renvoie le nombre d'envois réussis.
 */
async function envoyer(destinataires: Destinataire[], message: MessagePush): Promise<number> {
  const config = configurationPush();
  if (!config || destinataires.length === 0) return 0;
  const charge = JSON.stringify(messagePushSchema.parse(message));
  const options = { vapidDetails: { subject: config.VAPID_SUJET, publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY }, TTL: 24 * 60 * 60, urgency: "normal" as const };
  let envoyes = 0;
  for (const d of destinataires) {
    try {
      const requete = webpush.generateRequestDetails({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, charge, options);
      const reponse = await fetch(requete.endpoint, { method: requete.method, headers: requete.headers, body: requete.body ? new Uint8Array(requete.body) : null, signal: AbortSignal.timeout(10_000) });
      if (reponse.ok) envoyes += 1;
      else if (reponse.status === 404 || reponse.status === 410) await prisma.pushAbonnement.delete({ where: { id: d.id } }).catch(() => undefined);
      else console.error(`Notification refusée par le service de push (${reponse.status})`);
    } catch (error) {
      console.error("Notification non envoyée", error instanceof Error ? error.message : error);
    }
  }
  return envoyes;
}

/** Notification d'essai, depuis Réglages, vers l'appareil qui la demande. */
export async function envoyerEssai(userId: string, endpoint: string): Promise<boolean> {
  const d = await prisma.pushAbonnement.findFirst({ where: { endpoint, userId } });
  if (!d) return false;
  const envoyes = await envoyer([d], { titre: "Éclaircie", corps: "Les notifications sont activées sur cet appareil.", url: "/reglages/notifications", tag: "essai" });
  return envoyes === 1;
}

/**
 * Regroupe les avis entrés dans la file depuis le dernier passage en une
 * seule notification, puis les marque comme notifiés. À appeler après chaque
 * synchronisation (lot 1) et par la tâche planifiée.
 */
export async function notifierAvisATraiter(maintenant = new Date()): Promise<{ avis: number; envoyes: number }> {
  const depuis = new Date(maintenant.getTime() - FRAICHEUR_NOTIFICATION_JOURS * 24 * 60 * 60 * 1000);
  const nouveaux = await prisma.review.findMany({
    where: { statut: { in: STATUTS_FILE }, retireAt: null, notifieAt: null, dateCreation: { gte: depuis } },
    select: { id: true, statut: true },
  });
  if (nouveaux.length === 0) return { avis: 0, envoyes: 0 };
  const prets = nouveaux.filter((a) => a.statut === "BROUILLON_PRET").length;
  const destinataires = await prisma.pushAbonnement.findMany({ where: { nouvelAvis: true } });
  const envoyes = await envoyer(destinataires, messageAvisATraiter(nouveaux.length, prets));
  // Marqués même sans abonné : activer les notifications plus tard ne ressort pas les anciens avis.
  await prisma.review.updateMany({ where: { id: { in: nouveaux.map((a) => a.id) } }, data: { notifieAt: maintenant } });
  return { avis: nouveaux.length, envoyes };
}

/** Résumé du lundi matin, sur les 7 derniers jours, tous établissements confondus. */
export async function envoyerResumeHebdo(maintenant = new Date()): Promise<{ envoyes: number }> {
  const destinataires = await prisma.pushAbonnement.findMany({ where: { resumeHebdo: true } });
  if (destinataires.length === 0) return { envoyes: 0 };
  const semaine = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fenetres = await fenetresParEtablissement(maintenant);
  const [recus, contents, aTraiter, reponses] = await Promise.all([
    prisma.review.count({ where: { retireAt: null, dateCreation: { gte: semaine } } }),
    prisma.review.count({ where: { retireAt: null, dateCreation: { gte: semaine }, note: { gte: 4 } } }),
    prisma.review.count({ where: { retireAt: null, statut: { in: STATUTS_FILE }, ...filtreRecents(fenetres) } }),
    prisma.review.count({ where: { retireAt: null, reponseGoogleDate: { gte: semaine } } }),
  ]);
  return { envoyes: await envoyer(destinataires, messageResumeHebdo({ recus, contents, aTraiter, reponses })) };
}
