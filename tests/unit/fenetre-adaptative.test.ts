import { describe, expect, it } from "vitest";
import { AVIS_MIN_FENETRE, debutLecture, estRecent, fenetreAdaptative, LIBELLES_FENETRE } from "@/lib/fenetre/adaptative";

const maintenant = new Date("2026-10-28T10:00:00Z");
const JOUR = 86_400_000;
/** `n` avis, un par jour, le plus récent `depuis` jours avant maintenant. */
const avisQuotidiens = (n: number, depuis = 1) => Array.from({ length: n }, (_, i) => new Date(maintenant.getTime() - (depuis + i) * JOUR));

describe("fenêtre adaptative", () => {
  it("prend six semaines quand l'établissement reçoit assez d'avis", () => {
    const f = fenetreAdaptative(avisQuotidiens(AVIS_MIN_FENETRE), maintenant);
    expect(f.jours).toBe(42);
    expect(f.debut).toEqual(new Date(maintenant.getTime() - 42 * JOUR));
  });

  it("passe à deux mois quand six semaines ne suffisent pas", () => {
    // 9 avis dans les six semaines, le dixième à 50 jours.
    const dates = [...avisQuotidiens(AVIS_MIN_FENETRE - 1), new Date(maintenant.getTime() - 50 * JOUR)];
    expect(fenetreAdaptative(dates, maintenant).jours).toBe(60);
  });

  it("s'arrête à trois mois, même avec très peu d'avis", () => {
    expect(fenetreAdaptative(avisQuotidiens(3, 70), maintenant).jours).toBe(90);
    expect(fenetreAdaptative([], maintenant).jours).toBe(90);
  });

  it("ne compte ni les avis trop anciens ni ceux d'après la date de lecture", () => {
    const anciens = avisQuotidiens(30, 100);
    const futurs = Array.from({ length: 12 }, (_, i) => new Date(maintenant.getTime() + (i + 1) * JOUR));
    expect(fenetreAdaptative([...anciens, ...futurs], maintenant).jours).toBe(90);
  });

  it("dit la fenêtre en semaines ou en mois, jamais en jours", () => {
    expect(LIBELLES_FENETRE[42].dernieres).toBe("ces 6 dernières semaines");
    expect(LIBELLES_FENETRE[60].dernieres).toBe("ces 2 derniers mois");
    expect(LIBELLES_FENETRE[90].duree).toBe("3 mois");
  });

  it("range un avis selon la fenêtre de son propre établissement", () => {
    const fenetres = new Map([["suivi", { jours: 42 as const, debut: new Date(maintenant.getTime() - 42 * JOUR) }]]);
    const ilYa50Jours = new Date(maintenant.getTime() - 50 * JOUR);
    expect(estRecent({ locationId: "suivi", dateCreation: ilYa50Jours }, fenetres, maintenant)).toBe(false);
    expect(estRecent({ locationId: "inconnu", dateCreation: ilYa50Jours }, fenetres, maintenant)).toBe(true);
    expect(debutLecture(maintenant)).toEqual(new Date(maintenant.getTime() - 90 * JOUR));
  });
});
