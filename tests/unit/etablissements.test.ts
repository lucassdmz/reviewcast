import { describe, expect, it } from "vitest";
import { TOUS_LES_ETABLISSEMENTS, choisirActif, initiales, presenterEtablissement } from "@/lib/etablissements/actif";

const jacobins = { id: "a", nom: "The Coffee Jacobins" };
const brotteaux = { id: "b", nom: "The Coffee Brotteaux" };

describe("choisirActif", () => {
  it("affiche toujours l'unique établissement, quel que soit le cookie", () => {
    expect(choisirActif([jacobins], undefined)).toBe(jacobins);
    expect(choisirActif([jacobins], TOUS_LES_ETABLISSEMENTS)).toBe(jacobins);
    expect(choisirActif([jacobins], "inconnu")).toBe(jacobins);
  });

  it("affiche l'établissement choisi quand il y en a plusieurs", () => {
    expect(choisirActif([jacobins, brotteaux], "b")).toBe(brotteaux);
  });

  it("revient à la vue d'ensemble sans choix, ou si l'établissement choisi n'existe plus", () => {
    expect(choisirActif([jacobins, brotteaux], undefined)).toBeNull();
    expect(choisirActif([jacobins, brotteaux], TOUS_LES_ETABLISSEMENTS)).toBeNull();
    expect(choisirActif([jacobins, brotteaux], "supprime")).toBeNull();
  });

  it("ne renvoie rien sans établissement", () => {
    expect(choisirActif([], "a")).toBeNull();
  });
});

describe("presenterEtablissement", () => {
  it("donne le nom et l'adresse de l'établissement affiché", () => {
    expect(presenterEtablissement({ nom: "The Coffee Jacobins", adresse: "2 place des Jacobins, Lyon" }, 2)).toEqual({
      titre: "The Coffee Jacobins",
      detail: "2 place des Jacobins, Lyon",
    });
  });

  it("n'invente rien quand la fiche n'a pas d'adresse", () => {
    expect(presenterEtablissement({ nom: "The Coffee Jacobins", adresse: null }, 1).detail).toBeNull();
  });

  it("compte les établissements en vue d'ensemble", () => {
    expect(presenterEtablissement(null, 3)).toEqual({ titre: "Tous les établissements", detail: "3 établissements" });
  });
});

describe("initiales", () => {
  it("prend la première lettre du premier et du dernier mot", () => {
    expect(initiales("The Coffee Jacobins")).toBe("TJ");
  });

  it("prend une lettre d'un nom en un mot", () => {
    expect(initiales("zelios")).toBe("Z");
  });

  it("supporte un nom vide", () => {
    expect(initiales("  ")).toBe("?");
  });
});
