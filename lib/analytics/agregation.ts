import type { Polarite } from "@/lib/db/generated/enums";
import { arrondir } from "@/lib/meteo/agregation";

/**
 * Agrégations pures sur les statistiques précalculées (daily_stats et
 * theme_stats). Aucune lecture d'avis brut ici.
 */
export interface LigneJour {
  jour: Date;
  volume: number;
  sommeNotes: number;
  nb1: number;
  nb2: number;
  nb3: number;
  nb4: number;
  nb5: number;
  nbNegatifs: number;
  nbNegatifsRepondus: number;
  sommeDelaiHeures: number;
}

export interface LigneTheme {
  themeId: string;
  libelle: string;
  polarite: Polarite;
  nombre: number;
}

export interface ThemeClasse {
  themeId: string;
  libelle: string;
  nombre: number;
  /** Différence avec la période précédente, null si le thème n'y existait pas. */
  evolution: number | null;
}

function totaliser(lignes: LigneTheme[], polarite: Polarite): Map<string, { libelle: string; nombre: number }> {
  const m = new Map<string, { libelle: string; nombre: number }>();
  for (const l of lignes) {
    if (l.polarite !== polarite) continue;
    const cur = m.get(l.themeId);
    m.set(l.themeId, { libelle: l.libelle, nombre: (cur?.nombre ?? 0) + l.nombre });
  }
  return m;
}

/** « Ce qui plaît » et « ce qui revient comme problème » : 5 thèmes chacun, avec évolution. */
export function classerThemes(actuels: LigneTheme[], precedents: LigneTheme[], max = 5): { positifs: ThemeClasse[]; negatifs: ThemeClasse[] } {
  const classer = (polarite: Polarite): ThemeClasse[] => {
    const avant = totaliser(precedents, polarite);
    return [...totaliser(actuels, polarite).entries()]
      .map(([themeId, { libelle, nombre }]) => {
        const p = avant.get(themeId);
        return { themeId, libelle, nombre, evolution: p ? nombre - p.nombre : null };
      })
      .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"))
      .slice(0, max);
  };
  return { positifs: classer("POSITIF"), negatifs: classer("NEGATIF") };
}

export interface Repartition {
  volume: number;
  noteMoyenne: number | null;
  etoiles: Record<"1" | "2" | "3" | "4" | "5", number>;
  /** Part de chaque note en pourcentage, 0 sans avis. */
  parts: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export function repartitionEtoiles(lignes: LigneJour[]): Repartition {
  const etoiles = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let volume = 0;
  let somme = 0;
  for (const l of lignes) {
    etoiles["1"] += l.nb1;
    etoiles["2"] += l.nb2;
    etoiles["3"] += l.nb3;
    etoiles["4"] += l.nb4;
    etoiles["5"] += l.nb5;
    volume += l.volume;
    somme += l.sommeNotes;
  }
  const parts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const k of ["1", "2", "3", "4", "5"] as const) parts[k] = volume ? Math.round((etoiles[k] / volume) * 100) : 0;
  return { volume, noteMoyenne: volume ? arrondir(somme / volume) : null, etoiles, parts };
}

export interface PointMensuel {
  mois: Date;
  volume: number;
  noteMoyenne: number | null;
}

/** Note moyenne par mois civil, tous les mois de la période présents même vides. */
export function courbeMensuelle(lignes: LigneJour[], debut: Date, fin: Date): PointMensuel[] {
  const points: PointMensuel[] = [];
  const curseur = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), 1));
  while (curseur < fin) {
    const suivant = new Date(Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() + 1, 1));
    const dans = lignes.filter((l) => l.jour >= curseur && l.jour < suivant);
    const volume = dans.reduce((a, l) => a + l.volume, 0);
    const somme = dans.reduce((a, l) => a + l.sommeNotes, 0);
    points.push({ mois: new Date(curseur), volume, noteMoyenne: volume ? arrondir(somme / volume) : null });
    curseur.setUTCMonth(curseur.getUTCMonth() + 1);
  }
  return points;
}

export interface Reactivite {
  nbNegatifs: number;
  nbRepondus: number;
  /** Part des avis négatifs ayant une réponse, en pourcentage, null sans avis négatif. */
  tauxReponse: number | null;
  /** Délai moyen de réponse en heures, null sans réponse. */
  delaiMoyenHeures: number | null;
}

export function reactivite(lignes: LigneJour[]): Reactivite {
  const nbNegatifs = lignes.reduce((a, l) => a + l.nbNegatifs, 0);
  const nbRepondus = lignes.reduce((a, l) => a + l.nbNegatifsRepondus, 0);
  const sommeDelai = lignes.reduce((a, l) => a + l.sommeDelaiHeures, 0);
  return {
    nbNegatifs,
    nbRepondus,
    tauxReponse: nbNegatifs ? Math.round((nbRepondus / nbNegatifs) * 100) : null,
    delaiMoyenHeures: nbRepondus ? arrondir(sommeDelai / nbRepondus, 1) : null,
  };
}

/** Délai lisible : « 3 h », « 2 j », « moins d'une heure ». */
export function formaterDelai(heures: number | null): string {
  if (heures === null) return "–";
  if (heures < 1) return "moins d'une heure";
  if (heures < 48) return `${Math.round(heures)} h`;
  return `${Math.round(heures / 24)} j`;
}
