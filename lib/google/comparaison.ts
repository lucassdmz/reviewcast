import type { AvisGoogle } from "./schemas";

/**
 * Comparaison entre ce que Google renvoie et ce que la base contient, en
 * fonctions pures. Aucune décision ici ne publie quoi que ce soit : la
 * synchronisation lit Google, elle n'y écrit jamais.
 */

const NOTES = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;

export function noteDepuisGoogle(note: AvisGoogle["starRating"]): number {
  return NOTES[note];
}

/** Nom affiché quand l'auteur a choisi de rester anonyme. */
export const AUTEUR_ANONYME = "Anonyme";

export interface AvisDistant {
  googleReviewId: string;
  auteur: string;
  note: number;
  texte: string | null;
  dateCreation: Date;
  dateMaj: Date;
  reponse: { texte: string; date: Date | null } | null;
}

export function versAvisDistant(avis: AvisGoogle): AvisDistant {
  const nom = avis.reviewer?.isAnonymous ? "" : (avis.reviewer?.displayName?.trim() ?? "");
  const texte = avis.comment?.trim() ?? "";
  const reponse = avis.reviewReply;
  return {
    googleReviewId: avis.name,
    auteur: nom || AUTEUR_ANONYME,
    note: noteDepuisGoogle(avis.starRating),
    texte: texte || null,
    dateCreation: new Date(avis.createTime),
    dateMaj: new Date(avis.updateTime),
    // Une réponse refusée par la modération de Google n'est pas visible : elle ne compte pas.
    reponse:
      reponse && reponse.reviewReplyState !== "REJECTED"
        ? { texte: reponse.comment, date: reponse.updateTime ? new Date(reponse.updateTime) : null }
        : null,
  };
}

export interface AvisLocal {
  id: string;
  googleReviewId: string;
  note: number;
  texte: string | null;
  auteur: string;
  dateMaj: Date;
  reponseGoogleTexte: string | null;
  reponseGoogleDate: Date | null;
  retireAt: Date | null;
}

export interface MiseAJour {
  id: string;
  distant: AvisDistant;
  /** La note ou le texte a changé : l'avis repasse par l'IA. */
  contenuChange: boolean;
  /** Le gérant a répondu ou corrigé sa réponse directement sur Google. */
  reponseDetectee: boolean;
  /** La réponse connue n'existe plus sur Google. */
  reponseDisparue: boolean;
  /** L'avis était marqué retiré et Google le renvoie de nouveau. */
  restaure: boolean;
}

export interface Comparaison {
  aCreer: AvisDistant[];
  aMettreAJour: MiseAJour[];
  /** Avis absents de Google : marqués retirés, jamais effacés. */
  aRetirer: AvisLocal[];
}

export interface OptionsComparaison {
  /** Tous les avis ont été lus : on peut interpréter l'absence d'un avis. */
  listeComplete: boolean;
  /**
   * Publication simulée : les réponses écrites en base ne sont jamais allées
   * sur Google, leur absence là-bas n'a aucun sens.
   */
  publicationSimulee: boolean;
}

export function comparerAvis(distants: AvisDistant[], locaux: AvisLocal[], options: OptionsComparaison): Comparaison {
  const parId = new Map(locaux.map((l) => [l.googleReviewId, l]));
  const vus = new Set<string>();
  const aCreer: AvisDistant[] = [];
  const aMettreAJour: MiseAJour[] = [];

  for (const d of distants) {
    if (vus.has(d.googleReviewId)) continue;
    vus.add(d.googleReviewId);
    const l = parId.get(d.googleReviewId);
    if (!l) {
      aCreer.push(d);
      continue;
    }
    const contenuChange = l.note !== d.note || (l.texte ?? "") !== (d.texte ?? "");
    const reponseDetectee = d.reponse !== null && d.reponse.texte !== l.reponseGoogleTexte;
    const reponseDisparue = d.reponse === null && l.reponseGoogleTexte !== null && !options.publicationSimulee;
    const restaure = l.retireAt !== null;
    const horodatage = l.dateMaj.getTime() !== d.dateMaj.getTime() || l.auteur !== d.auteur;
    if (contenuChange || reponseDetectee || reponseDisparue || restaure || horodatage) {
      aMettreAJour.push({ id: l.id, distant: d, contenuChange, reponseDetectee, reponseDisparue, restaure });
    }
  }

  // Une liste vide alors que la base a des avis ressemble à une fiche devenue inaccessible, pas à une disparition en masse.
  const interpreterAbsents = options.listeComplete && distants.length > 0;
  const aRetirer = interpreterAbsents ? locaux.filter((l) => l.retireAt === null && !vus.has(l.googleReviewId)) : [];

  return { aCreer, aMettreAJour, aRetirer };
}

/** Le chemin v4 d'une fiche : accounts/{a}/locations/{l}. */
export function cheminFiche(compte: string, googleLocationId: string): string {
  return `${compte}/${googleLocationId}`;
}

/** Extrait locations/{id} d'un nom de ressource Google (fiche ou avis). */
export function locationDepuisRessource(ressource: string): string | null {
  return /(?:^|\/)(locations\/[^/]+)(?:\/|$)/.exec(ressource)?.[1] ?? null;
}
