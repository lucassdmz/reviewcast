import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { synchroniserMesFiches } from "@/lib/google/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Synchronisation à l'ouverture de l'application. Une route plutôt qu'une action
 * serveur : React exécute les actions l'une après l'autre, et une publication
 * attendait la fin de ce passage, qui peut durer vingt secondes et plus.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ changements: 0, restants: 0 });
  return NextResponse.json(await synchroniserMesFiches(session.user.id));
}
