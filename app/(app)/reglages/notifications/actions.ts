"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { abonnementSchema, choixNotificationsSchema, type ChoixNotifications } from "@/lib/notifications/messages";
import { configurationPush, enregistrerAbonnement, envoyerEssai, lireChoix, retirerAbonnement } from "@/lib/notifications/service";

/**
 * Notifications de cet appareil : l'abonnement vient du navigateur, il est
 * validé par zod puis rattaché à l'utilisateur connecté.
 */
const endpointSchema = z.string().url().max(1000);

async function utilisateurConnecte(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

export async function actionLireNotifications(endpoint: string): Promise<ChoixNotifications | null> {
  const userId = await utilisateurConnecte();
  const e = endpointSchema.safeParse(endpoint);
  return e.success ? lireChoix(userId, e.data) : null;
}

export async function actionActiverNotifications(abonnement: unknown, choix: unknown): Promise<{ erreur?: string }> {
  const userId = await utilisateurConnecte();
  if (!configurationPush()) return { erreur: "Les notifications ne sont pas encore configurées sur le serveur." };
  const a = abonnementSchema.safeParse(abonnement);
  const c = choixNotificationsSchema.safeParse(choix);
  if (!a.success || !c.success) return { erreur: "Ce navigateur a renvoyé un abonnement inattendu. Vous pouvez réessayer." };
  await enregistrerAbonnement(userId, a.data, c.data);
  return {};
}

export async function actionDesactiverNotifications(endpoint: string): Promise<void> {
  const userId = await utilisateurConnecte();
  const e = endpointSchema.safeParse(endpoint);
  if (e.success) await retirerAbonnement(userId, e.data);
}

export async function actionEssaiNotification(endpoint: string): Promise<{ erreur?: string }> {
  const userId = await utilisateurConnecte();
  const e = endpointSchema.safeParse(endpoint);
  if (!e.success || !(await envoyerEssai(userId, e.data))) return { erreur: "La notification d'essai n'a pas pu partir. Vous pouvez réessayer." };
  return {};
}
