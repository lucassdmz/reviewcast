import { describe, expect, it } from "vitest";
import { SEUILS_PAR_DEFAUT, calculerMeteo } from "@/lib/meteo/calcul";

describe("calcul de la météo", () => {
  it("grand soleil à partir de 4,7 et 90 % d'enthousiastes", () => {
    expect(calculerMeteo(4.7, 90)).toBe("GRAND_SOLEIL");
    expect(calculerMeteo(4.9, 89)).toBe("SOLEIL_VOILE");
    expect(calculerMeteo(4.64, 100)).toBe("SOLEIL_VOILE");
  });

  it("soleil voilé à partir de 4,3, nuageux à partir de 3,8, pluie légère en dessous", () => {
    expect(calculerMeteo(4.3, 70)).toBe("SOLEIL_VOILE");
    expect(calculerMeteo(4.24, 70)).toBe("NUAGEUX");
    expect(calculerMeteo(3.8, 50)).toBe("NUAGEUX");
    expect(calculerMeteo(3.74, 50)).toBe("PLUIE_LEGERE");
    expect(calculerMeteo(1, 0)).toBe("PLUIE_LEGERE");
  });

  it("reste neutre sans avis", () => {
    expect(calculerMeteo(null, null)).toBe("SOLEIL_VOILE");
  });

  it("respecte des seuils personnalisés", () => {
    const seuils = { ...SEUILS_PAR_DEFAUT, grandSoleilNote: 4.5, grandSoleilPart: 80 };
    expect(calculerMeteo(4.5, 80, seuils)).toBe("GRAND_SOLEIL");
    expect(calculerMeteo(4.5, 80)).toBe("SOLEIL_VOILE");
  });

  it("juge la note telle qu'elle est affichée, à une décimale", () => {
    expect(calculerMeteo(3.79, 70)).toBe("NUAGEUX");
    expect(calculerMeteo(3.74, 70)).toBe("PLUIE_LEGERE");
    expect(calculerMeteo(4.26, 80)).toBe("SOLEIL_VOILE");
  });
});
