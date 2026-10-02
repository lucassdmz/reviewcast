import type { Polarite } from "@/lib/db/generated/enums";

/** Taxonomie de départ (section 3.3), extensible par l'IA. */
export const TAXONOMIE_INITIALE: { libelle: string; polarite: Polarite }[] = [
  { libelle: "accueil", polarite: "MIXTE" },
  { libelle: "délais", polarite: "MIXTE" },
  { libelle: "qualité", polarite: "MIXTE" },
  { libelle: "prix", polarite: "MIXTE" },
  { libelle: "propreté", polarite: "MIXTE" },
  { libelle: "communication", polarite: "MIXTE" },
  { libelle: "sav", polarite: "MIXTE" },
  { libelle: "rapidité", polarite: "MIXTE" },
  { libelle: "conseil", polarite: "MIXTE" },
];

export function normaliserLibelle(libelle: string): string {
  return libelle.trim().toLowerCase().replace(/\s+/g, " ");
}
