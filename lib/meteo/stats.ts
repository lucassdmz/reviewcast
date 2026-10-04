import type { Meteo } from "@/lib/db/generated/enums";
import { prisma } from "@/lib/db/client";
import {
  compterThemes,
  courbeHebdomadaire,
  douzeMoisGlissants,
  evolution,
  FENETRE_FILE_JOURS,
  debutDuMois,
  fenetreGlissante,
  fenetrePrecedente,
  statsPeriode,
  type PointCourbe,
} from "./agregation";
import { SEUILS_PAR_DEFAUT, calculerMeteo, type SeuilsMeteo } from "./calcul";
import { choisirCompliment, type Compliment } from "./compliment";
import { JOURS_PERIODE, LIBELLES_PERIODE, PERIODE_METEO_PAR_DEFAUT, type PeriodeMeteo } from "./periodes";
import { phraseFactuelle, phraseMeteoDuMois } from "./phrase";

export interface EtablissementResume {
  id: string;
  nom: string;
}

/** Tout ce que l'écran Home affiche, déjà calculé (section 3.1). */
export interface MeteoHome {
  etablissements: EtablissementResume[];
  etablissementActif: EtablissementResume | null;
  meteo: Meteo;
  noteMoyenneMois: number | null;
  noteMoyenne12Mois: number | null;
  /** Période choisie pour la météo. */
  periode: PeriodeMeteo;
  /** Troisième repère de la carte : une autre échelle de temps que la période affichée. */
  repere: { libelle: string; note: number | null };
  volumeMois: number;
  nbEnthousiastes: number;
  evolutionNote: number | null;
  evolutionVolume: number | null;
  courbe: PointCourbe[];
  phrase: string | null;
  compliment: Compliment | null;
  aTraiter: number;
}

function seuilsDepuis(settings: {
  seuilGrandSoleilNote: { toNumber(): number };
  seuilGrandSoleilPart: number;
  seuilSoleilVoileNote: { toNumber(): number };
  seuilNuageuxNote: { toNumber(): number };
} | null): SeuilsMeteo {
  if (!settings) return SEUILS_PAR_DEFAUT;
  return {
    grandSoleilNote: settings.seuilGrandSoleilNote.toNumber(),
    grandSoleilPart: settings.seuilGrandSoleilPart,
    soleilVoileNote: settings.seuilSoleilVoileNote.toNumber(),
    nuageuxNote: settings.seuilNuageuxNote.toNumber(),
  };
}

/**
 * Calcule la météo de la home pour un établissement, ou pour tous si
 * `locationId` est null. `tirage` sert au compliment du moment.
 */
export async function obtenirMeteoHome(
  locationId: string | null,
  periode: PeriodeMeteo = PERIODE_METEO_PAR_DEFAUT,
  maintenant = new Date(),
  tirage = Math.random(),
): Promise<MeteoHome> {
  const etablissements = await prisma.location.findMany({
    select: { id: true, nom: true, settings: true },
    orderBy: { nom: "asc" },
  });
  const actif = locationId ? (etablissements.find((e) => e.id === locationId) ?? null) : null;
  const filtreLocation = actif ? { locationId: actif.id } : {};
  const periode12 = douzeMoisGlissants(maintenant);

  const avis = await prisma.review.findMany({
    // Deux ans d'avis : de quoi comparer la période choisie, jusqu'à 12 mois, à la précédente.
    where: { ...filtreLocation, retireAt: null, dateCreation: { gte: new Date(maintenant.getTime() - 731 * 86_400_000), lt: periode12.fin } },
    select: {
      auteur: true,
      note: true,
      texte: true,
      dateCreation: true,
      analysis: { select: { passagesCles: true, themes: { select: { polarite: true, theme: { select: { libelle: true } } } } } },
    },
  });
  // La météo se lit sur une fenêtre glissante, pas sur le mois calendaire.
  const jours = JOURS_PERIODE[periode];
  const mois = fenetreGlissante(maintenant, jours);
  // Seuls les avis récents sont comptés : les anciens restés sans réponse sont du rattrapage, pas une alerte.
  const aTraiter = await prisma.review.count({
    where: {
      ...filtreLocation,
      retireAt: null,
      statut: { in: ["A_TRAITER", "BROUILLON_PRET"] },
      dateCreation: { gte: fenetreGlissante(maintenant, FENETRE_FILE_JOURS).debut },
    },
  });
  const ceMois = statsPeriode(avis, mois);
  const avant = statsPeriode(avis, fenetrePrecedente(maintenant, jours));
  const douzeMois = statsPeriode(avis, periode12);
  const seuils = seuilsDepuis(actif?.settings ?? (etablissements.length === 1 ? etablissements[0].settings : null));
  const meteo = calculerMeteo(ceMois.noteMoyenne, ceMois.partEnthousiastes, seuils);

  const themes = compterThemes(avis.filter((a) => a.dateCreation >= mois.debut && a.dateCreation < mois.fin));
  // Seule la phrase de la période par défaut est rédigée par l'IA et stockée ; les autres sont calculées.
  const phrase =
    periode === PERIODE_METEO_PAR_DEFAUT
      ? await phraseMeteoDuMois({
          locationId: actif?.id ?? null,
          etablissement: actif?.nom ?? null,
          mois: debutDuMois(maintenant),
          libellePeriode: LIBELLES_PERIODE[periode].long,
          volume: ceMois.volume,
          nbEnthousiastes: ceMois.nbEnthousiastes,
          noteMoyenne: ceMois.noteMoyenne,
          meteo,
          themesPositifs: themes.positifs,
          themesNegatifs: themes.negatifs,
        })
      : phraseFactuelle({ volume: ceMois.volume, nbEnthousiastes: ceMois.nbEnthousiastes, themesPositifs: themes.positifs });
  const repere =
    periode === "12m"
      ? { libelle: "Sur 3 mois", note: statsPeriode(avis, fenetreGlissante(maintenant, JOURS_PERIODE["3m"])).noteMoyenne }
      : { libelle: "Sur 12 mois", note: douzeMois.noteMoyenne };

  return {
    etablissements: etablissements.map(({ id, nom }) => ({ id, nom })),
    etablissementActif: actif ? { id: actif.id, nom: actif.nom } : null,
    meteo,
    noteMoyenneMois: ceMois.noteMoyenne,
    noteMoyenne12Mois: douzeMois.noteMoyenne,
    periode,
    repere,
    volumeMois: ceMois.volume,
    nbEnthousiastes: ceMois.nbEnthousiastes,
    evolutionNote: evolution(ceMois.noteMoyenne, avant.noteMoyenne),
    // Sans avis sur la période précédente, il n'y a rien à comparer : pas de « +57 » trompeur.
    evolutionVolume: avant.volume > 0 ? ceMois.volume - avant.volume : null,
    courbe: courbeHebdomadaire(avis, maintenant),
    phrase,
    compliment: choisirCompliment(
      avis.map((a) => ({ auteur: a.auteur, note: a.note, texte: a.texte, passagesCles: a.analysis?.passagesCles ?? [], dateCreation: a.dateCreation })),
      tirage,
    ),
    aTraiter,
  };
}
