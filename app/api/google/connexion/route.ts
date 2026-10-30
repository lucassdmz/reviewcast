import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { estModeDemo } from "@/lib/auth/demo";
import { getEnv } from "@/lib/env";
import { identifiantsOAuth } from "@/lib/google/connexion";
import { COOKIE_ETAT_OAUTH, creerEtat, DUREE_ETAT_MS } from "@/lib/google/etat-oauth";
import { urlAutorisation } from "@/lib/google/oauth";
import { urlDeRetour } from "@/lib/google/retour";

export const dynamic = "force-dynamic";

/** Lance la connexion de la fiche : renvoie vers l'écran de consentement de Google. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/connexion", request.url));
  if (estModeDemo()) return NextResponse.redirect(new URL("/reglages/fiche-google", request.url));

  const { etat, nonce } = creerEtat(session.user.id, getEnv().AUTH_SECRET);
  const reponse = NextResponse.redirect(urlAutorisation(identifiantsOAuth(), urlDeRetour(request), etat));
  reponse.cookies.set(COOKIE_ETAT_OAUTH, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/google",
    maxAge: DUREE_ETAT_MS / 1000,
  });
  return reponse;
}
