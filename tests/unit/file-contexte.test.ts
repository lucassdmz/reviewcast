import { describe, expect, it } from "vitest";
import { contexteAvis, formaterContexte } from "@/lib/file/contexte";

const avis = [
  { note: 5, dateCreation: new Date("2026-09-02") },
  { note: 4, dateCreation: new Date("2026-09-10") },
  { note: 1, dateCreation: new Date("2026-09-15") },
  { note: 5, dateCreation: new Date("2026-09-28") },
  { note: 2, dateCreation: new Date("2026-10-01") },
];

describe("bandeau de contexte", () => {
  it("compte les avis positifs du mois civil de l'avis", () => {
    expect(contexteAvis(avis, new Date("2026-09-15"))).toEqual({ nbPositifs: 3, nbTotal: 4, noteMoyenne: 3.75 });
  });

  it("formule le contexte de façon positive et factuelle", () => {
    expect(formaterContexte({ nbPositifs: 19, nbTotal: 23, noteMoyenne: 4.6 })).toBe(
      "19 avis positifs sur 22 autres avis sur la même période, note moyenne du mois 4,6 ★.",
    );
    expect(formaterContexte({ nbPositifs: 1, nbTotal: 2, noteMoyenne: 3 })).toBe(
      "1 avis positif sur 1 autre avis sur la même période, note moyenne du mois 3,0 ★.",
    );
  });

  it("reste sobre quand l'avis est seul sur la période", () => {
    expect(formaterContexte({ nbPositifs: 0, nbTotal: 1, noteMoyenne: 2 })).toBe("Premier avis de la période.");
  });
});
