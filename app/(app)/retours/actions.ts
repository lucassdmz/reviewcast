"use server";

import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { lireChoixEtablissement } from "@/lib/etablissements/service";
import {
  enregistrerRetour,
  listerRetoursEcran,
  retirerRetour,
  retoursActifs,
  type ResultatEnvoi,
  type RetourAffiche,
} from "@/lib/retours/service";
import { captureValide, retourSchema } from "@/lib/retours/validation";

async function autorise(): Promise<boolean> {
  if (!retoursActifs()) return false;
  const session = await auth();
  return Boolean(session?.user);
}

/**
 * Remarque de bêta envoyée par la bulle : le texte et son contexte en JSON
 * (`donnees`), la capture d'écran en JPEG (`capture`, facultative).
 */
export async function actionEnvoyerRetour(formData: FormData): Promise<ResultatEnvoi> {
  if (!(await autorise())) return { ok: false, erreur: "Les remarques ne sont pas ouvertes ici." };

  let brut: unknown;
  try {
    brut = JSON.parse(String(formData.get("donnees") ?? ""));
  } catch {
    return { ok: false, erreur: "Remarque illisible." };
  }
  const saisi = retourSchema.safeParse(brut);
  if (!saisi.success) return { ok: false, erreur: saisi.error.issues[0]?.message ?? "Remarque incomplète." };

  let capture: Uint8Array<ArrayBuffer> | null = null;
  const fichier = formData.get("capture");
  if (fichier instanceof File && fichier.size > 0) {
    const octets = new Uint8Array(await fichier.arrayBuffer());
    // Une capture refusée n'empêche pas d'enregistrer la remarque.
    capture = captureValide(octets) ? octets : null;
  }

  const { actif } = await lireChoixEtablissement();
  return enregistrerRetour(saisi.data, capture, actif?.nom ?? null);
}

const demandeSchema = z.object({ chemin: z.string().startsWith("/").max(500), appareil: z.uuid() });

export async function actionListerRetours(chemin: string, appareil: string): Promise<RetourAffiche[]> {
  if (!(await autorise())) return [];
  const demande = demandeSchema.safeParse({ chemin, appareil });
  return demande.success ? listerRetoursEcran(demande.data.chemin, demande.data.appareil) : [];
}

export async function actionRetirerRetour(id: string, appareil: string): Promise<boolean> {
  if (!(await autorise())) return false;
  const demande = z.object({ id: z.string().min(1).max(40), appareil: z.uuid() }).safeParse({ id, appareil });
  return demande.success ? retirerRetour(demande.data.id, demande.data.appareil) : false;
}
