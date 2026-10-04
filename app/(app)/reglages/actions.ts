"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { NB_REGLES_MAX, decouperListe, voixSchema, type RegleSujet, type Voix } from "@/lib/voix/reglages";
import { enregistrerVoix, lireVoix, retirerCorrection } from "@/lib/voix/service";

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

/**
 * Chaque écran de réglages n'enregistre que sa partie : on relit la voix
 * actuelle, on y applique les champs de l'écran, on valide le tout.
 */
async function appliquer(form: FormData, section: string, changements: Record<string, unknown>, destination: string): Promise<never> {
  const userId = await utilisateurConnecte();
  const locationId = identifiantSchema.parse(champ(form, "locationId"));
  const actuelle: Voix = await lireVoix(locationId);
  const resultat = voixSchema.safeParse({
    ...actuelle,
    signature: actuelle.signature ?? "",
    contact: actuelle.contact ?? "",
    ...changements,
  });
  if (!resultat.success) {
    const message = resultat.error.issues[0]?.message ?? "Réglages invalides.";
    redirect(`/reglages/${section}?erreur=${encodeURIComponent(message)}`);
  }
  await enregistrerVoix(locationId, resultat.data, userId);
  redirect(destination);
}

export async function actionEnregistrerSignature(form: FormData): Promise<void> {
  await appliquer(form, "signature", { signature: champ(form, "signature"), contact: champ(form, "contact") }, "/reglages?enregistre=1");
}

export async function actionEnregistrerTon(form: FormData): Promise<void> {
  await appliquer(
    form,
    "ton",
    {
      personne: champ(form, "personne"),
      registre: champ(form, "registre"),
      longueur: champ(form, "longueur"),
      emojis: form.getAll("emojis").filter((v): v is string => typeof v === "string"),
    },
    "/reglages?enregistre=1",
  );
}

function reglesDuFormulaire(form: FormData): RegleSujet[] {
  const nbRegles = Math.min(Number.parseInt(champ(form, "nbRegles"), 10) || 0, NB_REGLES_MAX);
  return Array.from({ length: nbRegles }, (_, i) => ({
    sujet: champ(form, `regle-${i}-sujet`),
    themes: decouperListe(champ(form, `regle-${i}-themes`)).map((t) => t.toLowerCase()),
    dire: champ(form, `regle-${i}-dire`),
    nePasDire: champ(form, `regle-${i}-nePasDire`),
  }));
}

export async function actionEnregistrerSujets(form: FormData): Promise<void> {
  await appliquer(form, "sujets", { regles: reglesDuFormulaire(form), motsEvites: decouperListe(champ(form, "motsEvites")) }, "/reglages?enregistre=1");
}

/** Ajoute une règle vide pour un sujet proposé (un thème qui revient), en gardant le reste de la saisie. */
export async function actionAjouterRegle(sujetPropose: string, form: FormData): Promise<void> {
  const theme = z.string().parse(sujetPropose).trim().toLowerCase().slice(0, 40);
  const regles = reglesDuFormulaire(form);
  if (theme && regles.length < NB_REGLES_MAX) {
    regles.push({ sujet: theme.charAt(0).toUpperCase() + theme.slice(1), themes: [theme], dire: "", nePasDire: "" });
  }
  await appliquer(form, "sujets", { regles, motsEvites: decouperListe(champ(form, "motsEvites")) }, "/reglages/sujets?regle=ajoutee");
}

/** Retire une règle par sujet, en gardant le reste de la saisie. */
export async function actionRetirerRegle(position: number, form: FormData): Promise<void> {
  const index = z.number().int().min(0).parse(position);
  const regles = reglesDuFormulaire(form).filter((_, i) => i !== index);
  await appliquer(form, "sujets", { regles, motsEvites: decouperListe(champ(form, "motsEvites")) }, "/reglages/sujets?regle=retiree");
}

export async function actionEnregistrerApprentissage(form: FormData): Promise<void> {
  await appliquer(form, "apprentissage", { apprendreCorrections: form.get("apprendreCorrections") === "on" }, "/reglages?enregistre=1");
}

/** Retire une correction retenue : elle ne servira plus de modèle. */
export async function actionRetirerCorrection(correctionId: string): Promise<void> {
  const userId = await utilisateurConnecte();
  await retirerCorrection(identifiantSchema.parse(correctionId), userId);
  redirect("/reglages/apprentissage?retire=1");
}
