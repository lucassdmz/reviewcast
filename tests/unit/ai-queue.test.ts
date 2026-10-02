import { describe, expect, it } from "vitest";
import { statutApresAnalyse } from "@/lib/ai/queue";

const regles = { inclureQuatreEtoiles: true };
const base = { reponseGoogleTexte: null, statut: "HORS_FILE" as const };

describe("entrée dans la file « À traiter »", () => {
  it("met les avis 1 à 3 étoiles sans réponse dans la file", () => {
    for (const note of [1, 2, 3]) {
      expect(statutApresAnalyse({ ...base, note }, { probleme_detecte: false }, regles)).toBe("A_TRAITER");
    }
  });

  it("laisse les avis 5 étoiles hors de la file", () => {
    expect(statutApresAnalyse({ ...base, note: 5 }, { probleme_detecte: false }, regles)).toBe("HORS_FILE");
  });

  it("inclut un avis 4 étoiles seulement si un problème est détecté et le réglage l'autorise", () => {
    expect(statutApresAnalyse({ ...base, note: 4 }, { probleme_detecte: true }, regles)).toBe("A_TRAITER");
    expect(statutApresAnalyse({ ...base, note: 4 }, { probleme_detecte: false }, regles)).toBe("HORS_FILE");
    expect(statutApresAnalyse({ ...base, note: 4 }, { probleme_detecte: true }, { inclureQuatreEtoiles: false })).toBe("HORS_FILE");
  });

  it("marque publié un avis qui a déjà une réponse Google", () => {
    expect(statutApresAnalyse({ ...base, note: 1, reponseGoogleTexte: "Merci" }, { probleme_detecte: true }, regles)).toBe("PUBLIE");
  });

  it("ne réinitialise pas un avis ignoré ou dont le brouillon est prêt", () => {
    expect(statutApresAnalyse({ ...base, note: 1, statut: "IGNORE" }, { probleme_detecte: true }, regles)).toBe("IGNORE");
    expect(statutApresAnalyse({ ...base, note: 2, statut: "BROUILLON_PRET" }, { probleme_detecte: true }, regles)).toBe("BROUILLON_PRET");
  });
});
