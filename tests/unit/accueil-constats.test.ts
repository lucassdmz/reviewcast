import { describe, expect, it } from "vitest";
import { choisirConstats, detecterConstats, type AvisConstat, type Constat, type ConstatVu, type FicheConstats, type ThemeAvis } from "@/lib/accueil/constats/regles";

const maintenant = new Date("2026-11-02T08:00:00Z");
const ilYa = (jours: number) => new Date(maintenant.getTime() - jours * 86_400_000);
const attente: ThemeAvis = { themeId: "t-attente", libelle: "Attente", polarite: "NEGATIF" };
const accueil: ThemeAvis = { themeId: "t-accueil", libelle: "Accueil", polarite: "POSITIF" };

function avis(jours: number, themes: ThemeAvis[] = [], note = 4): AvisConstat {
  return { note, dateCreation: ilYa(jours), themes };
}
function repeter(n: number, jours: number, themes: ThemeAvis[] = [], note = 4): AvisConstat[] {
  return Array.from({ length: n }, () => avis(jours, themes, note));
}
function fiche(liste: AvisConstat[], nom = "Jacobins", locationId = "l1"): FicheConstats {
  return { locationId, nom, avis: liste };
}
const duType = (constats: Constat[], type: Constat["type"]) => constats.filter((c) => c.type === type);

describe("le sujet qui monte", () => {
  const reference = repeter(6, 30);

  it("se déclenche à 3 avis en 14 jours sur un sujet rare, sans parler d'une habitude qui n'existe pas", () => {
    const [c] = duType(detecterConstats([fiche([...reference, ...repeter(3, 5, [attente], 2)])], maintenant), "sujet_monte");
    expect(c).toMatchObject({ titre: "Attente", nombre: 3, themeId: "t-attente" });
    expect(c.phrase).toBe("3 avis en parlent ces 14 derniers jours, c’était rare jusqu’ici.");
  });

  it("reste muet à 2 avis, et quand le sujet ne dépasse pas le double de son rythme", () => {
    expect(duType(detecterConstats([fiche([...reference, ...repeter(2, 5, [attente], 2)])], maintenant), "sujet_monte")).toEqual([]);
    // 8 mentions en 8 semaines : 2 par quinzaine d'habitude, le double serait 4.
    const habituel = repeter(8, 30, [attente], 2);
    expect(duType(detecterConstats([fiche([...habituel, ...repeter(3, 5, [attente], 2)])], maintenant), "sujet_monte")).toEqual([]);
    expect(duType(detecterConstats([fiche([...habituel, ...repeter(4, 5, [attente], 2)])], maintenant), "sujet_monte")[0].phrase).toBe("4 avis en parlent ces 14 derniers jours, contre 2 d’habitude.");
  });

  it("ne se prononce pas sans assez d'histoire pour connaître l'habitude", () => {
    expect(duType(detecterConstats([fiche(repeter(5, 3, [attente], 2))], maintenant), "sujet_monte")).toEqual([]);
  });
});

describe("le progrès constaté", () => {
  it("compare des parts d'avis : 6 sur 12, puis 1 sur 10", () => {
    const liste = [...repeter(6, 120, [attente], 2), ...repeter(6, 120), avis(10, [attente], 2), ...repeter(9, 20)];
    const [c] = duType(detecterConstats([fiche(liste)], maintenant), "progres");
    expect(c.phrase).toBe("6 avis sur 12 en parlaient les 3 mois précédents, 1 sur 10 ces 3 derniers mois.");
  });

  it("dit « aucun » quand le sujet a disparu", () => {
    const [c] = duType(detecterConstats([fiche([...repeter(4, 120, [attente], 2), ...repeter(8, 20)])], maintenant), "progres");
    expect(c.phrase).toContain("aucun sur 8");
  });

  it("ne prend pas une baisse du nombre d'avis pour un progrès", () => {
    // 6 sur 30, puis 4 sur 8 : moins de mentions, mais une part plus forte.
    const liste = [...repeter(6, 120, [attente], 2), ...repeter(24, 120), ...repeter(4, 20, [attente], 2), ...repeter(4, 20)];
    expect(duType(detecterConstats([fiche(liste)], maintenant), "progres")).toEqual([]);
  });

  it("attend assez d'avis récents et un sujet vraiment installé", () => {
    expect(duType(detecterConstats([fiche([...repeter(6, 120, [attente], 2), ...repeter(7, 20)])], maintenant), "progres")).toEqual([]);
    expect(duType(detecterConstats([fiche([...repeter(3, 120, [attente], 2), ...repeter(8, 20)])], maintenant), "progres")).toEqual([]);
  });

  it("ne compte pas les avis pas encore analysés", () => {
    const nonAnalyses: AvisConstat[] = Array.from({ length: 8 }, () => ({ note: 4, dateCreation: ilYa(20), themes: null }));
    expect(duType(detecterConstats([fiche([...repeter(6, 120, [attente], 2), ...nonAnalyses])], maintenant), "progres")).toEqual([]);
  });
});

describe("le mot pour l'équipe", () => {
  it("se déclenche à 3 avis positifs en 7 jours, avec un texte à partager, sans prénom", () => {
    const [c] = duType(detecterConstats([fiche(repeter(3, 2, [accueil], 5))], maintenant), "mot_equipe");
    expect(c.partage).toBe("3 clients ont laissé un avis positif sur ce point ces 7 derniers jours : accueil. Merci à toute l’équipe !");
  });

  it("ne compte ni les avis plus anciens ni les avis mal notés", () => {
    const liste = [...repeter(2, 2, [accueil], 5), avis(9, [accueil], 5), avis(2, [accueil], 3)];
    expect(duType(detecterConstats([fiche(liste)], maintenant), "mot_equipe")).toEqual([]);
  });
});

describe("l'établissement en forme", () => {
  const autre = fiche(repeter(4, 5, [], 3), "Bastille", "l2");

  it("met en avant le meilleur, en vue d'ensemble", () => {
    const [c] = duType(detecterConstats([fiche(repeter(5, 5, [], 5)), autre], maintenant), "en_forme");
    expect(c).toMatchObject({ titre: "Jacobins", locationId: "l1" });
    expect(c.phrase).toBe("5,0 sur 5 avis ces 30 derniers jours : la meilleure note de vos établissements.");
  });

  it("n'apparaît pas sur un seul établissement, ni seul en activité", () => {
    expect(duType(detecterConstats([fiche(repeter(5, 5, [], 5))], maintenant), "en_forme")).toEqual([]);
    expect(duType(detecterConstats([fiche(repeter(5, 5, [], 5)), fiche([], "Bastille", "l2")], maintenant), "en_forme")).toEqual([]);
  });

  it("ne félicite ni une note faible ni trop peu d'avis", () => {
    expect(duType(detecterConstats([fiche(repeter(5, 5, [], 3)), fiche(repeter(4, 5, [], 2), "Bastille", "l2")], maintenant), "en_forme")).toEqual([]);
    expect(duType(detecterConstats([fiche(repeter(4, 5, [], 5)), autre], maintenant), "en_forme")).toEqual([]);
  });

  it("nomme l'établissement des autres fiches en vue d'ensemble seulement", () => {
    const liste = repeter(3, 2, [accueil], 5);
    expect(detecterConstats([fiche(liste), autre], maintenant).find((c) => c.type === "mot_equipe")?.etablissement).toBe("Jacobins");
    expect(detecterConstats([fiche(liste)], maintenant).find((c) => c.type === "mot_equipe")?.etablissement).toBeNull();
  });
});

describe("choisirConstats", () => {
  function constat(type: Constat["type"], nombre = 3, cle: string = type): Constat {
    return { type, cle, locationId: "l1", nombre, intitule: "", titre: "", phrase: "", etablissement: null, themeId: null, partage: null };
  }
  const vu = (cle: string, joursPasses: number, nombre = 3): ConstatVu => ({ locationId: "l1", cle, nombre, vuAt: ilYa(joursPasses) });

  it("garde deux fiches, le sujet qui monte en priorité, et le montre après le positif", () => {
    const choisis = choisirConstats([constat("en_forme"), constat("mot_equipe"), constat("progres"), constat("sujet_monte")], [], maintenant);
    expect(choisis.map((c) => c.type)).toEqual(["progres", "sujet_monte"]);
  });

  it("ne garde qu'une fiche par type, la plus forte", () => {
    const choisis = choisirConstats([constat("sujet_monte", 3, "a"), constat("sujet_monte", 5, "b")], [], maintenant);
    expect(choisis.map((c) => c.cle)).toEqual(["b"]);
  });

  it("ne répète pas une fiche vue avant son délai, et propose alors la suivante", () => {
    const choisis = choisirConstats([constat("mot_equipe", 5, "a"), constat("mot_equipe", 3, "b")], [vu("a", 13)], maintenant);
    expect(choisis.map((c) => c.cle)).toEqual(["b"]);
    expect(choisirConstats([constat("mot_equipe", 5, "a")], [vu("a", 14)], maintenant)).toHaveLength(1);
    expect(choisirConstats([constat("progres")], [vu("progres", 29)], maintenant)).toEqual([]);
    expect(choisirConstats([constat("progres")], [vu("progres", 30)], maintenant)).toHaveLength(1);
  });

  it("fait revenir plus tôt un sujet qui s'aggrave, mais pas les autres fiches", () => {
    expect(choisirConstats([constat("sujet_monte", 4)], [vu("sujet_monte", 2, 3)], maintenant)).toHaveLength(1);
    expect(choisirConstats([constat("sujet_monte", 3)], [vu("sujet_monte", 2, 3)], maintenant)).toEqual([]);
    expect(choisirConstats([constat("mot_equipe", 4)], [vu("mot_equipe", 2, 3)], maintenant)).toEqual([]);
  });

  it("une fiche vue ailleurs ne cache pas celle d'un autre établissement", () => {
    expect(choisirConstats([constat("progres")], [{ ...vu("progres", 1), locationId: "l2" }], maintenant)).toHaveLength(1);
  });

  it("ne renvoie rien quand aucun critère n'est rempli", () => {
    expect(choisirConstats([], [], maintenant)).toEqual([]);
  });
});
