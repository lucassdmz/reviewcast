"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lireParametres } from "@/lib/analytics/requete";
import { syntheseTendances } from "@/lib/analytics/synthese";
import { obtenirTendances } from "@/lib/analytics/tendances";
import { auth } from "@/lib/auth/config";
import { idEtablissementActif } from "@/lib/etablissements/service";

/** Régénère la synthèse IA de la période affichée, à la demande. */
export async function actionRegenererSynthese(form: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const params: Record<string, string> = {};
  for (const k of ["periode", "debut", "fin"]) {
    const v = form.get(k);
    if (typeof v === "string" && v) params[k] = v;
  }
  const { periode, requete } = lireParametres(params);
  const tendances = await obtenirTendances(await idEtablissementActif(), periode);
  await syntheseTendances(tendances, true);
  revalidatePath("/tendances");
  redirect(`/tendances?${requete}`);
}
