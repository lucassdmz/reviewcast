import { recalculerPourAvis } from "@/lib/analytics/recalcul";
import { prisma } from "@/lib/db/client";
import { resolveAiConfig, resolveLigneDeConduite } from "./config";
import { createProvider } from "./factory";
import { enregistrerUsage } from "./ledger";
import { statutApresAnalyse } from "./queue";
import { reviewAnalysisSchema, type ReviewAnalysisOutput } from "./schemas";
import { TAXONOMIE_INITIALE, normaliserLibelle } from "./taxonomy";
import type { AiProvider, ReviewForAi } from "./types";

/**
 * Orchestration IA côté serveur : charge l'avis, appelle le fournisseur,
 * valide, enregistre. Jamais appelé depuis le front.
 */

async function chargerAvis(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { location: { include: { settings: true } }, analysis: { include: { themes: { include: { theme: true } } } } },
  });
  if (!review) throw new Error(`Avis introuvable : ${reviewId}`);
  return review;
}

function versIa(review: { auteur: string; note: number; texte: string | null; dateCreation: Date; location: { nom: string } }): ReviewForAi {
  return {
    auteur: review.auteur,
    note: review.note,
    texte: review.texte,
    dateCreation: review.dateCreation,
    etablissement: review.location.nom,
  };
}

async function fournisseurPour(locationId: string): Promise<AiProvider> {
  return createProvider(await resolveAiConfig(locationId));
}

/** Crée les thèmes de la taxonomie s'ils n'existent pas encore. */
export async function initialiserTaxonomie(): Promise<void> {
  for (const theme of TAXONOMIE_INITIALE) {
    const libelle = normaliserLibelle(theme.libelle);
    await prisma.theme.upsert({
      where: { libelle },
      update: {},
      create: { libelle, polarite: theme.polarite, origine: "TAXONOMIE" },
    });
  }
}

/** Analyse un avis, stocke le résultat et met à jour son statut dans la file. */
export async function analyserAvis(reviewId: string, provider?: AiProvider): Promise<ReviewAnalysisOutput> {
  const review = await chargerAvis(reviewId);
  const ia = provider ?? (await fournisseurPour(review.locationId));
  const themesConnus = (await prisma.theme.findMany({ select: { libelle: true }, orderBy: { libelle: "asc" } })).map((t) => t.libelle);

  const { data, usage } = await ia.analyzeReview({ review: versIa(review), themesConnus });
  await enregistrerUsage("analyse", usage);
  await enregistrerAnalyse(reviewId, data, usage.modele);

  const statut = statutApresAnalyse(review, data, {
    inclureQuatreEtoiles: review.location.settings?.inclureQuatreEtoiles ?? true,
  });
  await prisma.review.update({ where: { id: reviewId }, data: { statut } });
  await recalculerPourAvis(reviewId);
  return data;
}

/** Stocke une analyse validée (appel direct ou résultat d'un lot). */
export async function enregistrerAnalyse(reviewId: string, data: ReviewAnalysisOutput, modele: string): Promise<void> {
  const analyse = reviewAnalysisSchema.parse(data);
  await prisma.$transaction(async (tx) => {
    await tx.reviewAnalysis.deleteMany({ where: { reviewId } });
    const created = await tx.reviewAnalysis.create({
      data: {
        reviewId,
        sentiment: analyse.sentiment,
        gravite: analyse.gravite,
        resume: analyse.resume,
        passagesCles: analyse.passages_cles,
        problemeDetecte: analyse.probleme_detecte,
        horsSujet: analyse.hors_sujet,
        modele,
      },
    });
    const vus = new Set<string>();
    for (const t of analyse.themes) {
      const libelle = normaliserLibelle(t.libelle);
      if (!libelle || vus.has(libelle)) continue;
      vus.add(libelle);
      const theme = await tx.theme.upsert({
        where: { libelle },
        update: {},
        create: { libelle, polarite: t.polarite, origine: "IA" },
      });
      await tx.reviewAnalysisTheme.create({ data: { analysisId: created.id, themeId: theme.id, polarite: t.polarite, passage: t.passage } });
    }
  });
}

/** Génère un brouillon de réponse (nouvelle version) et passe l'avis en « brouillon prêt ». */
export async function genererBrouillon(reviewId: string, consigne?: string, provider?: AiProvider) {
  const review = await chargerAvis(reviewId);
  const ia = provider ?? (await fournisseurPour(review.locationId));
  const ligneDeConduite = await resolveLigneDeConduite(review.locationId);
  const precedent = await prisma.draft.findFirst({ where: { reviewId }, orderBy: { version: "desc" } });

  const analyse: ReviewAnalysisOutput | null = review.analysis
    ? {
        sentiment: review.analysis.sentiment,
        gravite: review.analysis.gravite,
        resume: review.analysis.resume,
        themes: review.analysis.themes.map((t) => ({ libelle: t.theme.libelle, polarite: t.polarite, passage: t.passage })),
        passages_cles: review.analysis.passagesCles,
        probleme_detecte: review.analysis.problemeDetecte,
        hors_sujet: review.analysis.horsSujet,
      }
    : null;

  const { data, usage } = await ia.draftReply({
    review: versIa(review),
    analyse,
    ligneDeConduite,
    consigne,
    brouillonPrecedent: precedent?.texte,
  });
  await enregistrerUsage("brouillon", usage);

  const draft = await prisma.draft.create({
    data: {
      reviewId,
      texte: data.reponse,
      version: (precedent?.version ?? 0) + 1,
      consigne: consigne ?? null,
      modele: usage.modele,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
    },
  });
  if (review.statut === "A_TRAITER") {
    await prisma.review.update({ where: { id: reviewId }, data: { statut: "BROUILLON_PRET" } });
  }
  return draft;
}

/** Mot de remerciement pour un avis positif (publié en un tap au lot 4). */
export async function genererRemerciement(reviewId: string, provider?: AiProvider): Promise<string> {
  const review = await chargerAvis(reviewId);
  const ia = provider ?? (await fournisseurPour(review.locationId));
  const ligneDeConduite = await resolveLigneDeConduite(review.locationId);
  const { data, usage } = await ia.thankYouNote({ review: versIa(review), ligneDeConduite });
  await enregistrerUsage("remerciement", usage);
  return data.message;
}
