import { z } from "zod";

/**
 * Où et comment la bulle de retours se tient, propre à chaque appareil :
 * ouverte, réduite en pastille ou rangée contre le bord, à gauche ou à
 * droite, à la hauteur où le testeur l'a glissée.
 */
export const ETATS_BULLE = ["ouverte", "reduite", "rangee"] as const;
export type EtatBulle = (typeof ETATS_BULLE)[number];
export type Cote = "gauche" | "droite";

const preferencesSchema = z.object({
  etat: z.enum(ETATS_BULLE).catch("rangee"),
  cote: z.enum(["gauche", "droite"]).catch("droite"),
  /** Hauteur du centre de la pastille, en fraction de l'écran (0 en haut, 1 en bas). */
  hauteur: z.number().min(0).max(1).catch(0.62),
});
export type PreferencesBulle = z.infer<typeof preferencesSchema>;

/** Au départ, la bulle est rangée contre le bord droit : une fine languette, qui ne cache rien de l'écran. */
export const PREFERENCES_PAR_DEFAUT: PreferencesBulle = { etat: "rangee", cote: "droite", hauteur: 0.62 };

/** Lit les préférences enregistrées ; une valeur absente ou abîmée retombe sur la valeur par défaut. */
export function lirePreferences(brut: string | null): PreferencesBulle {
  if (!brut) return PREFERENCES_PAR_DEFAUT;
  try {
    const lu = preferencesSchema.safeParse(JSON.parse(brut));
    return lu.success ? lu.data : PREFERENCES_PAR_DEFAUT;
  } catch {
    return PREFERENCES_PAR_DEFAUT;
  }
}

/** Marge, en pixels, gardée en haut et en bas de l'écran pour la pastille (encoche, barre d'onglets). */
const MARGE_HAUT = 72;
const MARGE_BAS = 110;

/** Relâchée à moins de 20 px d'un bord, la pastille s'y range ; une languette tirée à plus de 60 px du bord redevient pastille. */
const BORD_RANGEMENT = 20;
const BORD_SORTIE = 60;

/**
 * Fin d'un glissement de la pastille ou de la languette : elle se met du
 * côté de l'écran le plus proche du doigt, à sa hauteur, sans sortir de
 * l'écran, et se range ou ressort selon la distance au bord.
 */
export function placerApresGlissement(
  doigt: { x: number; y: number },
  ecran: { largeur: number; hauteur: number },
  etat: EtatBulle,
): { cote: Cote; hauteur: number; etat: EtatBulle } {
  const cote: Cote = doigt.x < ecran.largeur / 2 ? "gauche" : "droite";
  const min = Math.min(MARGE_HAUT, ecran.hauteur / 2);
  const max = Math.max(ecran.hauteur - MARGE_BAS, min);
  const y = Math.min(Math.max(doigt.y, min), max);
  const hauteur = ecran.hauteur > 0 ? Math.round((y / ecran.hauteur) * 1000) / 1000 : PREFERENCES_PAR_DEFAUT.hauteur;
  const distanceAuBord = Math.min(doigt.x, ecran.largeur - doigt.x);
  const suivant: EtatBulle =
    distanceAuBord < BORD_RANGEMENT ? "rangee"
    : etat === "rangee" && distanceAuBord > BORD_SORTIE ? "reduite"
    : etat;
  return { cote, hauteur, etat: suivant };
}

/** Au-delà de ce déplacement, en pixels, un appui devient un glissement et n'ouvre pas la bulle. */
export const SEUIL_GLISSEMENT = 8;

export function estGlissement(depart: { x: number; y: number }, actuel: { x: number; y: number }): boolean {
  return Math.hypot(actuel.x - depart.x, actuel.y - depart.y) > SEUIL_GLISSEMENT;
}
