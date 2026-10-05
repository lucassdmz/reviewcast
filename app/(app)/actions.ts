"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { COOKIE_ETABLISSEMENT, TOUS_LES_ETABLISSEMENTS } from "@/lib/etablissements/actif";
import { lireChoixEtablissement } from "@/lib/etablissements/service";

/**
 * Change l'établissement affiché dans toute l'application. `id` null : vue
 * d'ensemble. Le choix est gardé un an dans un cookie, pour cet appareil.
 */
export async function actionChoisirEtablissement(id: string | null): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const { etablissements } = await lireChoixEtablissement();
  // Seul un établissement connu est retenu : l'identifiant vient du navigateur.
  const valeur = id !== null && etablissements.some((e) => e.id === id) ? id : TOUS_LES_ETABLISSEMENTS;
  (await cookies()).set(COOKIE_ETABLISSEMENT, valeur, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  revalidatePath("/", "layout");
}
