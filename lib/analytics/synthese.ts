import { resolveAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/factory";
import { enregistrerUsage } from "@/lib/ai/ledger";
import { synthesEnLignes } from "@/lib/ai/schemas";
import type { AiProvider } from "@/lib/ai/types";
import { prisma } from "@/lib/db/client";
import { calculerMeteo } from "@/lib/meteo/calcul";
import type { Tendances } from "./tendances";

/**
 * Synthèse de la période (section 3.3) : 5 lignes maximum, générée par l'IA
 * et stockée dans monthly_summaries sur le mois de début de la période.
 * Régénérée seulement à la demande ou si le volume a changé.
 */
export interface SyntheseTendances {
  lignes: string[];
  generee: Date;
}

export async function syntheseTendances(t: Tendances, forcer = false, provider?: AiProvider): Promise<SyntheseTendances | null> {
  const locationId = t.etablissement?.id ?? null;
  const mois = new Date(Date.UTC(t.periode.debut.getUTCFullYear(), t.periode.debut.getUTCMonth(), 1));
  const existante = await prisma.monthlySummary.findFirst({ where: { locationId, mois } });
  if (!forcer && existante?.texte && existante.volume === t.repartition.volume) {
    return { lignes: existante.texte.split("\n"), generee: existante.updatedAt };
  }
  if (t.repartition.volume === 0 || t.repartition.noteMoyenne === null) return null;

  let lignes: string[];
  try {
    const ia = provider ?? createProvider(await resolveAiConfig(locationId));
    const { data, usage } = await ia.summarize({
      etablissement: t.etablissement?.nom ?? null,
      periode: t.periode.libelle,
      volume: t.repartition.volume,
      noteMoyenne: t.repartition.noteMoyenne,
      noteMoyennePrecedente: t.precedente.noteMoyenne,
      repartition: t.repartition.etoiles,
      themesPositifs: t.positifs.map((p) => ({ libelle: p.libelle, nombre: p.nombre })),
      themesNegatifs: t.negatifs.map((p) => ({ libelle: p.libelle, nombre: p.nombre })),
      tauxReponse: t.reactivite.tauxReponse === null ? null : t.reactivite.tauxReponse / 100,
    });
    await enregistrerUsage("synthese", usage);
    lignes = synthesEnLignes(data);
  } catch (error) {
    console.error("Synthèse indisponible :", error instanceof Error ? error.message : error);
    return existante?.texte ? { lignes: existante.texte.split("\n"), generee: existante.updatedAt } : null;
  }

  const part = t.repartition.volume ? ((t.repartition.etoiles["4"] + t.repartition.etoiles["5"]) / t.repartition.volume) * 100 : null;
  const valeurs = {
    texte: lignes.join("\n"),
    meteo: calculerMeteo(t.repartition.noteMoyenne, part),
    noteMoyenne: t.repartition.noteMoyenne,
    volume: t.repartition.volume,
  };
  const enregistree = existante
    ? await prisma.monthlySummary.update({ where: { id: existante.id }, data: valeurs })
    : await prisma.monthlySummary.create({ data: { locationId, mois, ...valeurs } });
  return { lignes, generee: enregistree.updatedAt };
}
