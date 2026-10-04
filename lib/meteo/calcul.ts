import type { Meteo } from "@/lib/db/generated/enums";

/** Seuils météo (section 3.1), modifiables dans Réglages. */
export interface SeuilsMeteo {
  grandSoleilNote: number;
  grandSoleilPart: number;
  soleilVoileNote: number;
  nuageuxNote: number;
}

export const SEUILS_PAR_DEFAUT: SeuilsMeteo = {
  grandSoleilNote: 4.7,
  grandSoleilPart: 90,
  soleilVoileNote: 4.3,
  nuageuxNote: 3.8,
};

/**
 * Calcule la météo d'une période depuis la note moyenne et la part d'avis
 * 4-5 étoiles (en pourcentage). Sans avis, le ciel est voilé : ni alarme, ni promesse.
 */
export function calculerMeteo(
  noteMoyenne: number | null,
  partEnthousiastes: number | null,
  seuils: SeuilsMeteo = SEUILS_PAR_DEFAUT,
): Meteo {
  if (noteMoyenne === null || partEnthousiastes === null) return "SOLEIL_VOILE";
  // On compare la note telle qu'elle est affichée, à une décimale : un 3,79
  // se lit « 3,8 » à l'écran et doit donner la météo d'un 3,8.
  const note = Math.round(noteMoyenne * 10) / 10;
  if (note >= seuils.grandSoleilNote && partEnthousiastes >= seuils.grandSoleilPart) return "GRAND_SOLEIL";
  if (note >= seuils.soleilVoileNote) return "SOLEIL_VOILE";
  if (note >= seuils.nuageuxNote) return "NUAGEUX";
  return "PLUIE_LEGERE";
}

export const METEO_LIBELLES: Record<Meteo, { icone: string; libelle: string; description: string }> = {
  GRAND_SOLEIL: { icone: "☀️", libelle: "Grand soleil", description: "Vos clients sont enthousiastes." },
  SOLEIL_VOILE: { icone: "🌤️", libelle: "Soleil voilé", description: "Un climat largement positif." },
  NUAGEUX: { icone: "☁️", libelle: "Nuageux", description: "Quelques points méritent votre attention." },
  PLUIE_LEGERE: { icone: "🌦️", libelle: "Pluie légère", description: "Un mois à prendre avec recul : chaque réponse compte." },
};
