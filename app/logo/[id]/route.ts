import { auth } from "@/lib/auth/config";
import { lireLogo } from "@/lib/etablissements/service";

/** Logo d'un établissement, servi depuis la base aux seuls utilisateurs connectés. */
export async function GET(_request: Request, { params }: RouteContext<"/logo/[id]">) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  const logo = await lireLogo((await params).id);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(Buffer.from(logo.octets), {
    headers: {
      "Content-Type": logo.type,
      // L'adresse porte la version du logo : il peut rester un an dans le navigateur.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
