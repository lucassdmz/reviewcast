import { describe, expect, it } from "vitest";
import {
  compterMots,
  draftReplySchema,
  monthlySummarySchema,
  reviewAnalysisSchema,
  synthesEnLignes,
} from "@/lib/ai/schemas";

const analyseValide = {
  sentiment: "NEGATIF",
  gravite: "FORTE",
  resume: "Le client a attendu une heure et le devis a doublé.",
  themes: [{ libelle: "délais", polarite: "NEGATIF", passage: "Attente de plus d'une heure" }],
  passages_cles: ["le devis avait doublé"],
  probleme_detecte: true,
  hors_sujet: false,
};

describe("schémas des sorties IA", () => {
  it("accepte une analyse conforme", () => {
    expect(reviewAnalysisSchema.safeParse(analyseValide).success).toBe(true);
  });

  it("refuse un sentiment inconnu ou trop de thèmes", () => {
    expect(reviewAnalysisSchema.safeParse({ ...analyseValide, sentiment: "COLERE" }).success).toBe(false);
    const tropDeThemes = Array.from({ length: 7 }, (_, i) => ({ libelle: `t${i}`, polarite: "MIXTE", passage: null }));
    expect(reviewAnalysisSchema.safeParse({ ...analyseValide, themes: tropDeThemes }).success).toBe(false);
  });

  it("borne la longueur des brouillons", () => {
    const mots = (n: number) => Array.from({ length: n }, () => "mot").join(" ");
    expect(draftReplySchema.safeParse({ reponse: mots(10) }).success).toBe(false);
    expect(draftReplySchema.safeParse({ reponse: mots(80) }).success).toBe(true);
    expect(draftReplySchema.safeParse({ reponse: mots(200) }).success).toBe(false);
  });

  it("rend la synthèse mensuelle en 5 lignes maximum", () => {
    const s = monthlySummarySchema.parse({ constats: ["a", "b", "c"], vigilance: "v", action: "x" });
    expect(synthesEnLignes(s)).toHaveLength(5);
    expect(monthlySummarySchema.safeParse({ constats: [], vigilance: "v", action: "x" }).success).toBe(false);
  });

  it("compte les mots en ignorant les espaces multiples", () => {
    expect(compterMots("  Bonjour   le  monde ")).toBe(3);
  });
});
