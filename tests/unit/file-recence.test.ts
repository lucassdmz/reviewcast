import { describe, expect, it } from "vitest";
import { partagerFile } from "@/lib/file/recence";

const maintenant = new Date("2026-10-04T10:00:00Z");
const avis = (id: string, date: string) => ({ id, dateCreation: new Date(date) });

describe("partage de la file entre récent et rattrapage", () => {
  it("garde dans l'actualité les avis des 40 derniers jours", () => {
    const { recents, rattrapage } = partagerFile(
      [avis("hier", "2026-10-03T10:00:00Z"), avis("limite", "2026-08-25T10:00:00Z"), avis("ancien", "2026-08-25T09:59:59Z"), avis("vieux", "2025-12-01T10:00:00Z")],
      maintenant,
    );
    expect(recents.map((a) => a.id)).toEqual(["hier", "limite"]);
    expect(rattrapage.map((a) => a.id)).toEqual(["ancien", "vieux"]);
  });

  it("ne perd aucun avis et conserve l'ordre", () => {
    const file = [avis("a", "2026-10-01T10:00:00Z"), avis("b", "2026-05-01T10:00:00Z"), avis("c", "2026-09-20T10:00:00Z")];
    const { recents, rattrapage } = partagerFile(file, maintenant);
    expect(recents.length + rattrapage.length).toBe(file.length);
    expect(recents.map((a) => a.id)).toEqual(["a", "c"]);
  });

  it("accepte une autre durée", () => {
    expect(partagerFile([avis("a", "2026-09-20T10:00:00Z")], maintenant, 7).rattrapage).toHaveLength(1);
  });
});
