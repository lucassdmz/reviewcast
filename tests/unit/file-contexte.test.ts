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
  it("lit un établissement calme sur trois mois, jusqu'à l'avis compris", () => {
    expect(contexteAvis(avis, new Date("2026-09-15"))).toEqual({ nbPositifs: 3, nbTotal: 4, noteMoyenne: 3.75, jours: 90 });
  });

  it("ne repart pas de zéro au changement de mois", () => {
    expect(contexteAvis(avis, new Date("2026-10-01"))).toEqual({ nbPositifs: 4, nbTotal: 6, noteMoyenne: 3.67, jours: 90 });
  });

  it("lit un établissement très suivi sur six semaines", () => {
    const parJour = Array.from({ length: 12 }, (_, i) => ({ note: i === 0 ? 1 : 5, dateCreation: new Date(Date.UTC(2026, 8, 20 + i)) }));
    const c = contexteAvis([...avis, ...parJour], new Date("2026-10-01T12:00:00Z"));
    expect(c.jours).toBe(42);
    expect(c.nbTotal).toBe(17);
  });

  it("replace l'avis parmi les autres en une phrase simple", () => {
    expect(formaterContexte({ nbPositifs: 12, nbTotal: 17, noteMoyenne: 3.8, jours: 42 })).toBe(
      "Cet avis fait partie de 17 avis reçus en 6 semaines, dont 12 de clients contents (4 ou 5 étoiles).",
    );
    expect(formaterContexte({ nbPositifs: 1, nbTotal: 2, noteMoyenne: 3, jours: 60 })).toBe(
      "Cet avis fait partie de 2 avis reçus en 2 mois, dont 1 d'un client content (4 ou 5 étoiles).",
    );
  });

  it("reste sobre sans avis positif ou quand l'avis est seul", () => {
    expect(formaterContexte({ nbPositifs: 0, nbTotal: 3, noteMoyenne: 2, jours: 90 })).toBe("Cet avis fait partie de 3 avis reçus en 3 mois.");
    expect(formaterContexte({ nbPositifs: 0, nbTotal: 1, noteMoyenne: 2, jours: 90 })).toBe("C'est le seul avis reçu en 3 mois.");
  });

  it("dit le climat récent une seule fois en tête de la file, ou se tait", () => {
    expect(formaterContexteFile({ nbPositifs: 12, nbTotal: 17, noteMoyenne: 3.8, jours: 42 })).toBe("12 clients contents sur 17 avis reçus ces 6 dernières semaines.");
    expect(formaterContexteFile({ nbPositifs: 1, nbTotal: 3, noteMoyenne: 2.3, jours: 90 })).toBe("1 client content sur 3 avis reçus ces 3 derniers mois.");
    expect(formaterContexteFile({ nbPositifs: 0, nbTotal: 2, noteMoyenne: 1.5, jours: 90 })).toBeNull();
    expect(formaterContexteFile({ nbPositifs: 0, nbTotal: 0, noteMoyenne: null, jours: 90 })).toBeNull();
  });
});
