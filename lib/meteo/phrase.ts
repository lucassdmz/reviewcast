import type { Meteo } from "@/lib/db/generated/enums";
import { resolveAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/factory";
import { enregistrerUsage } from "@/lib/ai/ledger";
import type { AiProvider } from "@/lib/ai/types";
import { prisma } from "@/lib/db/client";

export interface DonneesPhrase {
  locationId: string | null;
  etablissement: string | null;
  /** Mois de rattachement pour le stockage de la phrase. */
  mois: Date;
  /** Période réellement couverte par les chiffres, telle qu'on la dit au modèle. */
  libellePeriode?: string;
  volume: number;
  nbEnthousiastes: number;
  noteMoyenne: number | null;
  meteo: Meteo;
  themesPositifs: string[];
  themesNegatifs: string[];
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function libelleMois(date: Date): string {
  return `${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Phrase calculée, sans IA : sert aux périodes autres que celle par défaut, dont la phrase n'est pas stockée. */
export function phraseFactuelle(d: { volume: number; nbEnthousiastes: number; themesPositifs: string[] }): string | null {
  if (d.volume === 0) return null;
  const pluriel = d.nbEnthousiastes > 1 ? "s" : "";
  const themes = d.themesPositifs.slice(0, 2);
  const suite = themes.length > 0 ? ` Les thèmes les plus cités : ${themes.join(" et ")}.` : "";
  return `${d.nbEnthousiastes} client${pluriel} content${pluriel} sur ${d.volume} avis.${suite}`;
}

/**
 * Phrase météo du mois (section 3.1) : stockée dans monthly_summaries et
 * régénérée seulement quand le volume d'avis du mois a changé. Sans avis,
 * aucune génération. En cas d'échec IA, la home s'affiche sans phrase.
 */
export async function phraseMeteoDuMois(donnees: DonneesPhrase, provider?: AiProvider): Promise<string | null> {
  const existante = await prisma.monthlySummary.findFirst({
    where: { locationId: donnees.locationId, mois: donnees.mois },
  });
  if (existante?.phrase && existante.volume === donnees.volume) return existante.phrase;
  if (donnees.volume === 0 || donnees.noteMoyenne === null) return null;

  let phrase: string | null = null;
  try {
    const ia = provider ?? createProvider(await resolveAiConfig(donnees.locationId));
    const { data, usage } = await ia.weatherSentence({
      etablissement: donnees.etablissement,
      mois: donnees.libellePeriode ?? libelleMois(donnees.mois),
      volume: donnees.volume,
      nbEnthousiastes: donnees.nbEnthousiastes,
      noteMoyenne: donnees.noteMoyenne,
      themesPositifs: donnees.themesPositifs,
      themesNegatifs: donnees.themesNegatifs,
    });
    await enregistrerUsage("meteo", usage);
    phrase = data.phrase;
  } catch (error) {
    console.error("Phrase météo indisponible :", error instanceof Error ? error.message : error);
    return existante?.phrase ?? null;
  }

  const valeurs = { phrase, meteo: donnees.meteo, noteMoyenne: donnees.noteMoyenne, volume: donnees.volume };
  if (existante) {
    await prisma.monthlySummary.update({ where: { id: existante.id }, data: valeurs });
  } else {
    await prisma.monthlySummary.create({ data: { locationId: donnees.locationId, mois: donnees.mois, ...valeurs } });
  }
  return phrase;
}
