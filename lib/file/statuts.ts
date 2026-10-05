import type { ReviewStatus } from "@/lib/db/generated/enums";

/**
 * Transitions de statut autorisées (section 3.2). Tout ce qui n'est pas
 * listé est refusé : un avis publié ne revient jamais dans la file.
 */
const TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  HORS_FILE: ["PUBLIE", "A_TRAITER"],
  A_TRAITER: ["BROUILLON_PRET", "IGNORE", "PUBLIE"],
  BROUILLON_PRET: ["IGNORE", "PUBLIE"],
  IGNORE: ["A_TRAITER"],
  PUBLIE: [],
};

export function transitionAutorisee(de: ReviewStatus, vers: ReviewStatus): boolean {
  return TRANSITIONS[de].includes(vers);
}

export class TransitionInterditeError extends Error {
  constructor(
    public readonly de: ReviewStatus,
    public readonly vers: ReviewStatus,
  ) {
    super(`Passage de « ${LIBELLES_STATUT[de]} » à « ${LIBELLES_STATUT[vers]} » impossible`);
    this.name = "TransitionInterditeError";
  }
}

export function verifierTransition(de: ReviewStatus, vers: ReviewStatus): void {
  if (!transitionAutorisee(de, vers)) throw new TransitionInterditeError(de, vers);
}

export const LIBELLES_STATUT: Record<ReviewStatus, string> = {
  HORS_FILE: "hors file",
  A_TRAITER: "à traiter",
  BROUILLON_PRET: "brouillon prêt",
  PUBLIE: "publié",
  IGNORE: "traité sans réponse",
};

/** Statuts qui composent la file « À traiter ». */
export const STATUTS_FILE: ReviewStatus[] = ["A_TRAITER", "BROUILLON_PRET"];
