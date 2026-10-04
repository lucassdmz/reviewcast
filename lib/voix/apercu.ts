import { resolveAiConfig, resolveLigneDeConduite } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/factory";
import { enregistrerUsage } from "@/lib/ai/ledger";
import type { ReviewAnalysisOutput } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/client";
import { avecSignature } from "./signature";

export interface ApercuVoix {
  auteur: string;
  note: number;
  extrait: string;
  reponse: string;
}

/**
 * Aperçu de la voix : un brouillon écrit avec les réglages enregistrés, sur le
 * dernier avis à traiter de l'établissement. Rien n'est stocké : le vrai
 * brouillon de cet avis n'est pas modifié.
 */
export async function apercuVoix(locationId: string): Promise<ApercuVoix | null> {
  const avis = await prisma.review.findFirst({
    where: { locationId, retireAt: null, note: { lte: 3 }, NOT: { texte: null } },
    orderBy: { dateCreation: "desc" },
    include: { location: { select: { nom: true } }, analysis: { include: { themes: { include: { theme: true } } } } },
  });
  if (!avis) return null;
  const analyse: ReviewAnalysisOutput | null = avis.analysis
    ? {
        sentiment: avis.analysis.sentiment,
        gravite: avis.analysis.gravite,
        resume: avis.analysis.resume,
        themes: avis.analysis.themes.map((t) => ({ libelle: t.theme.libelle, polarite: t.polarite, passage: t.passage })),
        passages_cles: avis.analysis.passagesCles,
        probleme_detecte: avis.analysis.problemeDetecte,
        hors_sujet: avis.analysis.horsSujet,
      }
    : null;
  try {
    const ia = createProvider(await resolveAiConfig(locationId));
    const ligneDeConduite = await resolveLigneDeConduite(locationId);
    const { data, usage } = await ia.draftReply({
      review: { auteur: avis.auteur, note: avis.note, texte: avis.texte, dateCreation: avis.dateCreation, etablissement: avis.location.nom },
      analyse,
      ligneDeConduite,
    });
    await enregistrerUsage("brouillon", usage);
    const texte = avis.texte ?? "";
    return {
      auteur: avis.auteur,
      note: avis.note,
      extrait: texte.length > 140 ? `${texte.slice(0, 139).trimEnd()}…` : texte,
      reponse: avecSignature(data.reponse, ligneDeConduite.voix?.signature ?? null),
    };
  } catch (error) {
    console.error("Aperçu de la voix indisponible :", error instanceof Error ? error.message : error);
    return null;
  }
}
