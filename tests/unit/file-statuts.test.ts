import { describe, expect, it } from "vitest";
import { TransitionInterditeError, transitionAutorisee, verifierTransition } from "@/lib/file/statuts";

describe("transitions de statut", () => {
  it("autorise le parcours normal : à traiter, brouillon prêt, publié", () => {
    expect(transitionAutorisee("A_TRAITER", "BROUILLON_PRET")).toBe(true);
    expect(transitionAutorisee("BROUILLON_PRET", "PUBLIE")).toBe(true);
    expect(transitionAutorisee("A_TRAITER", "PUBLIE")).toBe(true);
  });

  it("permet d'ignorer puis de remettre dans la file", () => {
    expect(transitionAutorisee("A_TRAITER", "IGNORE")).toBe(true);
    expect(transitionAutorisee("BROUILLON_PRET", "IGNORE")).toBe(true);
    expect(transitionAutorisee("IGNORE", "A_TRAITER")).toBe(true);
  });

  it("permet de remercier un avis positif hors file", () => {
    expect(transitionAutorisee("HORS_FILE", "PUBLIE")).toBe(true);
  });

  it("verrouille un avis publié", () => {
    for (const vers of ["A_TRAITER", "BROUILLON_PRET", "IGNORE", "HORS_FILE"] as const) {
      expect(transitionAutorisee("PUBLIE", vers)).toBe(false);
    }
    expect(() => verifierTransition("PUBLIE", "A_TRAITER")).toThrow(TransitionInterditeError);
    expect(() => verifierTransition("PUBLIE", "IGNORE")).toThrow(/publié/);
  });
});
