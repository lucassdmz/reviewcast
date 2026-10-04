"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { NB_REGLES_MAX, decouperListe, voixSchema, type Voix } from "@/lib/voix/reglages";
import { enregistrerVoix, retirerCorrection } from "@/lib/voix/service";

const identifiantSchema = z.string().min(1).max(64);

async function utilisateurConnecte(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user.id;
}

function champ(form: FormData, nom: string): string {
  const v = form.get(nom);
  return typeof v === "string" ? v : "";
}

/** Relit tout le formulaire de la voix. En cas d'erreur, renvoie vers Réglages avec le message. */
function lireFormulaire(form: FormData): { locationId: string; voix: Voix } {
  const locationId = identifiantSchema.parse(champ(form, "locationId"));
  const nbRegles = Math.min(Number.parseInt(champ(form, "nbRegles"), 10) || 0, NB_REGLES_MAX);
  const regles = Array.from({ length: nbRegles }, (_, i) => ({
    sujet: champ(form, `regle-${i}-sujet`),
    themes: decouperListe(champ(form, `regle-${i}-themes`)).map((t) => t.toLowerCase()),
    dire: champ(form, `regle-${i}-dire`),
    nePasDire: champ(form, `regle-${i}-nePasDire`),
  }));
  const resultat = voixSchema.safeParse({
    signature: champ(form, "signature"),
    personne: champ(form, "personne"),
    registre: champ(form, "registre"),
    longueur: champ(form, "longueur"),
    emojis: form.getAll("emojis").filter((v): v is string => typeof v === "string"),
    apprendreCorrections: form.get("apprendreCorrections") === "on",
    contact: champ(form, "contact"),
    regles,
    motsEvites: decouperListe(champ(form, "motsEvites")),
  });
  if (!resultat.success) {
    const message = resultat.error.issues[0]?.message ?? "Réglages invalides.";
    redirect(`/reglages?erreur=${encodeURIComponent(message)}`);
  }
  return { locationId, voix: resultat.data };
}

/** Enregistre la voix de l'établissement, puis montre un aperçu avec les nouveaux réglages. */
export async function actionEnregistrerVoix(form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const { locationId, voix } = lireFormulaire(form);
  await enregistrerVoix(locationId, voix, userId);
  redirect("/reglages?enregistre=1&apercu=1#apercu");
}

/** Ajoute une règle vide pour un sujet proposé (un thème qui revient), en gardant le reste de la saisie. */
export async function actionAjouterRegle(sujetPropose: string, form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const { locationId, voix } = lireFormulaire(form);
  const theme = z.string().parse(sujetPropose).trim().toLowerCase().slice(0, 40);
  if (theme && voix.regles.length < NB_REGLES_MAX) {
    const sujet = theme.charAt(0).toUpperCase() + theme.slice(1);
    voix.regles.push({ sujet, themes: [theme], dire: "", nePasDire: "" });
  }
  await enregistrerVoix(locationId, voix, userId);
  redirect("/reglages?regle=ajoutee#sujets");
}

/** Retire une règle par sujet, en gardant le reste de la saisie. */
export async function actionRetirerRegle(position: number, form: FormData): Promise<void> {
  const userId = await utilisateurConnecte();
  const { locationId, voix } = lireFormulaire(form);
  const index = z.number().int().min(0).parse(position);
  voix.regles = voix.regles.filter((_, i) => i !== index);
  await enregistrerVoix(locationId, voix, userId);
  redirect("/reglages?regle=retiree#sujets");
}

/** Retire une correction retenue : elle ne servira plus de modèle. */
export async function actionRetirerCorrection(correctionId: string): Promise<void> {
  const userId = await utilisateurConnecte();
  await retirerCorrection(identifiantSchema.parse(correctionId), userId);
  redirect("/reglages?retire=1#apprentissage");
}
