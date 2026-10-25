import { describe, expect, it } from "vitest";
import {
  choisirReconquete,
  choisirSourire,
  effetSurLaNote,
  ilYA,
  initiales,
  noteAffichee,
  raisonsPriorite,
  scorePriorite,
  sujetQuiRevient,
  texteDeCarte,
  type CandidatReconquete,
} from "@/lib/accueil/rituel";

const maintenant = new Date("2026-10-19T08:40:00Z");
const ilYaHeures = (h: number) => new Date(maintenant.getTime() - h * 3_600_000);

function candidat(partiel: Partial<CandidatReconquete>): CandidatReconquete {
  return { id: "a", auteur: "Claire M.", note: 2, texte: "Accueil froid.", dateCreation: ilYaHeures(3), gravite: null, resume: null, sujet: null, brouillon: null, ...partiel };
}

describe("noteAffichee", () => {
  it("arrondit la moyenne à une décimale, comme Google", () => {
    expect(noteAffichee([5, 5, 4, 3])).toBe(4.3);
    expect(noteAffichee([])).toBeNull();
  });
});

describe("effetSurLaNote", () => {
  it("donne la moyenne sans l'avis puis avec lui", () => {
    expect(effetSurLaNote([5, 5, 5, 2], 2)).toEqual({ avant: 5, apres: 4.25 });
  });
  it("ne dit rien quand l'avis est seul", () => {
    expect(effetSurLaNote([1], 1)).toBeNull();
  });
});

describe("priorité de la cliente à reconquérir", () => {
  it("fait passer un avis grave, long et sur un sujet qui revient avant un avis bref", () => {
    const grave = candidat({ id: "grave", gravite: "FORTE", texte: "x".repeat(420), sujet: "la tablette" });
    const bref = candidat({ id: "bref", note: 3, gravite: "FAIBLE", texte: "Bof." });
    const occurrences = new Map([["la tablette", 3]]);
    expect(scorePriorite(grave, occurrences, maintenant)).toBeGreaterThan(scorePriorite(bref, occurrences, maintenant));
    expect(choisirReconquete([bref, grave], occurrences, maintenant)?.id).toBe("grave");
  });
  it("garde un plancher de fraîcheur : un avis d'un mois compte encore", () => {
    const ancien = candidat({ dateCreation: ilYaHeures(24 * 60) });
    expect(scorePriorite(ancien, new Map(), maintenant)).toBeGreaterThan(0);
  });
  it("explique son choix en mots courts", () => {
    const c = candidat({ texte: `${"y".repeat(210)} Pourquoi ?`, sujet: "la tablette" });
    expect(raisonsPriorite(c, new Map([["la tablette", 2]]), maintenant)).toEqual(["Récent", "Détaillé, bien visible", "Sujet qui revient", "Pose une question"]);
  });
  it("ne choisit rien sans candidat", () => {
    expect(choisirReconquete([], new Map(), maintenant)).toBeNull();
  });
});

describe("sujetQuiRevient", () => {
  it("retient le sujet le plus fréquent, à partir de deux avis", () => {
    expect(sujetQuiRevient(new Map([["le prix", 2], ["la tablette", 3], ["l'attente", 1]]))).toEqual({ sujet: "la tablette", nombre: 3 });
    expect(sujetQuiRevient(new Map([["le prix", 1]]))).toBeNull();
  });
});

describe("choisirSourire", () => {
  const base = { auteur: "Thomas", passagesCles: [], dateCreation: ilYaHeures(20) };
  it("ne prend que des 5 étoiles avec un vrai texte", () => {
    const choix = choisirSourire(
      [
        { ...base, id: "court", note: 5, texte: "Top" },
        { ...base, id: "quatre", note: 4, texte: "Très bon café, un peu d'attente." },
        { ...base, id: "bon", note: 5, texte: "Le cortado au lait d'avoine est incroyable." },
      ],
      0,
    );
    expect(choix?.id).toBe("bon");
  });
  it("renvoie null sans candidat", () => {
    expect(choisirSourire([], 0.5)).toBeNull();
  });
});

describe("mise en forme des cartes", () => {
  it("coupe un long avis en fin de phrase", () => {
    const texte = `${"Phrase un, assez longue pour compter. ".repeat(6)}Fin.`;
    const coupe = texteDeCarte(texte, 120);
    expect(coupe.length).toBeLessThanOrEqual(120);
    expect(coupe.endsWith(".")).toBe(true);
  });
  it("donne des initiales et une date relative", () => {
    expect(initiales("Claire M.")).toBe("CM");
    expect(ilYA(ilYaHeures(3), maintenant)).toBe("Il y a 3 h");
    expect(ilYA(ilYaHeures(26), maintenant)).toBe("Hier");
    expect(ilYA(ilYaHeures(24 * 5), maintenant)).toBe("Il y a 5 jours");
  });
});
