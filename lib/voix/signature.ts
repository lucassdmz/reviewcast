/**
 * La signature est ajoutée par l'application, jamais par le modèle : elle est
 * donc toujours exacte, et la changer dans Réglages vaut pour tous les
 * brouillons non publiés sans les régénérer.
 */

/** Copie de comparaison, de même longueur que l'original : apostrophes droites, minuscules. */
function comparable(texte: string): string {
  return texte.replace(/’/g, "'").toLowerCase();
}

/** Retire la signature si le texte se termine déjà par elle, sur sa propre ligne ou en fin de phrase. */
export function sansSignature(texte: string, signature: string | null): string {
  const corps = texte.trimEnd();
  const sig = signature?.trim();
  if (!sig) return corps;
  const fin = comparable(corps).replace(/[.!\s]+$/, "");
  const cible = comparable(sig).replace(/[.!\s]+$/, "");
  if (cible.length === 0 || fin.length <= cible.length || !fin.endsWith(cible)) return corps;
  return corps.slice(0, fin.length - cible.length).trimEnd();
}

/** Texte tel qu'il sera publié : le corps, une ligne vide, la signature. Idempotent. */
export function avecSignature(texte: string, signature: string | null): string {
  const corps = sansSignature(texte, signature);
  const sig = signature?.trim();
  return sig ? `${corps}\n\n${sig}` : corps;
}
