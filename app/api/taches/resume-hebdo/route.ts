import { NextResponse } from "next/server";
import { envoyerResumeHebdo } from "@/lib/notifications/service";
import { tacheAutorisee } from "@/lib/taches/autorisation";

export const dynamic = "force-dynamic";

/** Tâche planifiée du lundi matin : le résumé de la semaine. */
export async function GET(request: Request) {
  if (!tacheAutorisee(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await envoyerResumeHebdo());
}
