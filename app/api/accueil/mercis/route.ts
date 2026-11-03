import { NextResponse } from "next/server";
import { preparerMercisDeLaVue } from "@/lib/accueil/mercis";
import { auth } from "@/lib/auth/config";
import { idEtablissementActif } from "@/lib/etablissements/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Rédige les mercis manquants, à la demande de l'accueil déjà affiché. Rien n'est publié ici. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erreur: "Authentification requise" }, { status: 401 });
  return NextResponse.json(await preparerMercisDeLaVue(await idEtablissementActif()));
}
