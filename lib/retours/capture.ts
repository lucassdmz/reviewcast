import { domToCanvas } from "modern-screenshot";

/**
 * Capture de l'écran visible pour une remarque de bêta, côté navigateur :
 * la page est redessinée sans la bulle, recadrée sur ce que le testeur voit,
 * et l'élément montré du doigt y est entouré. JPEG, 1,4 Mo au plus.
 */

const ATTRIBUT_FIXE = "data-retour-fixe";
const OCTETS_MAX = 1_400_000;
const DELAI_MAX_MS = 10_000;

export interface Zone {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

/**
 * Le dessin se fait sur toute la hauteur de la page : un élément fixe (barre
 * d'onglets, bandeau) y retomberait tout en bas. Sa place à l'écran est donc
 * notée avant, puis reportée sur sa copie en position absolue.
 */
function marquerElementsFixes(): HTMLElement[] {
  const marques: HTMLElement[] = [];
  for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
    const position = getComputedStyle(el).position;
    if (position !== "fixed" && position !== "sticky") continue;
    const r = el.getBoundingClientRect();
    el.setAttribute(ATTRIBUT_FIXE, JSON.stringify({ t: r.top + window.scrollY, l: r.left + window.scrollX, w: r.width, h: r.height }));
    marques.push(el);
  }
  return marques;
}

function replacerCopieFixe(copie: Node): void {
  if (!(copie instanceof HTMLElement)) return;
  const brut = copie.getAttribute(ATTRIBUT_FIXE);
  if (!brut) return;
  const { t, l, w, h } = JSON.parse(brut) as { t: number; l: number; w: number; h: number };
  Object.assign(copie.style, { position: "absolute", top: `${t}px`, left: `${l}px`, width: `${w}px`, height: `${h}px`, right: "auto", bottom: "auto", margin: "0" });
}

function entourer(ctx: CanvasRenderingContext2D, zone: Zone, echelle: number): void {
  const marge = 6;
  const x = (zone.x - marge) * echelle;
  const y = (zone.y - marge) * echelle;
  const l = (zone.largeur + marge * 2) * echelle;
  const h = (zone.hauteur + marge * 2) * echelle;
  const rayon = 12 * echelle;
  ctx.lineJoin = "round";
  // Un liseré d'encre sous le vert : l'entourage se voit sur fond clair comme sur fond sombre.
  for (const [couleur, epaisseur] of [["#15140f", 7], ["#79c043", 4]] as const) {
    ctx.strokeStyle = couleur;
    ctx.lineWidth = epaisseur * echelle;
    ctx.beginPath();
    ctx.roundRect(x, y, l, h, rayon);
    ctx.stroke();
  }
}

function enJpeg(canvas: HTMLCanvasElement, qualite: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualite));
}

async function dessiner(exclure: (n: Node) => boolean, zone: Zone | null): Promise<Blob | null> {
  const echelle = Math.min(window.devicePixelRatio || 1, 2);
  const marques = marquerElementsFixes();
  try {
    const page = await domToCanvas(document.documentElement, {
      scale: echelle,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      filter: (n) => !exclure(n),
      onCloneEachNode: replacerCopieFixe,
    });
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    const ecran = document.createElement("canvas");
    ecran.width = Math.round(largeur * echelle);
    ecran.height = Math.round(hauteur * echelle);
    const ctx = ecran.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(page, window.scrollX * echelle, window.scrollY * echelle, ecran.width, ecran.height, 0, 0, ecran.width, ecran.height);
    if (zone) entourer(ctx, zone, echelle);

    for (const qualite of [0.75, 0.55, 0.35]) {
      const blob = await enJpeg(ecran, qualite);
      if (blob && blob.size <= OCTETS_MAX) return blob;
    }
    return null;
  } finally {
    for (const el of marques) el.removeAttribute(ATTRIBUT_FIXE);
  }
}

/** Capture de l'écran visible, ou null si le navigateur n'y arrive pas à temps : la remarque part alors sans image. */
export async function capturerEcran(exclure: (n: Node) => boolean, zone: Zone | null): Promise<Blob | null> {
  const delai = new Promise<null>((resolve) => setTimeout(() => resolve(null), DELAI_MAX_MS));
  try {
    return await Promise.race([dessiner(exclure, zone), delai]);
  } catch {
    return null;
  }
}
