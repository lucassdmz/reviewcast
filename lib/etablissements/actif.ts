/**
 * Établissement actif : celui que toute l'application affiche (météo, file,
 * tendances, réglages). Le choix se fait depuis le rond de la barre d'onglets
 * et vaut pour cet appareil : il est gardé dans un cookie, lu par le serveur.
 */
export const COOKIE_ETABLISSEMENT = "etablissement";

/** Valeur du cookie pour la vue d'ensemble, proposée dès qu'il y a plusieurs établissements. */
export const TOUS_LES_ETABLISSEMENTS = "tous";

export interface Etablissement {
  id: string;
  nom: string;
  adresse: string | null;
  /** Adresse du logo, ou null : on affiche alors les initiales. */
  logo: string | null;
}

/**
 * Établissement à afficher pour une valeur de cookie. Avec un seul
 * établissement, c'est toujours lui. Avec plusieurs, une valeur absente ou
 * inconnue donne la vue d'ensemble (null).
 */
export function choisirActif<T extends { id: string }>(etablissements: T[], valeur: string | undefined | null): T | null {
  if (etablissements.length === 1) return etablissements[0];
  return etablissements.find((e) => e.id === valeur) ?? null;
}

/** Initiales affichées quand un établissement n'a pas de logo : « The Coffee Jacobins » donne « TJ ». */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return `${mots[0][0]}${mots[mots.length - 1][0]}`.toUpperCase();
}
