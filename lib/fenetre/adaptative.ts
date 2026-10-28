import { fenetreGlissante } from "@/lib/meteo/agregation";

/**
 * Fenêtre de l'accueil, de la file « À traiter » et du contexte d'un avis,
 * calée sur le rythme de chaque établissement. Un café qui reçoit un avis
 * par jour se lit sur six semaines ; un café plus calme a besoin de deux ou
 * trois mois pour qu'un seul avis sévère ne pèse pas tout l'écran, et pour
 * que son accueil ne soit pas vide. La fenêtre retenue est la plus courte
 * qui contient assez d'avis, sans jamais dépasser trois mois : au-delà, ce
 * n'est plus de l'actualité. La météo garde ses propres périodes, au choix
 * de l'utilisateur (lib/meteo/periodes.ts).
 */
export const PALIERS_FENETRE_JOURS = [42, 60, 90] as const;
export type JoursFenetre = (typeof PALIERS_FENETRE_JOURS)[number];

/** Avis qu'il faut au moins sur la fenêtre pour en tirer une lecture juste. */
export const AVIS_MIN_FENETRE = 10;

/** Fenêtre la plus large : l'établissement n'a pas encore assez d'avis pour une plus courte. */
export const FENETRE_MAX_JOURS: JoursFenetre = 90;

/** Des semaines et des mois plutôt que des jours : « 2 mois » se lit sans calcul. */
export const LIBELLES_FENETRE: Record<JoursFenetre, { duree: string; dernieres: string }> = {
  42: { duree: "6 semaines", dernieres: "ces 6 dernières semaines" },
  60: { duree: "2 mois", dernieres: "ces 2 derniers mois" },
  90: { duree: "3 mois", dernieres: "ces 3 derniers mois" },
};

export interface Fenetre {
  jours: JoursFenetre;
  debut: Date;
}

/** Choisit la fenêtre d'après les dates des avis (une liste plus longue que trois mois ne gêne pas). */
export function fenetreAdaptative(dates: Date[], maintenant: Date): Fenetre {
  for (const jours of PALIERS_FENETRE_JOURS) {
    const { debut, fin } = fenetreGlissante(maintenant, jours);
    const nombre = dates.filter((d) => d >= debut && d < fin).length;
    if (nombre >= AVIS_MIN_FENETRE) return { jours, debut };
  }
  return { jours: FENETRE_MAX_JOURS, debut: fenetreGlissante(maintenant, FENETRE_MAX_JOURS).debut };
}

/** Début de la fenêtre la plus large : il suffit de lire les avis depuis cette date pour choisir. */
export function debutLecture(maintenant: Date): Date {
  return fenetreGlissante(maintenant, FENETRE_MAX_JOURS).debut;
}

/**
 * Un avis sans réponse est « récent », donc dans la file, s'il est entré dans
 * la fenêtre de son propre établissement. La vue d'ensemble applique ainsi à
 * chaque café la sienne, et un avis ne change pas de rubrique selon la vue.
 */
export function estRecent(avis: { locationId: string; dateCreation: Date }, fenetres: ReadonlyMap<string, Fenetre>, maintenant: Date): boolean {
  const debut = fenetres.get(avis.locationId)?.debut ?? debutLecture(maintenant);
  return avis.dateCreation >= debut;
}
