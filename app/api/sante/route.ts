import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";

/** État de l'application : session valide et base joignable. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erreur: "Authentification requise" }, { status: 401 });
  }
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true, utilisateur: session.user.email });
}
