import type { Meteo } from "@/lib/db/generated/enums";
import { prisma } from "@/lib/db/client";
import {
  compterThemes,
  courbeHebdomadaire,
  douzeMoisGlissants,
  evolution,
  FENETRE_METEO_JOURS,
  debutDuMois,
  fenetreGlissante,
  fenetrePrecedente,
  statsPeriode,
  type PointCourbe,
} from "./agregation";
import { SEUILS_PAR_DEFAUT, calculerMeteo, type SeuilsMeteo } from "./calcul";
import { choisirCompliment, type Compliment } from "./compliment";
import { phraseMeteoDuMois } from "./phrase";

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
    where: { ...filtreLocation, retireAt: null, dateCreation: { gte: periode12.debut, lt: periode12.fin } },
    select: {
      auteur: true,
      note: true,
      texte: true,
      dateCreation: true,
      analysis: { select: { passagesCles: true, themes: { select: { polarite: true, theme: { select: { libelle: true } } } } } },
    },
  });
  // La météo se lit sur une fenêtre glissante, pas sur le mois calendaire.
  const mois = fenetreGlissante(maintenant);
  // Seuls les avis récents sont comptés : les anciens restés sans réponse sont du rattrapage, pas une alerte.
  const aTraiter = await prisma.review.count({
    where: { ...filtreLocation, retireAt: null, statut: { in: ["A_TRAITER", "BROUILLON_PRET"] }, dateCreation: { gte: mois.debut } },
  });
  const ceMois = statsPeriode(avis, mois);
  const avant = statsPeriode(avis, fenetrePrecedente(maintenant));
  const douzeMois = statsPeriode(avis, periode12);
  const seuils = seuilsDepuis(actif?.settings ?? (etablissements.length === 1 ? etablissements[0].settings : null));
  const meteo = calculerMeteo(ceMois.noteMoyenne, ceMois.partEnthousiastes, seuils);

  const themes = compterThemes(avis.filter((a) => a.dateCreation >= mois.debut && a.dateCreation < mois.fin));
  const phrase = await phraseMeteoDuMois({
    locationId: actif?.id ?? null,
    etablissement: actif?.nom ?? null,
    mois: debutDuMois(maintenant),
    libellePeriode: `les ${FENETRE_METEO_JOURS} derniers jours`,
    volume: ceMois.volume,
    nbEnthousiastes: ceMois.nbEnthousiastes,
    noteMoyenne: ceMois.noteMoyenne,
    meteo,
    themesPositifs: themes.positifs,
    themesNegatifs: themes.negatifs,
  });

  return {
    etablissements: etablissements.map(({ id, nom }) => ({ id, nom })),
    etablissementActif: actif ? { id: actif.id, nom: actif.nom } : null,
    meteo,
    noteMoyenneMois: ceMois.noteMoyenne,
    noteMoyenne12Mois: douzeMois.noteMoyenne,
    volumeMois: ceMois.volume,
    nbEnthousiastes: ceMois.nbEnthousiastes,
    evolutionNote: evolution(ceMois.noteMoyenne, avant.noteMoyenne),
    evolutionVolume: avant.volume > 0 || ceMois.volume > 0 ? ceMois.volume - avant.volume : null,
    courbe: courbeHebdomadaire(avis, maintenant),
    phrase,
    compliment: choisirCompliment(
      avis.map((a) => ({ auteur: a.auteur, note: a.note, texte: a.texte, passagesCles: a.analysis?.passagesCles ?? [], dateCreation: a.dateCreation })),
      tirage,
    ),
    aTraiter,
  };
}
