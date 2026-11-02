import { formaterNote } from "../rituel";

/**
 * Les constats de la pile : des fiches sans place réservée. Chaque scénario a
 * ses critères ; sa fiche n'existe que s'ils sont remplis. Un constat se lit
 * toujours sur un seul établissement. Les chiffres et les phrases viennent du
 * code, jamais de l'IA. Les seuils sont un point de départ, à ajuster sur de
 * vrais avis.
 */
export const SEUILS = {
  sujetMonte: { fenetreJours: 14, mentionsMin: 3, referenceJours: 56, multiplicateur: 2, avisReferenceMin: 5 },
  progres: { fenetreJours: 90, mentionsAvantMin: 4, avisDepuisMin: 8, baisseMin: 2 },
  motEquipe: { fenetreJours: 7, avisMin: 3 },
  enForme: { fenetreJours: 30, avisMin: 5, noteMin: 4 },
  parPile: 2,
} as const;

export type TypeConstat = "sujet_monte" | "progres" | "mot_equipe" | "en_forme";

/** Ce qu'il faut garder en base : 180 jours couvrent la plus longue comparaison (progrès). */
export const HISTORIQUE_JOURS = SEUILS.progres.fenetreJours * 2;

/** Une fiche déjà vue attend ce délai avant de revenir. */
const DELAI_JOURS: Record<TypeConstat, number> = { sujet_monte: 14, progres: 30, mot_equipe: 14, en_forme: 14 };
/** Le sujet qui monte passe avant tout : c'est le seul constat à traiter. */
const PRIORITE: TypeConstat[] = ["sujet_monte", "progres", "mot_equipe", "en_forme"];
/** À l'écran, le positif d'abord. */
const ORDRE_AFFICHAGE: TypeConstat[] = ["progres", "mot_equipe", "en_forme", "sujet_monte"];

export interface ThemeAvis {
  themeId: string;
  libelle: string;
  polarite: "POSITIF" | "NEGATIF" | "MIXTE";
}

export interface AvisConstat {
  note: number;
  dateCreation: Date;
  /** Null si l'avis n'est pas lisible : sans texte, pas encore analysé ou hors sujet. Il ne compte pas dans les comparaisons de thèmes. */
  themes: ThemeAvis[] | null;
}

export interface FicheConstats {
  locationId: string;
  nom: string;
  avis: AvisConstat[];
}

export interface Constat {
  type: TypeConstat;
  /** Identifie la fiche dans son établissement, pour ne pas la répéter. */
  cle: string;
  locationId: string;
  /** Mesure de la fiche : la plus forte d'un type passe devant, et un sujet qui s'aggrave revient plus tôt. */
  nombre: number;
  intitule: string;
  titre: string;
  phrase: string;
  /** Nom de l'établissement concerné, en vue d'ensemble seulement. */
  etablissement: string | null;
  /** Thème dont on peut lire les avis. */
  themeId: string | null;
  /** Texte à envoyer à l'équipe, pour les fiches qui se partagent. */
  partage: string | null;
}

export interface ConstatVu {
  locationId: string;
  cle: string;
  nombre: number;
  vuAt: Date;
}

const JOUR_MS = 86_400_000;

function depuisJours(maintenant: Date, jours: number): Date {
  return new Date(maintenant.getTime() - jours * JOUR_MS);
}

/** Les avis lisibles reçus dans [debut, fin[. */
function lisiblesEntre(avis: AvisConstat[], debut: Date, fin: Date): (AvisConstat & { themes: ThemeAvis[] })[] {
  return avis.filter((a): a is AvisConstat & { themes: ThemeAvis[] } => a.themes !== null && a.dateCreation >= debut && a.dateCreation < fin);
}

/** Pour chaque thème, le nombre d'avis qui en parlent avec cette polarité. */
function mentions(avis: { themes: ThemeAvis[] }[], polarite: ThemeAvis["polarite"]): Map<string, { libelle: string; nombre: number }> {
  const parTheme = new Map<string, { libelle: string; nombre: number }>();
  for (const a of avis) {
    for (const t of a.themes) {
      if (t.polarite !== polarite) continue;
      const courant = parTheme.get(t.themeId);
      parTheme.set(t.themeId, { libelle: t.libelle, nombre: (courant?.nombre ?? 0) + 1 });
    }
  }
  return parTheme;
}

type Base = Pick<FicheConstats, "locationId"> & { etablissement: string | null };

function sujetsQuiMontent(avis: AvisConstat[], base: Base, maintenant: Date): Constat[] {
  const { fenetreJours, mentionsMin, referenceJours, multiplicateur, avisReferenceMin } = SEUILS.sujetMonte;
  const debut = depuisJours(maintenant, fenetreJours);
  const reference = lisiblesEntre(avis, depuisJours(maintenant, fenetreJours + referenceJours), debut);
  // Sans assez d'histoire, on ne peut pas parler de « d'habitude ».
  if (reference.length < avisReferenceMin) return [];
  const passe = mentions(reference, "NEGATIF");
  const constats: Constat[] = [];
  for (const [themeId, { libelle, nombre }] of mentions(lisiblesEntre(avis, debut, new Date(maintenant.getTime() + 1)), "NEGATIF")) {
    // Le rythme habituel, ramené à la durée de la fenêtre.
    const rythme = ((passe.get(themeId)?.nombre ?? 0) * fenetreJours) / referenceJours;
    if (nombre < mentionsMin || nombre < rythme * multiplicateur) continue;
    const habituel = Math.round(rythme);
    constats.push({
      ...base,
      type: "sujet_monte",
      cle: `sujet_monte:${themeId}`,
      nombre,
      intitule: "Le sujet qui monte",
      titre: libelle,
      phrase: `${nombre} avis en parlent ces ${fenetreJours} derniers jours, ${habituel > 0 ? `contre ${habituel} d’habitude` : "c’était rare jusqu’ici"}.`,
      themeId,
      partage: null,
    });
  }
  return constats;
}

function progres(avis: AvisConstat[], base: Base, maintenant: Date): Constat[] {
  const { fenetreJours, mentionsAvantMin, avisDepuisMin, baisseMin } = SEUILS.progres;
  const debut = depuisJours(maintenant, fenetreJours);
  const lusDepuis = lisiblesEntre(avis, debut, new Date(maintenant.getTime() + 1));
  if (lusDepuis.length < avisDepuisMin) return [];
  const lusAvant = lisiblesEntre(avis, depuisJours(maintenant, fenetreJours * 2), debut);
  const depuis = mentions(lusDepuis, "NEGATIF");
  const constats: Constat[] = [];
  for (const [themeId, { libelle, nombre: avant }] of mentions(lusAvant, "NEGATIF")) {
    const apres = depuis.get(themeId)?.nombre ?? 0;
    // On compare des parts d'avis : recevoir moins d'avis ne doit pas passer pour un progrès.
    if (avant < mentionsAvantMin || (apres / lusDepuis.length) * baisseMin > avant / lusAvant.length) continue;
    constats.push({
      ...base,
      type: "progres",
      cle: `progres:${themeId}`,
      nombre: avant,
      intitule: "Le progrès constaté",
      titre: libelle,
      phrase: `${avant} avis sur ${lusAvant.length} en parlaient les 3 mois précédents, ${apres === 0 ? "aucun" : apres} sur ${lusDepuis.length} ces 3 derniers mois.`,
      themeId,
      partage: null,
    });
  }
  return constats;
}

function motsPourLEquipe(avis: AvisConstat[], base: Base, maintenant: Date): Constat[] {
  const { fenetreJours, avisMin } = SEUILS.motEquipe;
  const recents = lisiblesEntre(avis, depuisJours(maintenant, fenetreJours), new Date(maintenant.getTime() + 1)).filter((a) => a.note >= 4);
  const constats: Constat[] = [];
  for (const [themeId, { libelle, nombre }] of mentions(recents, "POSITIF")) {
    if (nombre < avisMin) continue;
    constats.push({
      ...base,
      type: "mot_equipe",
      cle: `mot_equipe:${themeId}`,
      nombre,
      intitule: "Le mot pour l’équipe",
      titre: libelle,
      phrase: `${nombre} clients ont salué ce point ces ${fenetreJours} derniers jours.`,
      themeId: null,
      partage: `${nombre} clients ont laissé un avis positif sur ce point ces ${fenetreJours} derniers jours : ${libelle.toLocaleLowerCase("fr")}. Merci à toute l’équipe !`,
    });
  }
  return constats;
}

/** Vue d'ensemble : le meilleur établissement du mois, jamais de classement ni de dernier. */
function etablissementEnForme(fiches: FicheConstats[], maintenant: Date): Constat[] {
  const { fenetreJours, avisMin, noteMin } = SEUILS.enForme;
  const debut = depuisJours(maintenant, fenetreJours);
  const actives = fiches
    .map((f) => {
      const notes = f.avis.filter((a) => a.dateCreation >= debut).map((a) => a.note);
      return { fiche: f, nombre: notes.length, moyenne: notes.reduce((s, n) => s + n, 0) / (notes.length || 1) };
    })
    .filter((f) => f.nombre > 0);
  // Il faut au moins deux établissements actifs pour que « le meilleur » veuille dire quelque chose.
  if (actives.length < 2) return [];
  const meilleur = [...actives].sort((a, b) => b.moyenne - a.moyenne || b.nombre - a.nombre)[0];
  if (meilleur.nombre < avisMin || meilleur.moyenne < noteMin) return [];
  return [
    {
      type: "en_forme",
      cle: "en_forme",
      locationId: meilleur.fiche.locationId,
      nombre: meilleur.nombre,
      intitule: "L’établissement en forme",
      titre: meilleur.fiche.nom,
      phrase: `${formaterNote(meilleur.moyenne)} sur ${meilleur.nombre} avis ces ${fenetreJours} derniers jours : la meilleure note de vos établissements.`,
      etablissement: null,
      themeId: null,
      partage: null,
    },
  ];
}

/** Toutes les fiches dont les critères sont remplis aujourd'hui. */
export function detecterConstats(fiches: FicheConstats[], maintenant: Date): Constat[] {
  const plusieurs = fiches.length > 1;
  const constats: Constat[] = plusieurs ? etablissementEnForme(fiches, maintenant) : [];
  for (const f of fiches) {
    const base: Base = { locationId: f.locationId, etablissement: plusieurs ? f.nom : null };
    constats.push(...sujetsQuiMontent(f.avis, base, maintenant), ...progres(f.avis, base, maintenant), ...motsPourLEquipe(f.avis, base, maintenant));
  }
  return constats;
}

function aMontrer(c: Constat, vus: ConstatVu[], maintenant: Date): boolean {
  const vu = vus.find((v) => v.locationId === c.locationId && v.cle === c.cle);
  if (!vu) return true;
  if (c.type === "sujet_monte" && c.nombre > vu.nombre) return true;
  return maintenant.getTime() - vu.vuAt.getTime() >= DELAI_JOURS[c.type] * JOUR_MS;
}

/**
 * Ce que la pile montre : une fiche par type au plus, par ordre de priorité,
 * sans dépasser la limite de la pile, puis le positif d'abord à l'écran.
 */
export function choisirConstats(candidats: Constat[], vus: ConstatVu[], maintenant: Date): Constat[] {
  const choisis: Constat[] = [];
  for (const type of PRIORITE) {
    const meilleur = candidats.filter((c) => c.type === type && aMontrer(c, vus, maintenant)).sort((a, b) => b.nombre - a.nombre)[0];
    if (meilleur && choisis.length < SEUILS.parPile) choisis.push(meilleur);
  }
  return choisis.sort((a, b) => ORDRE_AFFICHAGE.indexOf(a.type) - ORDRE_AFFICHAGE.indexOf(b.type));
}
