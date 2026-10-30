import { cache } from "react";
import { estModeDemo } from "@/lib/auth/demo";
import { prisma } from "@/lib/db/client";

/**
 * Une fiche appartient à l'utilisateur qui l'a connectée : chaque lecture et
 * chaque action passent par ce périmètre. En mode démonstration, il n'y a
 * qu'un visiteur et que des données fictives : tout est visible.
 */
const utilisateurCourant = cache(async (): Promise<string | null> => {
  // Chargé à la demande : la configuration d'Auth.js exige des variables que le seed n'a pas toutes.
  const { auth } = await import("@/lib/auth/config");
  return (await auth())?.user?.id ?? null;
});

/** Filtre Prisma des fiches de l'utilisateur connecté. Sans session : aucune fiche. */
export async function filtreEtablissements(): Promise<{ googleConnection?: { userId: string } }> {
  if (estModeDemo()) return {};
  return { googleConnection: { userId: (await utilisateurCourant()) ?? "aucun-utilisateur" } };
}

/** Filtre sur l'établissement affiché ; `null` : la vue d'ensemble, limitée aux fiches de l'utilisateur. */
export async function filtreFiches(locationId: string | null): Promise<{ locationId?: string; location?: { googleConnection?: { userId: string } } }> {
  if (locationId) return { locationId };
  if (estModeDemo()) return {};
  return { location: await filtreEtablissements() };
}

export class AccesRefuse extends Error {
  constructor() {
    super("Cet avis ou cette fiche n'est pas rattaché à votre compte.");
    this.name = "AccesRefuse";
  }
}

export async function exigerFicheDeLUtilisateur(locationId: string): Promise<void> {
  const n = await prisma.location.count({ where: { id: locationId, ...(await filtreEtablissements()) } });
  if (n === 0) throw new AccesRefuse();
}

export async function avisAppartientALUtilisateur(reviewId: string): Promise<boolean> {
  return (await prisma.review.count({ where: { id: reviewId, location: await filtreEtablissements() } })) > 0;
}

export async function exigerAvisDeLUtilisateur(reviewId: string): Promise<void> {
  if (!(await avisAppartientALUtilisateur(reviewId))) throw new AccesRefuse();
}
