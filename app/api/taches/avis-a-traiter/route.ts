import { NextResponse } from "next/server";
import { notifierAvisATraiter } from "@/lib/notifications/service";
import { tacheAutorisee } from "@/lib/taches/autorisation";

export const dynamic = "force-dynamic";

/** Tâche planifiée : une notification pour les avis entrés dans la file depuis le dernier passage. */
export async function GET(request: Request) {
  if (!tacheAutorisee(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await notifierAvisATraiter());
}
