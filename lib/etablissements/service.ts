import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db/client";
import { COOKIE_ETABLISSEMENT, choisirActif, type Etablissement } from "./actif";

export interface ChoixEtablissement {
  etablissements: Etablissement[];
  /** null : vue d'ensemble de tous les établissements. */
  actif: Etablissement | null;
}

/**
 * Les établissements et celui qui est affiché. Mis en cache le temps d'une
 * requête : la barre d'onglets et la page lisent la même réponse.
 */
export const lireChoixEtablissement = cache(async (): Promise<ChoixEtablissement> => {
  const lignes = await prisma.location.findMany({
    select: { id: true, nom: true, adresse: true, logoType: true, updatedAt: true },
    orderBy: { nom: "asc" },
  });
  const etablissements = lignes.map((l) => ({
    id: l.id,
    nom: l.nom,
    adresse: l.adresse,
    // La date de mise à jour change l'adresse quand le logo change : le navigateur peut le garder longtemps.
    logo: l.logoType ? `/logo/${l.id}?v=${l.updatedAt.getTime()}` : null,
  }));
  const valeur = (await cookies()).get(COOKIE_ETABLISSEMENT)?.value;
  return { etablissements, actif: choisirActif(etablissements, valeur) };
});

/** Identifiant de l'établissement affiché, ou null pour la vue d'ensemble. */
export async function idEtablissementActif(): Promise<string | null> {
  return (await lireChoixEtablissement()).actif?.id ?? null;
}

export async function lireLogo(locationId: string): Promise<{ octets: Uint8Array; type: string } | null> {
  const l = await prisma.location.findUnique({ where: { id: locationId }, select: { logo: true, logoType: true } });
  return l?.logo && l.logoType ? { octets: l.logo, type: l.logoType } : null;
}
