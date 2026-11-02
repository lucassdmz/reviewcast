"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { marquerConstatVu } from "@/lib/accueil/constats/service";
import { auth } from "@/lib/auth/config";
import { exigerFicheDeLUtilisateur } from "@/lib/etablissements/perimetre";

const constatVuSchema = z.object({
  locationId: z.string().min(1).max(64),
  cle: z.string().min(1).max(120),
  nombre: z.number().int().min(0).max(100_000),
});

/** La fiche de constat a été vue : elle ne reviendra pas avant son délai. */
export async function actionMarquerConstatVu(entree: { locationId: string; cle: string; nombre: number }): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const { locationId, cle, nombre } = constatVuSchema.parse(entree);
  await exigerFicheDeLUtilisateur(locationId);
  await marquerConstatVu(locationId, cle, nombre);
}
