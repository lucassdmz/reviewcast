import { describe, expect, it } from "vitest";
import { contexteAvis, formaterContexte, formaterContexteFile } from "@/lib/file/contexte";

const avis = [
  { note: 5, dateCreation: new Date("2026-07-20") },
  { note: 5, dateCreation: new Date("2026-09-02") },
  { note: 4, dateCreation: new Date("2026-09-10") },
  { note: 1, dateCreation: new Date("2026-09-15") },
  { note: 5, dateCreation: new Date("2026-09-28") },
  { note: 2, dateCreation: new Date("2026-10-01") },
];

describe("bandeau de contexte", () => {
  it("compte les avis des 40 jours qui précèdent l'avis, lui compris", () => {
    expect(contexteAvis(avis, new Date("2026-09-15"))).toEqual({ nbPositifs: 2, nbTotal: 3, noteMoyenne: 3.33 });
  });

  it("ne repart pas de zéro au changement de mois", () => {
    expect(contexteAvis(avis, new Date("2026-10-01"))).toEqual({ nbPositifs: 3, nbTotal: 5, noteMoyenne: 3.4 });
  });

  it("replace l'avis parmi les autres en une phrase simple", () => {
    expect(formaterContexte({ nbPositifs: 12, nbTotal: 17, noteMoyenne: 3.8 })).toBe(
      "Cet avis fait partie de 17 avis reçus en 40 jours, dont 12 de clients contents (4 ou 5 étoiles).",
    );
    expect(formaterContexte({ nbPositifs: 1, nbTotal: 2, noteMoyenne: 3 })).toBe(
      "Cet avis fait partie de 2 avis reçus en 40 jours, dont 1 d'un client content (4 ou 5 étoiles).",
    );
  });

  it("reste sobre sans avis positif ou quand l'avis est seul", () => {
    expect(formaterContexte({ nbPositifs: 0, nbTotal: 3, noteMoyenne: 2 })).toBe("Cet avis fait partie de 3 avis reçus en 40 jours.");
    expect(formaterContexte({ nbPositifs: 0, nbTotal: 1, noteMoyenne: 2 })).toBe("C'est le seul avis reçu en 40 jours.");
  });

  it("dit le climat récent une seule fois en tête de la file, ou se tait", () => {
    expect(formaterContexteFile({ nbPositifs: 12, nbTotal: 17, noteMoyenne: 3.8 })).toBe("12 clients contents sur 17 avis reçus ces 40 derniers jours.");
    expect(formaterContexteFile({ nbPositifs: 1, nbTotal: 3, noteMoyenne: 2.3 })).toBe("1 client content sur 3 avis reçus ces 40 derniers jours.");
    expect(formaterContexteFile({ nbPositifs: 0, nbTotal: 2, noteMoyenne: 1.5 })).toBeNull();
    expect(formaterContexteFile({ nbPositifs: 0, nbTotal: 0, noteMoyenne: null })).toBeNull();
  });
});
