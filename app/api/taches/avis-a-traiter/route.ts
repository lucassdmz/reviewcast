import { NextResponse } from "next/server";
import { notifierAvisATraiter } from "@/lib/notifications/service";
import { tacheAutorisee } from "@/lib/taches/autorisation";
import { reecrireTousLesBrouillonsDepasses } from "@/lib/voix/reecriture";

export const dynamic = "force-dynamic";

/**
 * Tâche planifiée : une notification pour les avis entrés dans la file depuis
 * le dernier passage. Elle réécrit aussi, avant, les brouillons qu'un
 * changement de réglages n'aurait pas fini de remettre à jour.
 */
export async function GET(request: Request) {
  if (!tacheAutorisee(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const brouillons = await reecrireTousLesBrouillonsDepasses();
  return NextResponse.json({ ...(await notifierAvisATraiter()), brouillonsReecrits: brouillons.reecrits });
}
