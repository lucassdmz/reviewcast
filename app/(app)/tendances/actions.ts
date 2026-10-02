"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lireParametres } from "@/lib/analytics/requete";
import { syntheseTendances } from "@/lib/analytics/synthese";
import { obtenirTendances } from "@/lib/analytics/tendances";
import { auth } from "@/lib/auth/config";

/** Régénère la synthèse IA de la période affichée, à la demande. */
export async function actionRegenererSynthese(form: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const params: Record<string, string> = {};
  for (const k of ["periode", "debut", "fin", "etablissement"]) {
    const v = form.get(k);
    if (typeof v === "string" && v) params[k] = v;
  }
  const { periode, locationId, requete } = lireParametres(params);
  const tendances = await obtenirTendances(locationId, periode);
  await syntheseTendances(tendances, true);
  revalidatePath("/tendances");
  redirect(`/tendances?${requete}`);
}
