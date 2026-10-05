"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import {
  ajouterNote,
  enregistrerBrouillon,
  ignorerAvis,
  publierReponse,
  regenererBrouillon,
  rouvrirAvis,
  supprimerNote,
} from "@/lib/file/service";
import { consigneSchema, identifiantSchema, noteInterneSchema, texteReponseSchema } from "@/lib/file/validation";

/**
 * Actions serveur de la file : session obligatoire, entrées validées par
 * zod, puis délégation à lib/file. Les erreurs reviennent en français dans
 * l'URL de la fiche pour être affichées.
 */
export interface EtatAction {
  erreur?: string;
}

async function utilisateurConnecte(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

function champ(form: FormData, nom: string): string {
  const v = form.get(nom);
  return typeof v === "string" ? v : "";
}

function messageErreur(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Entrée invalide.";
  if (error instanceof Error) return error.message;
  return "Une erreur est survenue.";
}

function rafraichir(reviewId: string) {
  revalidatePath("/a-traiter");
  revalidatePath(`/a-traiter/${reviewId}`);
  revalidatePath("/");
}

async function executer(reviewId: string, action: () => Promise<void>): Promise<EtatAction> {
  try {
    await action();
    rafraichir(reviewId);
    return {};
  } catch (error) {
    return { erreur: messageErreur(error) };
  }
}

export async function actionEnregistrerBrouillon(_etat: EtatAction, form: FormData): Promise<EtatAction> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  return executer(reviewId, () => enregistrerBrouillon(reviewId, texteReponseSchema.parse(champ(form, "texte"))));
}

export async function actionRegenerer(_etat: EtatAction, form: FormData): Promise<EtatAction> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  return executer(reviewId, () => regenererBrouillon(reviewId, consigneSchema.parse(champ(form, "consigne"))));
}

export async function actionIgnorer(form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  const etat = await executer(reviewId, () => ignorerAvis(reviewId, userId));
  if (etat.erreur) redirect(`/a-traiter/${reviewId}?erreur=${encodeURIComponent(etat.erreur)}`);
  redirect("/a-traiter?traite=1");
}

export async function actionRouvrir(form: FormData): Promise<void> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  await executer(reviewId, () => rouvrirAvis(reviewId));
  redirect(`/a-traiter/${reviewId}`);
}

export async function actionAjouterNote(_etat: EtatAction, form: FormData): Promise<EtatAction> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  return executer(reviewId, () => ajouterNote(reviewId, noteInterneSchema.parse(champ(form, "texte"))));
}

export async function actionSupprimerNote(form: FormData): Promise<void> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  const noteId = identifiantSchema.parse(champ(form, "noteId"));
  await executer(reviewId, () => supprimerNote(noteId, reviewId));
}

/** Étape 1 : enregistre le texte et affiche l'écran de confirmation. */
export async function actionPreparerPublication(form: FormData): Promise<void> {
  await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  const etat = await executer(reviewId, () => enregistrerBrouillon(reviewId, texteReponseSchema.parse(champ(form, "texte"))));
  if (etat.erreur) redirect(`/a-traiter/${reviewId}?erreur=${encodeURIComponent(etat.erreur)}`);
  redirect(`/a-traiter/${reviewId}?confirmer=1`);
}

/** Étape 2 : publication effective, après le clic de confirmation explicite. */
export async function actionConfirmerPublication(form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  const etat = await executer(reviewId, () => publierReponse(reviewId, texteReponseSchema.parse(champ(form, "texte")), userId));
  if (etat.erreur) redirect(`/a-traiter/${reviewId}?erreur=${encodeURIComponent(etat.erreur)}`);
  redirect(`/a-traiter?publie=${reviewId}`);
}

/** Remerciement d'un avis positif, publié en un geste depuis la home (section 3.2). */
export async function actionPublierRemerciement(form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const reviewId = identifiantSchema.parse(champ(form, "reviewId"));
  const etat = await executer(reviewId, () => publierReponse(reviewId, texteReponseSchema.parse(champ(form, "texte")), userId));
  if (etat.erreur) redirect(`/?erreur=${encodeURIComponent(etat.erreur)}`);
  redirect("/?remercie=1");
}
