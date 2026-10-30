import { NextResponse } from "next/server";
import { synchroniserToutesLesFiches } from "@/lib/google/sync";
import { tacheAutorisee } from "@/lib/taches/autorisation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Le travail s'arrête avant la limite de la plateforme ; le reste repart au prochain passage. */
const BUDGET_MS = 240_000;

/** Tâche planifiée, filet de sécurité quotidien : relit chaque fiche et termine les analyses en attente. */
export async function GET(request: Request) {
  if (!tacheAutorisee(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await synchroniserToutesLesFiches(BUDGET_MS));
}
