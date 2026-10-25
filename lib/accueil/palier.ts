/**
 * Le prochain palier de la note : la prochaine valeur en demi-point (3,5 ;
 * 4,0 ; 4,5) et le nombre d'avis à 5 étoiles qu'il faudrait recevoir pour
 * l'afficher. C'est de l'arithmétique sur les notes réelles, pas une
 * promesse : la note affichée est arrondie à une décimale, donc le palier
 * est atteint dès que la moyenne dépasse « palier moins 0,05 ».
 */
export interface Palier {
  cible: number;
  /** Avis à 5 étoiles nécessaires. 0 quand le palier est déjà affiché. */
  avisCinqEtoiles: number;
}

/** Au delà, l'objectif n'est plus à portée de main : on n'affiche pas de palier. */
const MAX_AVIS = 30;

export function prochainPalier(notes: number[]): Palier | null {
  if (notes.length === 0) return null;
  const somme = notes.reduce((s, n) => s + n, 0);
  const moyenneAffichee = Math.round((somme / notes.length) * 10) / 10;
  // Prochain demi-point strictement au-dessus de la note affichée.
  const cible = Math.floor(moyenneAffichee * 2 + 1e-9) / 2 + 0.5;
  if (cible > 5) return null;
  const seuil = cible - 0.05;
  // (somme + 5n) / (total + n) >= seuil  <=>  n >= (seuil * total - somme) / (5 - seuil)
  const n = Math.max(0, Math.ceil((seuil * notes.length - somme) / (5 - seuil) - 1e-9));
  if (n > MAX_AVIS) return null;
  return { cible, avisCinqEtoiles: n };
}
