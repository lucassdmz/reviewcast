import { z } from "zod";

/**
 * Élément montré du doigt par un testeur : de quoi le retrouver dans le code
 * (sélecteur, texte, rôle, carte qui le contient) et sur la capture
 * (position dans l'écran visible, en pixels CSS).
 */
export const elementSchema = z.object({
  selecteur: z.string().max(600),
  balise: z.string().max(20),
  role: z.string().max(40).nullable(),
  texte: z.string().max(160).nullable(),
  /** Carte qui contient l'élément (son titre ou sa première ligne), à défaut le titre de l'écran. */
  contexte: z.string().max(160).nullable(),
  rect: z.object({ x: z.number(), y: z.number(), largeur: z.number(), hauteur: z.number() }),
});
export type ElementDesigne = z.infer<typeof elementSchema>;

/** Le strict nécessaire d'un nœud du DOM : la description se teste sans navigateur. */
export interface NoeudDom {
  tagName: string;
  id: string;
  textContent: string | null;
  /** Texte tel qu'affiché, blocs séparés par des retours à la ligne (absent hors navigateur et sur un SVG). */
  innerText?: string;
  parentElement: NoeudDom | null;
  children: ArrayLike<NoeudDom>;
  getAttribute(nom: string): string | null;
  classList: { contains(nom: string): boolean };
  querySelector(selecteur: string): NoeudDom | null;
}

const BALISES_SIGNIFICATIVES = new Set([
  "BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "IMG", "SVG",
  "H1", "H2", "H3", "H4", "LI", "P", "SECTION", "ARTICLE", "NAV", "DIALOG", "FIGURE",
]);
const CLASSES_SIGNIFICATIVES = ["bloc", "bloc-fort", "sticker"];
const BALISES_CARTES = new Set(["SECTION", "ARTICLE", "LI", "DIALOG", "FIGURE"]);
const TITRES = "h1, h2, h3, h4, [role='heading']";

function significatif(n: NoeudDom): boolean {
  return (
    BALISES_SIGNIFICATIVES.has(n.tagName.toUpperCase()) ||
    n.getAttribute("role") !== null ||
    n.getAttribute("aria-label") !== null ||
    CLASSES_SIGNIFICATIVES.some((c) => n.classList.contains(c))
  );
}

/**
 * Remonte du point touché (souvent un texte ou une icône) jusqu'à l'élément
 * qui a un sens pour l'interface : le bouton plutôt que son icône, la carte
 * plutôt qu'un espace vide en son sein. Un contrôle interactif l'emporte.
 */
export function elementSignificatif<T extends NoeudDom>(depart: T): T {
  let n: NoeudDom | null = depart;
  let premier: NoeudDom | null = null;
  for (let profondeur = 0; n && profondeur < 8; profondeur++, n = n.parentElement) {
    const balise = n.tagName.toUpperCase();
    if (balise === "BODY" || balise === "HTML" || balise === "MAIN") break;
    if (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "LABEL"].includes(balise) || n.getAttribute("role") === "button") return n as T;
    if (!premier && significatif(n)) premier = n;
  }
  // Les parents d'un nœud sont de même nature que lui (des éléments du DOM).
  return (premier ?? depart) as T;
}

function echapper(valeur: string): string {
  return valeur.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

function indexParmiSemblables(n: NoeudDom): number {
  const parent = n.parentElement;
  if (!parent) return 1;
  let rang = 0;
  for (let i = 0; i < parent.children.length; i++) {
    const frere = parent.children[i];
    if (frere.tagName === n.tagName) rang++;
    if (frere === n) return rang;
  }
  return 1;
}

/** Sélecteur CSS du nœud, ancré sur l'identifiant ou l'attribut de test le plus proche, sinon sur `main` ou `body`. */
export function selecteurDe(n: NoeudDom): string {
  const parties: string[] = [];
  let courant: NoeudDom | null = n;
  while (courant) {
    const balise = courant.tagName.toLowerCase();
    if (courant.id) {
      parties.unshift(`#${echapper(courant.id)}`);
      break;
    }
    const testId = courant.getAttribute("data-testid");
    if (testId) {
      parties.unshift(`[data-testid="${testId}"]`);
      break;
    }
    if (balise === "main" || balise === "body" || balise === "nav") {
      parties.unshift(balise);
      break;
    }
    parties.unshift(`${balise}:nth-of-type(${indexParmiSemblables(courant)})`);
    courant = courant.parentElement;
  }
  return parties.join(" > ");
}

function resserrer(texte: string | null | undefined, max: number): string | null {
  const t = (texte ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function texteDe(n: NoeudDom): string | null {
  return n.innerText ?? n.textContent;
}

function estCarte(n: NoeudDom): boolean {
  return BALISES_CARTES.has(n.tagName.toUpperCase()) || CLASSES_SIGNIFICATIVES.some((c) => n.classList.contains(c));
}

/**
 * Où se trouve l'élément : le titre de la carte qui le contient, à défaut sa
 * première ligne (« Le sourire d'abord »), et hors de toute carte le titre de
 * l'écran. Une carte voisine ne compte jamais.
 */
function contexteDe(n: NoeudDom): string | null {
  for (let courant = n.parentElement; courant; courant = courant.parentElement) {
    const balise = courant.tagName.toUpperCase();
    if (balise === "MAIN" || balise === "BODY") break;
    if (!estCarte(courant)) continue;
    const titre = courant.querySelector(TITRES);
    if (titre) return resserrer(texteDe(titre), 160);
    const premiereLigne = (texteDe(courant) ?? "").split("\n").find((ligne) => ligne.trim());
    return resserrer(premiereLigne, 80);
  }
  let racine: NoeudDom = n;
  while (racine.parentElement && !["MAIN", "BODY"].includes(racine.tagName.toUpperCase())) racine = racine.parentElement;
  const titreEcran = racine.querySelector("h1");
  return titreEcran ? resserrer(texteDe(titreEcran), 160) : null;
}

export function decrireElement(
  n: NoeudDom,
  rect: { x: number; y: number; largeur: number; hauteur: number },
): ElementDesigne {
  const balise = n.tagName.toLowerCase();
  return {
    selecteur: selecteurDe(n).slice(0, 600),
    balise: balise.slice(0, 20),
    role: n.getAttribute("role")?.slice(0, 40) ?? null,
    texte: resserrer(n.getAttribute("aria-label") ?? n.getAttribute("alt") ?? texteDe(n), 160),
    contexte: contexteDe(n),
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      largeur: Math.round(rect.largeur),
      hauteur: Math.round(rect.hauteur),
    },
  };
}

/** Résumé d'une ligne, dans la bulle et dans la relecture : « bouton « Publier » dans « Avis de Marie » ». */
export function resumerElement(e: ElementDesigne): string {
  const nature =
    e.balise === "button" || e.role === "button" ? "bouton"
    : e.balise === "a" ? "lien"
    : ["input", "textarea", "select"].includes(e.balise) ? "champ"
    : /^h[1-4]$/.test(e.balise) ? "titre"
    : e.balise === "img" || e.balise === "svg" ? "image"
    : "zone";
  const texte = e.texte ? ` « ${e.texte.length > 50 ? `${e.texte.slice(0, 49)}…` : e.texte} »` : "";
  const dans = e.contexte && e.contexte !== e.texte ? ` dans « ${e.contexte.length > 40 ? `${e.contexte.slice(0, 39)}…` : e.contexte} »` : "";
  return `${nature}${texte}${dans}`;
}
