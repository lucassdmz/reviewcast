export interface CandidatCompliment {
  auteur: string;
  note: number;
  texte: string | null;
  passagesCles: string[];
  dateCreation: Date;
}

export interface Compliment {
  texte: string;
  auteur: string;
}

/** Première phrase d'un texte, bornée pour tenir sur une carte. */
export function extraitCourt(texte: string, max = 100): string {
  const phrase = texte.trim().split(/(?<=[.!?])\s+/)[0] ?? texte.trim();
  if (phrase.length <= max) return phrase;
  return `${phrase.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Compliment du moment (section 3.1) : un extrait d'avis 5 étoiles récent
 * avec du texte, choisi par `tirage` (0 inclus à 1 exclu) pour tourner à
 * chaque ouverture. Les passages clés de l'analyse IA sont préférés au texte brut.
 */
export function choisirCompliment(candidats: CandidatCompliment[], tirage: number, nbRecents = 10): Compliment | null {
  const eligibles = candidats
    .filter((c) => c.note === 5 && ((c.texte?.trim().length ?? 0) > 0 || c.passagesCles.length > 0))
    .sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime())
    .slice(0, nbRecents);
  if (eligibles.length === 0) return null;
  const index = Math.min(eligibles.length - 1, Math.max(0, Math.floor(tirage * eligibles.length)));
  const choisi = eligibles[index];
  const texte = choisi.passagesCles[0] ?? extraitCourt(choisi.texte ?? "");
  return { texte, auteur: choisi.auteur };
}
