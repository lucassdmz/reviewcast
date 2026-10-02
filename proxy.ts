import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie, isPublicPath } from "@/lib/auth/session-cookie";

/**
 * Première barrière : sans cookie de session, les pages renvoient vers la
 * connexion et les routes API répondent 401. La vérification réelle de la
 * session (en base) est faite par `auth()` dans les layouts et les routes.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const connected = hasSessionCookie((name) => request.cookies.has(name));
  if (connected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erreur: "Authentification requise" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"],
};
