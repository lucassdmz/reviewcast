import type { Polarite } from "@/lib/db/generated/enums";
import {
  draftReplySchema,
  monthlySummarySchema,
  reviewAnalysisSchema,
  thankYouSchema,
  weatherSentenceSchema,
  type ReviewAnalysisOutput,
} from "../schemas";
import { reglesPourThemes } from "@/lib/voix/reglages";
import { TAXONOMIE_INITIALE } from "../taxonomy";
import type {
  AiProvider,
  AiResult,
  AnalyzeReviewInput,
  DraftReplyInput,
  SummarizeInput,
  ThankYouInput,
  WeatherSentenceInput,
} from "../types";

/**
 * Fournisseur simulé, déterministe et sans réseau : tests, données de
 * démonstration et développement local sans clé API.
 */
const MOTS_CLES: Record<string, string[]> = {
  accueil: ["accueil", "accueill", "sourire", "aimable", "agréable", "chaleureux", "désagréable", "froid"],
  délais: ["attente", "attendu", "retard", "délai", "long", "heure"],
  qualité: ["qualité", "bon", "excellent", "délicieux", "mauvais", "défaut", "cassé", "abîmé"],
  prix: ["prix", "cher", "tarif", "euros", "€", "rapport qualité"],
  propreté: ["propre", "sale", "propreté", "hygiène"],
  communication: ["réponse", "appel", "mail", "information", "prévenu", "joignable"],
  SAV: ["sav", "garantie", "remboursement", "réclamation", "service après"],
  rapidité: ["rapide", "rapidité", "efficace", "vite"],
  conseil: ["conseil", "conseillé", "expliqué", "compétent"],
};

function detecterThemes(texte: string, note: number): ReviewAnalysisOutput["themes"] {
  const bas = texte.toLowerCase();
  const polarite: Polarite = note >= 4 ? "POSITIF" : note <= 2 ? "NEGATIF" : "MIXTE";
  const themes: ReviewAnalysisOutput["themes"] = [];
  for (const { libelle } of TAXONOMIE_INITIALE) {
    const mot = MOTS_CLES[libelle]?.find((m) => bas.includes(m));
    if (mot) themes.push({ libelle, polarite, passage: extrairePhrase(texte, mot) });
    if (themes.length === 6) break;
  }
  return themes;
}

function extrairePhrase(texte: string, mot: string): string | null {
  const phrase = texte.split(/(?<=[.!?])\s+/).find((p) => p.toLowerCase().includes(mot));
  return phrase?.trim() ?? null;
}

function usage(modele: string) {
  return { modele, tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0 };
}

export class FakeProvider implements AiProvider {
  readonly nom = "FAKE" as const;

  async analyzeReview(input: AnalyzeReviewInput): Promise<AiResult<ReviewAnalysisOutput>> {
    const { note, texte } = input.review;
    const contenu = texte ?? "";
    const themes = detecterThemes(contenu, note);
    const horsSujet = contenu.length > 0 && /crypto|bitcoin|gagnez|cliquez|http/i.test(contenu);
    const sentiment = note >= 4 ? "POSITIF" : note === 3 ? "MIXTE" : "NEGATIF";
    const probleme = note <= 3 || (note === 4 && /mais|dommage|bémol|déçu/i.test(contenu));
    const data = reviewAnalysisSchema.parse({
      sentiment,
      gravite: probleme ? (note <= 1 ? "FORTE" : note === 2 ? "MOYENNE" : "FAIBLE") : null,
      resume: contenu ? `Avis ${note} étoiles évoquant ${themes[0]?.libelle ?? "l'expérience générale"}.` : `Avis ${note} étoiles sans texte.`,
      themes,
      passages_cles: themes.map((t) => t.passage).filter((p): p is string => !!p).slice(0, 5),
      probleme_detecte: probleme,
      hors_sujet: horsSujet,
    });
    return { data, usage: usage("fake") };
  }

  async draftReply(input: DraftReplyInput): Promise<AiResult<{ reponse: string }>> {
    const { auteur, etablissement } = input.review;
    const theme = input.analyse?.themes[0]?.libelle ?? "votre expérience";
    const court = /court/i.test(input.consigne ?? "") || input.ligneDeConduite.voix?.longueur === "COURTE";
    const geste = /geste/i.test(input.consigne ?? "");
    const voix = input.ligneDeConduite.voix;
    const je = voix?.personne === "JE";
    const regle = voix ? reglesPourThemes(voix.regles, input.analyse?.themes.map((t) => t.libelle) ?? []).find((r) => r.dire) : undefined;
    const suite = voix?.contact
      ? `Vous pouvez ${je ? "m'" : "nous "}écrire à ${voix.contact}, ${je ? "je vous répondrai" : "nous vous répondrons"} rapidement.`
      : `N'hésitez pas à venir ${je ? "m'" : "nous "}en parler au comptoir lors de votre prochain passage.`;
    const phrases = (
      je
        ? [
            `Bonjour ${auteur}, merci d'avoir pris le temps de m'écrire.`,
            `Je regrette sincèrement que ${theme} n'ait pas été à la hauteur de vos attentes lors de votre passage chez ${etablissement}.`,
            regle ? regle.dire : court ? "" : "Vos remarques me sont précieuses et j'en ai parlé avec l'équipe pour que cela ne se reproduise pas.",
            geste
              ? "J'aurais plaisir à vous accueillir à nouveau et à vous offrir un geste pour me faire pardonner."
              : "J'aimerais en discuter directement avec vous afin de trouver ensemble une solution.",
            court ? "" : suite,
          ]
        : [
            `Bonjour ${auteur}, merci d'avoir pris le temps de nous écrire.`,
            `Nous sommes sincèrement désolés que ${theme} n'ait pas été à la hauteur de vos attentes lors de votre passage chez ${etablissement}.`,
            regle ? regle.dire : court ? "" : "Vos remarques sont précieuses et nous les avons partagées avec l'équipe pour que cela ne se reproduise pas.",
            geste
              ? "Nous serions heureux de vous accueillir à nouveau et de vous offrir un geste pour nous faire pardonner."
              : "Nous aimerions en discuter directement avec vous afin de trouver ensemble une solution.",
            court ? "" : suite,
          ]
    ).filter(Boolean);
    return { data: draftReplySchema.parse({ reponse: phrases.join(" ") }), usage: usage("fake") };
  }

  async thankYouNote(input: ThankYouInput): Promise<AiResult<{ message: string }>> {
    const theme = input.review.texte ? (detecterThemes(input.review.texte, input.review.note)[0]?.libelle ?? "votre visite") : "votre visite";
    const message = `Merci ${input.review.auteur} pour ce retour qui touche toute l'équipe, ravie que ${theme} vous ait plu. Au plaisir de vous revoir bientôt !`;
    return { data: thankYouSchema.parse({ message }), usage: usage("fake") };
  }

  async weatherSentence(input: WeatherSentenceInput): Promise<AiResult<{ phrase: string }>> {
    const themes = input.themesPositifs.slice(0, 2).join(" et ") || "l'expérience générale";
    const pluriel = input.nbEnthousiastes > 1 ? "s" : "";
    const phrase = `${input.nbEnthousiastes} client${pluriel} content${pluriel} sur ${input.volume} avis. Ils citent surtout ${themes}.`;
    return { data: weatherSentenceSchema.parse({ phrase }), usage: usage("fake") };
  }

  async summarize(input: SummarizeInput): Promise<AiResult<{ constats: string[]; vigilance: string; action: string }>> {
    const data = monthlySummarySchema.parse({
      constats: [
        `${input.volume} avis reçus sur ${input.periode}, note moyenne ${input.noteMoyenne.toFixed(1)}.`,
        `Ce qui plaît : ${input.themesPositifs.map((t) => t.libelle).slice(0, 3).join(", ") || "rien de marquant"}.`,
      ],
      vigilance: input.themesNegatifs[0] ? `${input.themesNegatifs[0].libelle} revient dans ${input.themesNegatifs[0].nombre} avis.` : "aucun problème récurrent.",
      action: input.themesNegatifs[0] ? `Faire un point d'équipe sur ${input.themesNegatifs[0].libelle}.` : "Continuer à répondre à chaque avis.",
    });
    return { data, usage: usage("fake") };
  }
}
