import { describe, expect, it } from "vitest";
import { insererMercisArrives, type Carte } from "@/lib/accueil/rituel";

const c = (type: string) => ({ type }) as Carte;
const types = (l: Carte[]) => l.map((x) => x.type);
const aJour = [c("sourire"), c("mercis"), c("constat")];

describe("les mercis rejoignent la pile en cours", () => {
  it("se placent avant les constats", () => {
    expect(types(insererMercisArrives([c("sourire"), c("reconquete"), c("constat")], 0, aJour))).toEqual(["sourire", "reconquete", "mercis", "constat"]);
  });
  it("ne remplacent jamais la carte sous les yeux", () => {
    expect(types(insererMercisArrives([c("sourire"), c("constat"), c("constat")], 1, aJour))).toEqual(["sourire", "constat", "mercis", "constat"]);
  });
  it("laissent intacte une pile terminée ou qui a déjà ses mercis", () => {
    const finie = [c("sourire")];
    expect(insererMercisArrives(finie, 1, aJour)).toBe(finie);
    const dejaLa = [c("mercis")];
    expect(insererMercisArrives(dejaLa, 0, aJour)).toBe(dejaLa);
  });
  it("garnissent une pile vide", () => {
    expect(types(insererMercisArrives([], 0, aJour))).toEqual(["mercis"]);
  });
  it("ne changent rien sans mercis arrivés : la même référence évite tout rendu de plus", () => {
    const pile = [c("sourire")];
    expect(insererMercisArrives(pile, 0, [c("sourire")])).toBe(pile);
  });
});
