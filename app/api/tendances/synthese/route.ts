import { NextResponse } from "next/server";
import { z } from "zod";
import { lireParametres } from "@/lib/analytics/requete";
import { redigerSynthese } from "@/lib/analytics/synthese";
import { obtenirTendances } from "@/lib/analytics/tendances";
import { auth } from "@/lib/auth/config";
import { idEtablissementActif } from "@/lib/etablissements/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const demandeSchema = z.object({
  periode: z.string().max(10),
  debut: z.string().max(10).optional(),
  fin: z.string().max(10).optional(),
  forcer: z.boolean().optional(),
});

/**
 * Rédaction de la synthèse, demandée par l'écran une fois affiché. Une route
 * plutôt qu'une action serveur : React exécute les actions l'une après l'autre,
 * et les gestes de la gérante n'ont pas à attendre l'IA.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erreur: "Authentification requise" }, { status: 401 });
  const demande = demandeSchema.safeParse(await request.json().catch(() => null));
  if (!demande.success) return NextResponse.json({ erreur: "Demande invalide" }, { status: 400 });
  const { forcer, ...params } = demande.data;
  const { periode } = lireParametres(params);
  const tendances = await obtenirTendances(await idEtablissementActif(), periode);
  return NextResponse.json(await redigerSynthese(tendances, forcer ?? false));
}
