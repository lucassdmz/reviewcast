import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { estModeDemo } from "@/lib/auth/demo";
import { getEnv } from "@/lib/env";
import { codeErreurConnexion, enregistrerConnexion, identifiantsOAuth } from "@/lib/google/connexion";
import { COOKIE_ETAT_OAUTH, etatValide } from "@/lib/google/etat-oauth";
import { echangerCode } from "@/lib/google/oauth";
import { urlDeRetour } from "@/lib/google/retour";

export const dynamic = "force-dynamic";

/** Retour de l'écran de consentement : vérifie le `state`, garde le refresh token chiffré, propose le choix de la fiche. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/connexion", request.url));
  if (estModeDemo()) return NextResponse.redirect(new URL("/reglages/fiche-google", request.url));

  const vers = (erreur?: string) => {
    const url = new URL("/reglages/fiche-google", process.env.AUTH_URL ?? request.url);
    if (erreur) url.searchParams.set("erreur", erreur);
    const reponse = NextResponse.redirect(url);
    reponse.cookies.delete({ name: COOKIE_ETAT_OAUTH, path: "/api/google" });
    return reponse;
  };

  const params = request.nextUrl.searchParams;
  const valide = etatValide(params.get("state"), {
    userId: session.user.id,
    nonce: request.cookies.get(COOKIE_ETAT_OAUTH)?.value,
    secret: getEnv().AUTH_SECRET,
  });
  if (!valide) return vers("etat-invalide");

  const code = params.get("code");
  if (params.get("error") || !code) return vers("refus-google");

  try {
    await enregistrerConnexion(session.user.id, await echangerCode(identifiantsOAuth(), code, urlDeRetour(request)));
    return vers();
  } catch (error) {
    console.error("Connexion de la fiche interrompue", error instanceof Error ? error.name : "erreur inconnue");
    return vers(codeErreurConnexion(error));
  }
}
