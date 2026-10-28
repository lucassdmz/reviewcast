import { describe, expect, it } from "vitest";
import type { Fenetre } from "@/lib/fenetre/adaptative";
import { partagerFile } from "@/lib/file/recence";

const maintenant = new Date("2026-10-04T10:00:00Z");
const avis = (id: string, date: string, locationId = "calme") => ({ id, locationId, dateCreation: new Date(date) });
const fenetres = new Map<string, Fenetre>([
  ["suivi", { jours: 42, debut: new Date("2026-08-23T10:00:00Z") }],
  ["calme", { jours: 90, debut: new Date("2026-07-06T10:00:00Z") }],
]);

describe("partage de la file entre récent et rattrapage", () => {
  it("garde dans l'actualité les avis entrés dans la fenêtre de leur établissement", () => {
    const { recents, rattrapage } = partagerFile(
      [
        avis("hier", "2026-10-03T10:00:00Z", "suivi"),
        avis("limite", "2026-08-23T10:00:00Z", "suivi"),
        avis("ancien", "2026-08-23T09:59:59Z", "suivi"),
        avis("calme-aout", "2026-08-01T10:00:00Z", "calme"),
        avis("vieux", "2025-12-01T10:00:00Z", "calme"),
      ],
      fenetres,
      maintenant,
    );
    expect(recents.map((a) => a.id)).toEqual(["hier", "limite", "calme-aout"]);
    expect(rattrapage.map((a) => a.id)).toEqual(["ancien", "vieux"]);
  });

  it("ne perd aucun avis et conserve l'ordre", () => {
    const file = [avis("a", "2026-10-01T10:00:00Z"), avis("b", "2026-05-01T10:00:00Z"), avis("c", "2026-09-20T10:00:00Z")];
    const { recents, rattrapage } = partagerFile(file, fenetres, maintenant);
    expect(recents.length + rattrapage.length).toBe(file.length);
    expect(recents.map((a) => a.id)).toEqual(["a", "c"]);
  });

  it("lit sur trois mois un établissement dont la fenêtre n'est pas connue", () => {
    const { recents, rattrapage } = partagerFile([avis("x", "2026-07-10T10:00:00Z", "nouveau"), avis("y", "2026-06-01T10:00:00Z", "nouveau")], fenetres, maintenant);
    expect(recents.map((a) => a.id)).toEqual(["x"]);
    expect(rattrapage.map((a) => a.id)).toEqual(["y"]);
  });
});
