import type { Gravite } from "@/lib/db/generated/enums";
import type { Palier } from "./palier";

/**
 * Le rituel du matin : l'accueil est une pile de cartes, une chose à la fois.
 * D'abord un sourire, puis la cliente à reconquérir, les mercis prêts, et le
 * levier pour faire monter la note. Tout ce fichier est pur : les données
 * arrivent déjà lues, les tests n'ont pas besoin de base.
 */

const JOUR = 86_400_000;

/** Note telle que Google l'affiche : moyenne de toutes les notes, à une décimale. */
export function noteAffichee(notes: number[]): number | null {
  if (notes.length === 0) return null;
  return Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10;
}

/**
 * Ce qu'un avis a changé à la note, à deux décimales : la moyenne sans lui,
 * puis avec lui. Sert à désamorcer la peur de l'arithmétique (« 4,43 → 4,42 »).
 */
export function effetSurLaNote(notes: number[], noteAvis: number): { avant: number; apres: number } | null {
  if (notes.length < 2) return null;
  const somme = notes.reduce((s, n) => s + n, 0);
  const arrondi = (v: number) => Math.round(v * 100) / 100;
  return { avant: arrondi((somme - noteAvis) / (notes.length - 1)), apres: arrondi(somme / notes.length) };
}

export interface CandidatReconquete {
  id: string;
  auteur: string;
  note: number;
  texte: string | null;
  dateCreation: Date;
  gravite: Gravite | null;
  resume: string | null;
  /** Sujet négatif principal détecté par l'analyse, en minuscules (« la commande sur tablette »), ou null. */
  sujet: string | null;
  /** Brouillon prêt, sans signature, ou null tant qu'il n'est pas rédigé. */
  brouillon: string | null;
}

/** Nombre d'avis récents (10 jours) qui parlent du même sujet négatif, avis compris. */
export type OccurrencesSujet = Map<string, number>;

export const FENETRE_SUJET_JOURS = 10;

const POIDS_GRAVITE: Record<Gravite, number> = { FORTE: 1, MOYENNE: 0.6, FAIBLE: 0.3 };

function graviteEstimee(c: CandidatReconquete): number {
  if (c.gravite) return POIDS_GRAVITE[c.gravite];
  return c.note <= 1 ? 1 : c.note === 2 ? 0.8 : c.note === 3 ? 0.5 : 0.3;
}

/**
 * Priorité d'un avis à traiter, entre 0 et 1, explicable facteur par facteur :
 * gravité 35 %, visibilité probable 25 % (un avis long remonte dans le tri
 * « les plus pertinents » de Google), fraîcheur 20 % (avec un plancher, un avis
 * d'il y a un mois compte encore), sujet qui revient ou question posée 20 %.
 * Les poids sont un point de départ, à ajuster à l'usage (docs/recherche).
 */
export function scorePriorite(c: CandidatReconquete, occurrences: OccurrencesSujet, maintenant: Date): number {
  const longueur = Math.min((c.texte?.trim().length ?? 0) / 400, 1);
  const age = (maintenant.getTime() - c.dateCreation.getTime()) / JOUR;
  const fraicheur = Math.max(0.2, 1 - age / 40);
  const recurrent = c.sujet !== null && (occurrences.get(c.sujet) ?? 0) >= 2;
  const question = /\?/.test(c.texte ?? "");
  const actionnable = recurrent ? 1 : question ? 0.5 : 0;
  return 0.35 * graviteEstimee(c) + 0.25 * longueur + 0.2 * fraicheur + 0.2 * actionnable;
}

/** Pourquoi cet avis passe en premier, en mots courts. */
export function raisonsPriorite(c: CandidatReconquete, occurrences: OccurrencesSujet, maintenant: Date): string[] {
  const raisons: string[] = [];
  if (maintenant.getTime() - c.dateCreation.getTime() < 2 * JOUR) raisons.push("Récent");
  if ((c.texte?.trim().length ?? 0) >= 200) raisons.push("Détaillé, bien visible");
  const n = c.sujet ? (occurrences.get(c.sujet) ?? 0) : 0;
  if (n >= 2) raisons.push("Sujet qui revient");
  if (/\?/.test(c.texte ?? "")) raisons.push("Pose une question");
  return raisons;
}

export function choisirReconquete(candidats: CandidatReconquete[], occurrences: OccurrencesSujet, maintenant: Date): CandidatReconquete | null {
  let meilleur: CandidatReconquete | null = null;
  let score = -1;
  for (const c of candidats) {
    const s = scorePriorite(c, occurrences, maintenant);
    // À égalité, le plus récent passe devant.
    if (s > score || (s === score && meilleur !== null && c.dateCreation > meilleur.dateCreation)) {
      meilleur = c;
      score = s;
    }
  }
  return meilleur;
}

/** Le sujet négatif qui revient le plus ces 10 derniers jours (2 avis au moins), ou null. */
export function sujetQuiRevient(occurrences: OccurrencesSujet): { sujet: string; nombre: number } | null {
  let choisi: { sujet: string; nombre: number } | null = null;
  for (const [sujet, nombre] of occurrences) {
    if (nombre >= 2 && (choisi === null || nombre > choisi.nombre)) choisi = { sujet, nombre };
  }
  return choisi;
}

export interface CandidatSourire {
  id: string;
  auteur: string;
  note: number;
  texte: string | null;
  dateCreation: Date;
  passagesCles: string[];
}

/** Texte d'avis borné pour tenir sur une carte, coupé en fin de phrase si possible. */
export function texteDeCarte(texte: string, max = 240): string {
  const t = texte.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const fin = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf("! "), coupe.lastIndexOf("? "));
  return fin > max * 0.5 ? coupe.slice(0, fin + 1) : `${coupe.trimEnd()}…`;
}

/**
 * Le sourire du jour : un avis 5 étoiles récent avec du texte, le même toute
 * la journée (`tirage` vient du jour de l'année). Les dix plus récents tournent.
 */
export function choisirSourire(candidats: CandidatSourire[], tirage: number, nbRecents = 10): CandidatSourire | null {
  const eligibles = candidats
    .filter((c) => c.note === 5 && (c.texte?.trim().length ?? 0) >= 20)
    .sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime())
    .slice(0, nbRecents);
  if (eligibles.length === 0) return null;
  return eligibles[Math.min(eligibles.length - 1, Math.max(0, Math.floor(tirage * eligibles.length)))];
}

/** Initiales pour l'avatar d'un auteur d'avis (« Claire M. » donne « CM »). */
export function initiales(auteur: string): string {
  const mots = auteur.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  const lettres = mots.slice(0, 2).map((m) => m.charAt(0).toLocaleUpperCase("fr"));
  return lettres.join("");
}

// Les cartes, telles que l'écran les reçoit : des données déjà prêtes à afficher.

export interface CarteSourire {
  type: "sourire";
  reviewId: string;
  auteur: string;
  initiales: string;
  quand: string;
  texte: string;
  /** Ce que le client cite (passages clés de l'analyse), au plus deux. */
  cite: string[];
}

export interface CarteReconquete {
  type: "reconquete";
  reviewId: string;
  auteur: string;
  initiales: string;
  quand: string;
  note: number;
  resume: string;
  raisons: string[];
  effet: { avant: string; apres: string } | null;
  brouillon: string | null;
  signature: string | null;
}

export interface MerciPret {
  reviewId: string;
  auteur: string;
  initiales: string;
  note: number;
  extrait: string | null;
  texte: string;
}

export interface CarteMercis {
  type: "mercis";
  mercis: MerciPret[];
}

export interface CarteLevier {
  type: "levier";
  palier: Palier | null;
  noteActuelle: string | null;
  sujet: { libelle: string; nombre: number; themeId: string | null } | null;
  /** QR du lien d'avis Google, en SVG, ou null tant que le lien n'est pas renseigné. */
  qrSvg: string | null;
  lienAvis: string | null;
}

export type Carte = CarteSourire | CarteReconquete | CarteMercis | CarteLevier;

export function formaterNote(n: number, decimales: 1 | 2 = 1): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);
}

/** « Il y a 3 h », « Hier », « Il y a 5 jours ». */
export function ilYA(date: Date, maintenant: Date): string {
  const minutes = Math.max(0, Math.round((maintenant.getTime() - date.getTime()) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "À l’instant" : `Il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return "Hier";
  return `Il y a ${jours} jours`;
}

