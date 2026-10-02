import { describe, expect, it } from "vitest";
import { parserDate, parserSelection, periodeTendances } from "@/lib/analytics/periodes";

const maintenant = new Date("2026-10-02T15:30:00Z");

describe("périodes de la page Tendances", () => {
  it("30 jours finissent aujourd'hui inclus et comparent aux 30 jours d'avant", () => {
    const p = periodeTendances("30j", maintenant);
    expect(p.debut).toEqual(new Date("2026-09-03T00:00:00Z"));
    expect(p.fin).toEqual(new Date("2026-10-03T00:00:00Z"));
    expect(p.precedente).toEqual({ debut: new Date("2026-08-04T00:00:00Z"), fin: new Date("2026-09-03T00:00:00Z") });
  });

  it("12 mois couvrent les 12 mois civils jusqu'au mois en cours", () => {
    const p = periodeTendances("12m", maintenant);
    expect(p.debut).toEqual(new Date("2025-11-01T00:00:00Z"));
    expect(p.fin).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(p.precedente.debut).toEqual(new Date("2024-11-01T00:00:00Z"));
  });

  it("la période personnalisée est bornée par deux dates incluses", () => {
    const p = periodeTendances("perso", maintenant, { debut: parserDate("2026-06-01"), fin: parserDate("2026-06-30") });
    expect(p.fin).toEqual(new Date("2026-07-01T00:00:00Z"));
    expect(p.precedente).toEqual({ debut: new Date("2026-05-02T00:00:00Z"), fin: new Date("2026-06-01T00:00:00Z") });
    expect(p.libelle).toMatch(/^du 1 juin 2026 au 30 juin 2026$/);
  });

  it("se replie sur 30 jours si la période personnalisée est invalide", () => {
    expect(periodeTendances("perso", maintenant, { debut: parserDate("2026-07-01"), fin: parserDate("2026-06-01") }).selection).toBe("30j");
    expect(parserDate("pas-une-date")).toBeNull();
    expect(parserSelection("n'importe quoi")).toBe("30j");
    expect(parserSelection("90j")).toBe("90j");
  });
});
