/**
 * Règles du service worker, en fonctions pures pour être testées : quelles
 * requêtes il garde, lesquelles il laisse passer, et quelles réponses il a le
 * droit d'enregistrer. Le service worker lui-même (`sw.ts`) ne fait qu'appliquer
 * ces règles avec l'API Cache.
 */

/** Change à chaque évolution des règles : les anciens caches sont alors supprimés. */
export const VERSION_CACHE = "v1";
export const CACHE_STATIQUE = `eclaircie-statique-${VERSION_CACHE}`;
export const CACHE_PAGES = `eclaircie-pages-${VERSION_CACHE}`;

/** La page affichée hors ligne quand l'écran demandé n'a jamais été chargé. */
export const PAGE_HORS_LIGNE = "/hors-ligne";

/** Les trois écrans lisibles hors ligne (section 7 du cdc), préchargés en arrière-plan. */
export const ECRANS_HORS_LIGNE = ["/", "/a-traiter", "/tendances"] as const;

/** Fichiers gardés dès l'installation. */
export const PRECACHE = [PAGE_HORS_LIGNE, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"] as const;

/** Un écran déjà préchargé il y a moins de 30 minutes n'est pas redemandé. */
export const FRAICHEUR_PRECHARGEMENT_MS = 30 * 60 * 1000;

/** Au-delà, une page lente est servie depuis le cache si une copie existe. */
export const DELAI_RESEAU_MS = 8000;

/** Nombre de fichiers statiques gardés : les plus anciens partent après plusieurs mises en ligne. */
export const MAX_FICHIERS_STATIQUES = 300;

/** En-tête ajouté aux pages enregistrées : la date d'enregistrement, en millisecondes. */
export const ENTETE_ENREGISTRE = "x-eclaircie-enregistre";

export type Traitement = "ignorer" | "statique" | "page";

export interface RequeteVue {
  url: string;
  methode: string;
  /** `navigate` pour l'ouverture d'une page. */
  mode: string;
  /** Vrai pour les requêtes de navigation interne de Next (en-tête `RSC`). */
  rsc: boolean;
}

/** Chemins jamais gardés : connexion, API, et tout ce qui touche à la session. */
const JAMAIS = ["/api/", "/connexion"];

function estPrive(chemin: string): boolean {
  return JAMAIS.some((p) => chemin === p.replace(/\/$/, "") || chemin.startsWith(p));
}

/** Ce que le service worker fait d'une requête. */
export function traitement(requete: RequeteVue, origine: string): Traitement {
  if (requete.methode !== "GET") return "ignorer";
  const url = new URL(requete.url);
  if (url.origin !== origine) return "ignorer";
  if (estPrive(url.pathname)) return "ignorer";
  // Navigation interne de Next : Next la gère, et la met en attente hors ligne.
  if (requete.rsc || url.searchParams.has("_rsc")) return "ignorer";
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/favicon.ico") return "statique";
  if (requete.mode === "navigate") return "page";
  return "ignorer";
}

export interface ReponseVue {
  status: number;
  /** Vrai si le serveur a redirigé, par exemple vers la connexion. */
  redirigee: boolean;
  /** Chemin final de la réponse. */
  chemin: string;
  typeContenu: string | null;
}

/**
 * Une page n'est enregistrée que si elle est complète et qu'elle appartient à
 * une session ouverte : jamais une redirection, jamais l'écran de connexion.
 */
export function pageEnregistrable(reponse: ReponseVue): boolean {
  if (reponse.status !== 200 || reponse.redirigee) return false;
  if (estPrive(reponse.chemin)) return false;
  return (reponse.typeContenu ?? "").includes("text/html");
}

/** Clé d'une page dans le cache : le chemin et les paramètres, sans l'ancre. */
export function clePage(url: string): string {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
}

/** Vrai si l'écran doit être redemandé pour rester lisible hors ligne. */
export function aPrecharger(enregistreLe: number | null, maintenant: number): boolean {
  return enregistreLe === null || maintenant - enregistreLe >= FRAICHEUR_PRECHARGEMENT_MS;
}
