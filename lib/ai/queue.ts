import type { ReviewStatus } from "@/lib/db/generated/enums";
import type { ReviewAnalysisOutput } from "./schemas";

export interface ReglesFile {
  inclureQuatreEtoiles: boolean;
}

/**
 * Décide si un avis entre dans la file « À traiter » (section 3.2) :
 * 1 à 3 étoiles sans réponse publiée, ou 4 étoiles avec un problème détecté
 * si le réglage l'autorise. Les avis déjà traités gardent leur statut.
 */
export function statutApresAnalyse(
  review: { note: number; reponseGoogleTexte: string | null; statut: ReviewStatus },
  analyse: Pick<ReviewAnalysisOutput, "probleme_detecte">,
  regles: ReglesFile,
): ReviewStatus {
  if (review.reponseGoogleTexte) return "PUBLIE";
  if (review.statut === "IGNORE" || review.statut === "BROUILLON_PRET") return review.statut;
  const negatif = review.note <= 3;
  const quatreCritique = review.note === 4 && analyse.probleme_detecte && regles.inclureQuatreEtoiles;
  return negatif || quatreCritique ? "A_TRAITER" : "HORS_FILE";
}
