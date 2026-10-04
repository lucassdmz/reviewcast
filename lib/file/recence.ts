import { FENETRE_METEO_JOURS, fenetreGlissante } from "@/lib/meteo/agregation";

/**
 * Sépare la file en deux : les avis récents, qui sont l'actualité à traiter,
 * et le rattrapage, c'est-à-dire les avis plus anciens restés sans réponse.
 * Le rattrapage reste accessible mais n'est jamais compté sur la home : on ne
 * démarre pas la journée avec une dette.
 */
export function partagerFile<T extends { dateCreation: Date }>(
  file: T[],
  maintenant: Date,
  jours = FENETRE_METEO_JOURS,
): { recents: T[]; rattrapage: T[] } {
  const { debut } = fenetreGlissante(maintenant, jours);
  return {
    recents: file.filter((a) => a.dateCreation >= debut),
    rattrapage: file.filter((a) => a.dateCreation < debut),
  };
}
