"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { estModeDemo } from "@/lib/auth/demo";
import { COOKIE_ETABLISSEMENT } from "@/lib/etablissements/actif";
import { codeErreurConnexion, rattacherFiche } from "@/lib/google/connexion";
import { preparerAvisRecents, synchroniserFiche } from "@/lib/google/sync";

const ficheSchema = z.string().regex(/^locations\/[^/]+$/);

/** Rattache la fiche choisie et importe ses avis. L'appartenance est vérifiée auprès de Google. */
export async function actionChoisirFiche(form: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (estModeDemo()) redirect("/reglages/fiche-google");
  const lu = ficheSchema.safeParse(form.get("fiche"));
  if (!lu.success) redirect("/reglages/fiche-google?erreur=fiche-inconnue");

  let locationId: string;
  try {
    locationId = await rattacherFiche(session.user.id, lu.data);
  } catch (error) {
    console.error("Rattachement de la fiche interrompu", error instanceof Error ? error.name : "erreur inconnue");
    redirect(`/reglages/fiche-google?erreur=${codeErreurConnexion(error)}`);
  }
  const { etat } = await synchroniserFiche(locationId, "connexion");
  // Les avis s'affichent tout de suite ; leur analyse et leurs brouillons se font ensuite, sans faire attendre l'écran.
  if (etat === "faite") after(() => preparerAvisRecents(locationId));
  (await cookies()).set(COOKIE_ETABLISSEMENT, locationId, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  revalidatePath("/", "layout");
  redirect(etat === "faite" ? "/avis" : "/reglages/fiche-google?erreur=google-indisponible");
}
