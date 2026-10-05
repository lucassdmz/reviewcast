import { describe, expect, it } from "vitest";
import { TOUS_LES_ETABLISSEMENTS, choisirActif, initiales } from "@/lib/etablissements/actif";

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

describe("initiales", () => {
  it("prend la première lettre du premier et du dernier mot", () => {
    expect(initiales("The Coffee Jacobins")).toBe("TJ");
  });

  it("prend deux lettres d'un nom en un mot", () => {
    expect(initiales("éclaircie")).toBe("ÉC");
  });

  it("supporte un nom vide", () => {
    expect(initiales("  ")).toBe("?");
  });
});
