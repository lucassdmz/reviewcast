import { estRecent, type Fenetre } from "@/lib/fenetre/adaptative";

/**
 * Sépare la file en deux : les avis récents, qui sont l'actualité à traiter,
 * et le rattrapage, c'est-à-dire les avis plus anciens restés sans réponse.
 * « Récent » se lit dans la fenêtre de l'établissement de chaque avis. Le
 * rattrapage reste accessible mais n'est jamais compté sur la home : on ne
 * démarre pas la journée avec une dette.
 */
export function partagerFile<T extends { locationId: string; dateCreation: Date }>(
  file: T[],
  fenetres: ReadonlyMap<string, Fenetre>,
  maintenant: Date,
): { recents: T[]; rattrapage: T[] } {
  return {
    recents: file.filter((a) => estRecent(a, fenetres, maintenant)),
    rattrapage: file.filter((a) => !estRecent(a, fenetres, maintenant)),
  };
}
