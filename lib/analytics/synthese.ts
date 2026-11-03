import { resolveAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/factory";
import { enregistrerUsage } from "@/lib/ai/ledger";
import { synthesEnLignes } from "@/lib/ai/schemas";
import type { AiProvider } from "@/lib/ai/types";
import { prisma } from "@/lib/db/client";
import type { ReponseSynthese, SyntheseTendances } from "./synthese-contrat";
import { RESERVATION_SYNTHESE_MS, choisirSynthese, empreinteSynthese, entreeSynthese, porteeSynthese, type LigneSynthese } from "./synthese-cle";
import type { Tendances } from "./tendances";

/**
 * Synthèse de la période (section 3.3) : 5 lignes maximum, rédigée par l'IA et
 * stockée par période réelle. La lecture n'appelle jamais l'IA : une page
 * s'affiche avec ce qui est stocké, et le navigateur demande ensuite la
 * rédaction (app/api/tendances/synthese) si elle est nécessaire.
 */

export interface EtatSynthese {
  synthese: SyntheseTendances | null;
  /** Vrai s'il faut rédiger : aucune synthèse, ou des chiffres qui ont changé depuis. */
  aRediger: boolean;
}

function versSynthese(ligne: LigneSynthese | null): SyntheseTendances | null {
  return ligne?.texte ? { lignes: ligne.texte.split("\n"), generee: ligne.updatedAt.toISOString() } : null;
}

/** Lit ce qui est stocké pour ces chiffres. Aucun appel à l'IA. */
export async function lireSynthese(t: Tendances): Promise<EtatSynthese> {
  const entree = entreeSynthese(t);
  if (!entree) return { synthese: null, aRediger: false };
  const empreinte = empreinteSynthese(entree);
  const { debut, fin, libelle } = t.periode;
  const lignes = await prisma.synthesePeriode.findMany({
    where: { portee: porteeSynthese(t.etablissement, t.etablissements), texte: { not: null }, OR: [{ debut, fin }, { empreinte }, { libelle }] },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const { ligne, aJour } = choisirSynthese(lignes, t.periode, empreinte);
  return { synthese: versSynthese(ligne), aRediger: !aJour };
}

/**
 * Rédige la synthèse si elle n'est pas à jour, ou à la demande (`forcer`). Une
 * réservation en base garantit qu'une même période n'est jamais payée deux fois
 * en même temps : deux onglets, ou un rechargement pendant la rédaction.
 */
export async function redigerSynthese(t: Tendances, forcer = false, provider?: AiProvider): Promise<ReponseSynthese> {
  const entree = entreeSynthese(t);
  if (!entree) return { etat: "vide", synthese: null };
  const etat = await lireSynthese(t);
  if (!forcer && !etat.aRediger) return { etat: "prete", synthese: etat.synthese };

  const locationId = t.etablissement?.id ?? null;
  const portee = porteeSynthese(t.etablissement, t.etablissements);
  const { debut, fin, libelle } = t.periode;
  const cle = { portee, debut, fin };
  await prisma.synthesePeriode.createMany({ data: [{ ...cle, locationId, libelle }], skipDuplicates: true });
  const { count } = await prisma.synthesePeriode.updateMany({
    where: { ...cle, OR: [{ reserveeAt: null }, { reserveeAt: { lt: new Date(Date.now() - RESERVATION_SYNTHESE_MS) } }] },
    data: { reserveeAt: new Date() },
  });
  if (count === 0) return { etat: "en_cours", synthese: etat.synthese };

  try {
    const ia = provider ?? createProvider(await resolveAiConfig(locationId));
    const { data, usage } = await ia.summarize(entree);
    await enregistrerUsage("synthese", usage);
    const lignes = synthesEnLignes(data);
    const enregistree = await prisma.synthesePeriode.update({
      where: { portee_debut_fin: cle },
      data: { texte: lignes.join("\n"), empreinte: empreinteSynthese(entree), libelle, reserveeAt: null },
    });
    return { etat: "prete", synthese: versSynthese(enregistree) };
  } catch (error) {
    console.error("Synthèse indisponible :", error instanceof Error ? error.message : error);
    await prisma.synthesePeriode.update({ where: { portee_debut_fin: cle }, data: { reserveeAt: null } });
    return { etat: "indisponible", synthese: etat.synthese };
  }
}
