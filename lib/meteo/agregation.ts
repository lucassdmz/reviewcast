/**
 * Agrégations pures sur une liste d'avis, sans accès à la base : testables
 * et réutilisables par la page Tendances.
 */
export interface AvisMinimal {
  note: number;
  dateCreation: Date;
}

export interface Periode {
  debut: Date;
  /** Exclue. */
  fin: Date;
}

export function debutDuMois(date: Date, decalage = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + decalage, 1));
}

export function moisCourant(maintenant: Date): Periode {
  return { debut: debutDuMois(maintenant), fin: debutDuMois(maintenant, 1) };
}

export function moisPrecedent(maintenant: Date): Periode {
  return { debut: debutDuMois(maintenant, -1), fin: debutDuMois(maintenant) };
}

/**
 * Fenêtre de la file « À traiter » et du contexte d'un avis, en jours : ce qui
 * est récent et mérite une réponse. La météo de la home a ses propres
 * périodes, au choix de l'utilisateur (lib/meteo/periodes.ts). Dans les deux
 * cas la fenêtre est glissante : un mois calendaire repart de zéro le 1er, et
 * deux avis sévères suffisent alors à assombrir tout l'écran.
 */
export const FENETRE_FILE_JOURS = 40;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Les `jours` derniers jours, jusqu'à maintenant inclus. */
export function fenetreGlissante(maintenant: Date, jours = FENETRE_FILE_JOURS): Periode {
  return { debut: new Date(maintenant.getTime() - jours * JOUR_MS), fin: new Date(maintenant.getTime() + 1) };
}

/** La fenêtre de même durée qui précède immédiatement `fenetreGlissante`. */
export function fenetrePrecedente(maintenant: Date, jours = FENETRE_FILE_JOURS): Periode {
  return { debut: new Date(maintenant.getTime() - 2 * jours * JOUR_MS), fin: new Date(maintenant.getTime() - jours * JOUR_MS) };
}

export function douzeMoisGlissants(maintenant: Date): Periode {
  return { debut: debutDuMois(maintenant, -11), fin: debutDuMois(maintenant, 1) };
}

export function dansPeriode(avis: AvisMinimal, periode: Periode): boolean {
  return avis.dateCreation >= periode.debut && avis.dateCreation < periode.fin;
}

export interface StatsPeriode {
  volume: number;
  noteMoyenne: number | null;
  nbEnthousiastes: number;
  /** Part des avis 4-5 étoiles, en pourcentage, null sans avis. */
  partEnthousiastes: number | null;
}

export function statsPeriode(avis: AvisMinimal[], periode: Periode): StatsPeriode {
  const dans = avis.filter((a) => dansPeriode(a, periode));
  const volume = dans.length;
  if (volume === 0) return { volume: 0, noteMoyenne: null, nbEnthousiastes: 0, partEnthousiastes: null };
  const nbEnthousiastes = dans.filter((a) => a.note >= 4).length;
  const somme = dans.reduce((acc, a) => acc + a.note, 0);
  return {
    volume,
    noteMoyenne: arrondir(somme / volume),
    nbEnthousiastes,
    partEnthousiastes: arrondir((nbEnthousiastes / volume) * 100),
  };
}

export interface PointCourbe {
  /** Lundi de la semaine, UTC. */
  semaine: Date;
  noteMoyenne: number | null;
  volume: number;
}

function lundiDeLaSemaine(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((jour + 6) % 7));
  return d;
}

/** Note moyenne par semaine sur les N dernières semaines, semaine en cours comprise. */
export function courbeHebdomadaire(avis: AvisMinimal[], maintenant: Date, nbSemaines = 8): PointCourbe[] {
  const derniere = lundiDeLaSemaine(maintenant);
  const points: PointCourbe[] = [];
  for (let i = nbSemaines - 1; i >= 0; i--) {
    const debut = new Date(derniere);
    debut.setUTCDate(debut.getUTCDate() - 7 * i);
    const fin = new Date(debut);
    fin.setUTCDate(fin.getUTCDate() + 7);
    const stats = statsPeriode(avis, { debut, fin });
    points.push({ semaine: debut, noteMoyenne: stats.noteMoyenne, volume: stats.volume });
  }
  return points;
}

export function arrondir(valeur: number, decimales = 2): number {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

/** Évolution entre deux valeurs, null si l'une manque. */
export function evolution(actuel: number | null, precedent: number | null): number | null {
  if (actuel === null || precedent === null) return null;
  return arrondir(actuel - precedent);
}

/** Thèmes les plus cités du mois, séparés par polarité telle que détectée sur l'avis. */
export function compterThemes(
  avis: { analysis: { themes: { polarite: string; theme: { libelle: string } }[] } | null }[],
  max = 3,
): { positifs: string[]; negatifs: string[] } {
  const positifs = new Map<string, number>();
  const negatifs = new Map<string, number>();
  for (const a of avis) {
    for (const { polarite, theme } of a.analysis?.themes ?? []) {
      const cible = polarite === "NEGATIF" ? negatifs : polarite === "POSITIF" ? positifs : null;
      if (cible) cible.set(theme.libelle, (cible.get(theme.libelle) ?? 0) + 1);
    }
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([l]) => l);
  return { positifs: top(positifs), negatifs: top(negatifs) };
}
