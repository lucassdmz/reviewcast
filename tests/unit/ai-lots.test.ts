import { describe, expect, it } from "vitest";
import {
  CONSERVATION_RESULTATS_MS,
  decouperEnLots,
  gereLesLots,
  lotExpire,
  LotIntrouvable,
  preparationAbandonnee,
  PREPARATION_MAX_MS,
  releverLot,
  type DepotLot,
  type FournisseurLots,
  type ResultatLot,
} from "@/lib/ai/lots";
import { FakeProvider } from "@/lib/ai/providers/fake";
import type { AiProvider, AiResult } from "@/lib/ai/types";
import type { ReviewAnalysisOutput } from "@/lib/ai/schemas";

const MAINTENANT = new Date("2026-10-30T10:00:00Z");
const LOT = { id: "lot", idFournisseur: "lot-chez-le-fournisseur", soumisLe: new Date("2026-10-30T09:00:00Z") };
const ANALYSE: AiResult<ReviewAnalysisOutput> = {
  data: { sentiment: "NEGATIF", gravite: "MOYENNE", resume: "Résumé.", themes: [], passages_cles: [], probleme_detecte: true, hors_sujet: false },
  usage: { modele: "m", tokensIn: 1, tokensOut: 1, cacheRead: 0, cacheWrite: 0 },
};

/** Dépôt en mémoire : les mêmes règles que la base, sans la base. */
function depotAvec(ids: string[]) {
  const enAttente = new Set(ids);
  const journal = { appliques: [] as string[], relaches: [] as string[], clos: [] as string[], usages: 0 };
  const depot: DepotLot = {
    avisEnAttente: async () => [...enAttente],
    appliquer: async (_l, id) => {
      journal.appliques.push(id);
      if (enAttente.delete(id)) journal.usages += 1;
    },
    relacher: async (_l, id) => {
      journal.relaches.push(id);
      enAttente.delete(id);
    },
    clore: async (_l, statut) => {
      journal.clos.push(statut);
    },
  };
  return { depot, journal, enAttente };
}

function fournisseur(termine: boolean, resultats: [string, ResultatLot][] = []): FournisseurLots {
  return {
    soumettreLotAnalyses: async () => LOT.idFournisseur,
    recupererLotAnalyses: async () => ({ termine, resultats: new Map(resultats) }),
  };
}

const OPTIONS = { echeance: Number.MAX_SAFE_INTEGER, maintenant: MAINTENANT };

describe("relevé d'un lot", () => {
  it("ne touche à rien tant que le lot tourne", async () => {
    const { depot, journal, enAttente } = depotAvec(["a"]);
    expect(await releverLot(LOT, fournisseur(false), depot, OPTIONS)).toEqual({ etat: "en-cours", appliques: 0, relaches: 0 });
    expect(journal.clos).toEqual([]);
    expect(enAttente.size).toBe(1);
  });

  it("applique les résultats et clôt le lot", async () => {
    const { depot, journal } = depotAvec(["a", "b"]);
    const r = await releverLot(LOT, fournisseur(true, [["a", ANALYSE], ["b", ANALYSE]]), depot, OPTIONS);
    expect(r).toEqual({ etat: "termine", appliques: 2, relaches: 0 });
    expect(journal.clos).toEqual(["TERMINE"]);
  });

  it("rend aux appels unitaires un avis en erreur ou sans résultat", async () => {
    const { depot, journal } = depotAvec(["ok", "erreur", "absent"]);
    const r = await releverLot(LOT, fournisseur(true, [["ok", ANALYSE], ["erreur", new Error("expired")]]), depot, OPTIONS);
    expect(r).toEqual({ etat: "termine", appliques: 1, relaches: 2 });
    expect(journal.relaches).toEqual(["erreur", "absent"]);
  });

  it("s'arrête à l'échéance, et le passage suivant reprend sans refaire ce qui est fait", async () => {
    const { depot, journal } = depotAvec(["a", "b", "c"]);
    const f = fournisseur(true, [["a", ANALYSE], ["b", ANALYSE], ["c", ANALYSE]]);
    let t = 0;
    const horloge = () => t++;
    const premier = await releverLot(LOT, f, depot, { echeance: 2, maintenant: MAINTENANT, horloge });
    expect(premier).toEqual({ etat: "partiel", appliques: 2, relaches: 0 });
    expect(journal.clos).toEqual([]);

    const second = await releverLot(LOT, f, depot, OPTIONS);
    expect(second).toEqual({ etat: "termine", appliques: 1, relaches: 0 });
    expect(journal.appliques).toEqual(["a", "b", "c"]);
    expect(journal.usages).toBe(3);
  });

  it("abandonne un lot que le fournisseur ne connaît plus, sans perdre ses avis", async () => {
    const { depot, journal } = depotAvec(["a"]);
    const perdu: FournisseurLots = {
      soumettreLotAnalyses: async () => "x",
      recupererLotAnalyses: async (id) => {
        throw new LotIntrouvable(id);
      },
    };
    expect((await releverLot(LOT, perdu, depot, OPTIONS)).etat).toBe("abandonne");
    expect(journal.relaches).toEqual(["a"]);
    expect(journal.clos).toEqual(["ABANDONNE"]);
  });

  it("abandonne un lot dont les résultats ont expiré, sans interroger le fournisseur", async () => {
    const { depot, journal } = depotAvec(["a"]);
    const interdit: FournisseurLots = {
      soumettreLotAnalyses: async () => "x",
      recupererLotAnalyses: async () => {
        throw new Error("ne doit pas être appelé");
      },
    };
    const ancien = { ...LOT, soumisLe: new Date(MAINTENANT.getTime() - CONSERVATION_RESULTATS_MS - 1) };
    expect((await releverLot(ancien, interdit, depot, OPTIONS)).etat).toBe("abandonne");
    expect(journal.clos).toEqual(["ABANDONNE"]);
  });

  it("laisse le lot en cours après une panne passagère", async () => {
    const { depot, journal, enAttente } = depotAvec(["a"]);
    const panne: FournisseurLots = {
      soumettreLotAnalyses: async () => "x",
      recupererLotAnalyses: async () => {
        throw new Error("503");
      },
    };
    await expect(releverLot(LOT, panne, depot, OPTIONS)).rejects.toThrow("503");
    expect(journal.clos).toEqual([]);
    expect(enAttente.size).toBe(1);
  });
});

describe("règles de durée", () => {
  it("découpe en lots de la taille demandée", () => {
    expect(decouperEnLots([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(decouperEnLots([])).toEqual([]);
  });

  it("repère une préparation abandonnée et un lot expiré", () => {
    expect(preparationAbandonnee(new Date(MAINTENANT.getTime() - PREPARATION_MAX_MS - 1), MAINTENANT)).toBe(true);
    expect(preparationAbandonnee(new Date(MAINTENANT.getTime() - 1000), MAINTENANT)).toBe(false);
    expect(lotExpire(new Date(MAINTENANT.getTime() - 1000), MAINTENANT)).toBe(false);
  });
});

describe("fournisseur simulé", () => {
  const input = { review: { auteur: "Ana", note: 2, texte: "Trop d'attente.", dateCreation: MAINTENANT, etablissement: "Café" }, themesConnus: [] };

  it("déclare gérer les lots, un fournisseur sans lots non", () => {
    expect(gereLesLots(new FakeProvider())).toBe(true);
    expect(gereLesLots({ nom: "OPENAI" } as unknown as AiProvider)).toBe(false);
  });

  it("rend le même résultat qu'un appel unitaire, d'une instance à l'autre", async () => {
    const id = await new FakeProvider().soumettreLotAnalyses([{ id: "a", input }]);
    const { termine, resultats } = await new FakeProvider().recupererLotAnalyses(id);
    expect(termine).toBe(true);
    expect(resultats.get("a")).toEqual(await new FakeProvider().analyzeReview(input));
  });

  it("ne connaît pas un lot perdu", async () => {
    await expect(new FakeProvider().recupererLotAnalyses("inconnu")).rejects.toBeInstanceOf(LotIntrouvable);
  });
});
