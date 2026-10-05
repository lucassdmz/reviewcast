/**
 * Apprendre des corrections : quand la gérante réécrit un brouillon avant de
 * le publier, sa version devient un modèle pour les brouillons suivants.
 * Logique pure, sans accès à la base.
 */

/** Nombre de corrections envoyées au modèle comme réponses de référence. */
export const NB_CORRECTIONS_UTILISEES = 8;

function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);
}

/** Part des mots communs aux deux textes, entre 0 (rien en commun) et 1 (mêmes mots). */
export function proximite(avant: string, apres: string): number {
  const a = new Set(mots(avant));
  const b = new Set(mots(apres));
  if (a.size === 0 && b.size === 0) return 1;
  let communs = 0;
  for (const m of a) if (b.has(m)) communs++;
  return communs / (a.size + b.size - communs);
}

/**
 * Une correction mérite d'être retenue si la version publiée s'écarte vraiment
 * du brouillon proposé. Une virgule déplacée ou une faute corrigée ne compte pas,
 * et une réponse trop courte n'apprend rien.
 */
export function correctionSignificative(brouillon: string, publie: string): boolean {
  if (mots(publie).length < 12) return false;
  return proximite(brouillon, publie) < 0.85;
}
