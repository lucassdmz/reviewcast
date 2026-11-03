import { describe, expect, it, vi } from "vitest";
import type { SummarizeInput } from "@/lib/ai/types";
import { choisirSynthese, empreinteSynthese, porteeSynthese, type LigneSynthese } from "@/lib/analytics/synthese-cle";
import { demanderSynthese } from "@/lib/analytics/synthese-contrat";
import { hrefDates, hrefPeriode, lireParametres } from "@/lib/analytics/requete";

const entree: SummarizeInput = {
  etablissement: "Le Comptoir",
  periode: "30 derniers jours",
  volume: 12,
  noteMoyenne: 4.42,
  noteMoyennePrecedente: 4.1,
  repartition: { "1": 0, "2": 1, "3": 1, "4": 4, "5": 6 },
  themesPositifs: [{ libelle: "accueil", nombre: 5 }],
  themesNegatifs: [{ libelle: "délais", nombre: 2 }],
  tauxReponse: 0.5,
};

const j = (s: string) => new Date(`${s}T00:00:00Z`);
const periode = { debut: j("2026-10-01"), fin: j("2026-10-11"), libelle: "du 1 oct. au 10 oct." };
const ligne = (l: Partial<LigneSynthese>): LigneSynthese => ({ debut: periode.debut, fin: periode.fin, libelle: periode.libelle, empreinte: "e1", texte: "texte", updatedAt: j("2026-10-20"), ...l });

describe("portée de la synthèse", () => {
  it("sépare les fiches et ne mélange pas les vues d'ensemble de deux comptes", () => {
    expect(porteeSynthese({ id: "a" }, [{ id: "a" }, { id: "b" }])).toBe("fiche:a");
    expect(porteeSynthese(null, [{ id: "a" }, { id: "b" }])).toBe(porteeSynthese(null, [{ id: "b" }, { id: "a" }]));
    expect(porteeSynthese(null, [{ id: "a" }])).not.toBe(porteeSynthese(null, [{ id: "b" }]));
  });
});

describe("empreinte des chiffres", () => {
  it("ne change pas quand seul le taux de réponse bouge : publier une réponse ne repaie pas la synthèse", () => {
    expect(empreinteSynthese({ ...entree, tauxReponse: 0.9 })).toBe(empreinteSynthese(entree));
  });
  it("ignore ce qui ne se voit pas à l'écran, au-delà du dixième", () => {
    expect(empreinteSynthese({ ...entree, noteMoyenne: 4.44 })).toBe(empreinteSynthese(entree));
  });
  it("change dès qu'un chiffre raconté change", () => {
    expect(empreinteSynthese({ ...entree, volume: 13 })).not.toBe(empreinteSynthese(entree));
    expect(empreinteSynthese({ ...entree, noteMoyenne: 4.6 })).not.toBe(empreinteSynthese(entree));
    expect(empreinteSynthese({ ...entree, periode: "3 derniers mois" })).not.toBe(empreinteSynthese(entree));
    expect(empreinteSynthese({ ...entree, themesNegatifs: [{ libelle: "délais", nombre: 3 }] })).not.toBe(empreinteSynthese(entree));
  });
});

describe("choix de la synthèse stockée", () => {
  it("deux périodes du même mois ne se confondent pas", () => {
    const autre = ligne({ fin: j("2026-10-21"), libelle: "du 1 oct. au 20 oct.", empreinte: "e2", texte: "autre" });
    const { ligne: choisie, aJour } = choisirSynthese([autre, ligne({})], periode, "e1");
    expect(choisie?.texte).toBe("texte");
    expect(aJour).toBe(true);
  });
  it("reprend sans payer les mêmes chiffres sur une période glissante décalée d'un jour", () => {
    const hier = ligne({ debut: j("2026-09-30"), fin: j("2026-10-10") });
    expect(choisirSynthese([hier], periode, "e1")).toEqual({ ligne: hier, aJour: true });
  });
  it("montre l'ancien texte de la période le temps que le nouveau arrive", () => {
    const { ligne: choisie, aJour } = choisirSynthese([ligne({ empreinte: "vieille" })], periode, "e1");
    expect(choisie?.empreinte).toBe("vieille");
    expect(aJour).toBe(false);
  });
  it("à défaut, montre la dernière du même libellé", () => {
    const vieille = ligne({ debut: j("2026-09-01"), empreinte: "x" });
    expect(choisirSynthese([vieille], periode, "e1")).toEqual({ ligne: vieille, aJour: false });
  });
  it("sans rien de stocké, il faut rédiger ; une ligne seulement réservée ne compte pas", () => {
    expect(choisirSynthese([], periode, "e1")).toEqual({ ligne: null, aJour: false });
    expect(choisirSynthese([ligne({ texte: null, empreinte: "e1" })], periode, "e1").aJour).toBe(false);
  });
});

describe("demande de la synthèse depuis l'écran", () => {
  const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });
  const pret = { etat: "prete", synthese: { lignes: ["a"], generee: "2026-11-02T10:00:00.000Z" } };
  const sansAttente = () => Promise.resolve();

  it("rend la synthèse prête", async () => {
    const appeler = vi.fn<typeof fetch>().mockResolvedValue(json(pret));
    expect(await demanderSynthese({ periode: "30j" }, appeler, sansAttente)).toEqual(pret);
  });
  it("dit hors ligne quand le réseau manque", async () => {
    const appeler = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    expect((await demanderSynthese({ periode: "30j" }, appeler, sansAttente)).etat).toBe("hors_ligne");
  });
  it("relit quand une rédaction est déjà en cours, sans forcer de nouveau", async () => {
    const appeler = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ etat: "en_cours", synthese: null })).mockResolvedValueOnce(json(pret));
    expect((await demanderSynthese({ periode: "30j", forcer: true }, appeler, sansAttente)).etat).toBe("prete");
    expect(JSON.parse(String(appeler.mock.calls[1][1]?.body)).forcer).toBe(false);
  });
  it("n'attend jamais sans limite", async () => {
    const appeler = vi.fn<typeof fetch>().mockImplementation(async () => json({ etat: "en_cours", synthese: null }));
    expect((await demanderSynthese({ periode: "30j" }, appeler, sansAttente)).etat).toBe("indisponible");
    expect(appeler.mock.calls.length).toBeLessThanOrEqual(21);
  });
  it("traite une erreur ou une réponse illisible comme indisponible", async () => {
    expect((await demanderSynthese({ periode: "30j" }, vi.fn<typeof fetch>().mockResolvedValue(json({}, 500)), sansAttente)).etat).toBe("indisponible");
    expect((await demanderSynthese({ periode: "30j" }, vi.fn<typeof fetch>().mockResolvedValue(json({ etat: "n'importe" })), sansAttente)).etat).toBe("indisponible");
  });
});

describe("adresses de période", () => {
  it("sont relues à l'identique", () => {
    expect(lireParametres({ periode: "90j" }).periode.selection).toBe(hrefPeriode("90j").split("=")[1]);
    const params = Object.fromEntries(new URLSearchParams(hrefDates("2026-01-01", "2026-03-31").split("?")[1]));
    expect(lireParametres(params).requete).toBe("periode=perso&debut=2026-01-01&fin=2026-03-31");
  });
});
