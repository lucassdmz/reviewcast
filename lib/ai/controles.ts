/**
 * Contrôles de fond sur un brouillon, appliqués après réception : une réponse
 * qui les enfreint est refusée et le modèle recommence avec le motif.
 */

/** Une excuse au plus par réponse (ligne de conduite, « Interdits »). */
export const NB_EXCUSES_MAX = 1;

const EXCUSES = [
  /\bd[ée]sol[ée]e?s?\b/gi,
  /\bnavr[ée]e?s?\b/gi,
  /\bexcuses?\b/gi,
  /\bpardon(?:ner|nez)?\b/gi,
  /\b(?:je|nous)\s+regrett(?:e|ons)\b/gi,
];

/** Nombre de formules d'excuse dans un texte. */
export function compterExcuses(texte: string): number {
  return EXCUSES.reduce((total, motif) => total + (texte.match(motif)?.length ?? 0), 0);
}

const MONTANT = /\d+(?:[.,]\d+)?\s*(?:€|euros?\b)|€\s*\d/i;

/** Vrai si le texte cite un prix chiffré : une réponse ne donne jamais de montant. */
export function contientMontant(texte: string): boolean {
  return MONTANT.test(texte);
}
