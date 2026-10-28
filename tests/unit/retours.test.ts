import { describe, expect, it } from "vitest";
import { reconnaitreEcran } from "@/lib/retours/ecrans";
import { decrireElement, elementSignificatif, resumerElement, selecteurDe, type NoeudDom } from "@/lib/retours/element";
import { estGlissement, lirePreferences, placerApresGlissement, PREFERENCES_PAR_DEFAUT } from "@/lib/retours/preferences";
import { captureValide, retourSchema } from "@/lib/retours/validation";

/** Petit DOM factice : la description d'un élément se vérifie sans navigateur. */
function noeud(tagName: string, attributs: Record<string, string> = {}, enfants: NoeudDom[] = [], texte?: string): NoeudDom {
  const n: NoeudDom = {
    tagName: tagName.toUpperCase(),
    id: attributs.id ?? "",
    parentElement: null,
    children: enfants,
    get textContent() {
      return texte ?? enfants.map((e) => e.textContent ?? "").join(" ");
    },
    getAttribute: (nom) => attributs[nom] ?? null,
    classList: { contains: (c) => (attributs.class ?? "").split(" ").includes(c) },
    querySelector: (selecteur) => {
      const balises = selecteur.split(",").map((s) => s.trim().toUpperCase());
      const chercher = (liste: ArrayLike<NoeudDom>): NoeudDom | null => {
        for (let i = 0; i < liste.length; i++) {
          if (balises.includes(liste[i].tagName)) return liste[i];
          const trouve = chercher(liste[i].children);
          if (trouve) return trouve;
        }
        return null;
      };
      return chercher(enfants);
    },
  };
  for (const e of enfants) e.parentElement = n;
  return n;
}

describe("écran d'une remarque", () => {
  it("nomme les écrans fixes, sans tenir compte des paramètres", () => {
    expect(reconnaitreEcran("/")).toEqual({ gabarit: "/", libelle: "Accueil" });
    expect(reconnaitreEcran("/tendances?periode=3m")).toEqual({ gabarit: "/tendances", libelle: "Tendances" });
    expect(reconnaitreEcran("/a-traiter/")).toEqual({ gabarit: "/a-traiter", libelle: "À traiter" });
    expect(reconnaitreEcran("/a-traiter/historique").libelle).toBe("Réponses publiées");
  });

  it("regroupe les fiches d'avis et les thèmes sous un même gabarit", () => {
    expect(reconnaitreEcran("/a-traiter/cm123abc")).toEqual({ gabarit: "/a-traiter/[id]", libelle: "Fiche d’un avis" });
    expect(reconnaitreEcran("/tendances/theme/42?sens=plait").gabarit).toBe("/tendances/theme/[id]");
  });

  it("nomme les sections des réglages et garde l'adresse pour un écran inconnu", () => {
    expect(reconnaitreEcran("/reglages/ton")).toEqual({ gabarit: "/reglages/ton", libelle: "Réglages › Ton" });
    expect(reconnaitreEcran("/reglages/apparence").libelle).toBe("Réglages › Apparence");
    expect(reconnaitreEcran("/ailleurs/x")).toEqual({ gabarit: "/ailleurs/x", libelle: "/ailleurs/x" });
  });
});

describe("élément montré du doigt", () => {
  const icone = noeud("svg");
  const libelle = noeud("span", {}, [], "Publier la réponse");
  const bouton = noeud("button", {}, [icone, libelle]);
  const titre = noeud("h2", {}, [], "Avis de Marie");
  const espace = noeud("div");
  const carte = noeud("section", { class: "bloc sticker" }, [titre, espace, bouton]);
  const main = noeud("main", {}, [carte]);

  it("remonte de l'icône ou du texte jusqu'au bouton", () => {
    expect(elementSignificatif(icone)).toBe(bouton);
    expect(elementSignificatif(libelle)).toBe(bouton);
  });

  it("remonte d'un espace vide jusqu'à la carte", () => {
    expect(elementSignificatif(espace)).toBe(carte);
  });

  it("construit un sélecteur ancré sur main ou sur un identifiant", () => {
    expect(selecteurDe(bouton)).toBe("main > section:nth-of-type(1) > button:nth-of-type(1)");
    const ancre = noeud("div", { id: "file:1" }, [noeud("p")]);
    expect(selecteurDe(ancre.children[0])).toBe("#file\\:1 > p:nth-of-type(1)");
    expect(main.tagName).toBe("MAIN");
  });

  it("décrit l'élément et le résume en une ligne", () => {
    const d = decrireElement(bouton, { x: 10.4, y: 20.6, largeur: 100, hauteur: 44 });
    expect(d).toMatchObject({ balise: "button", texte: "Publier la réponse", contexte: "Avis de Marie", rect: { x: 10, y: 21, largeur: 100, hauteur: 44 } });
    expect(resumerElement(d)).toBe("bouton « Publier la réponse » dans « Avis de Marie »");
  });

  it("situe l'élément dans sa propre carte, jamais dans la voisine", () => {
    const voisine = noeud("div", { class: "sticker" }, [noeud("h2", {}, [], "25 clients contents")]);
    const partager = noeud("button", {}, [], "Partager avec l’équipe");
    const pile = noeud("div", { class: "sticker" }, [noeud("p", {}, [], "Le sourire d’abord"), noeud("p", {}, [], "« Très bon café »"), partager]);
    noeud("main", {}, [noeud("div", {}, [voisine, pile])]);
    const d = decrireElement(partager, { x: 0, y: 0, largeur: 1, hauteur: 1 });
    expect(d.contexte).toBe("Le sourire d’abord « Très bon café » Partager avec l’équipe");
    const ligne = { ...pile, innerText: "Le sourire d’abord\n« Très bon café »\nPartager" };
    partager.parentElement = ligne;
    expect(decrireElement(partager, { x: 0, y: 0, largeur: 1, hauteur: 1 }).contexte).toBe("Le sourire d’abord");
  });

  it("hors de toute carte, situe l'élément par le titre de l'écran", () => {
    const lien = noeud("a", {}, [], "Voir tout");
    noeud("main", {}, [noeud("h1", {}, [], "Tendances"), noeud("div", {}, [lien])]);
    expect(decrireElement(lien, { x: 0, y: 0, largeur: 1, hauteur: 1 }).contexte).toBe("Tendances");
  });

  it("préfère le libellé accessible au texte affiché", () => {
    const fermer = noeud("button", { "aria-label": "Fermer" }, [], "×");
    expect(decrireElement(fermer, { x: 0, y: 0, largeur: 1, hauteur: 1 }).texte).toBe("Fermer");
  });
});

describe("préférences de la bulle", () => {
  it("démarre rangée contre le bord, pour ne rien cacher", () => {
    expect(PREFERENCES_PAR_DEFAUT.etat).toBe("rangee");
  });

  it("retombe sur les valeurs par défaut si le stockage est vide ou abîmé", () => {
    expect(lirePreferences(null)).toEqual(PREFERENCES_PAR_DEFAUT);
    expect(lirePreferences("{pas du json")).toEqual(PREFERENCES_PAR_DEFAUT);
    expect(lirePreferences(JSON.stringify({ etat: "volante", cote: "gauche", hauteur: 3 }))).toEqual({ etat: "rangee", cote: "gauche", hauteur: 0.62 });
  });

  it("range la pastille du côté le plus proche, sans sortir de l'écran", () => {
    const ecran = { largeur: 390, hauteur: 844 };
    expect(placerApresGlissement({ x: 100, y: 400 }, ecran, "reduite")).toEqual({ cote: "gauche", hauteur: 0.474, etat: "reduite" });
    expect(placerApresGlissement({ x: 300, y: 5 }, ecran, "reduite")).toMatchObject({ cote: "droite", hauteur: 0.085 });
    expect(placerApresGlissement({ x: 300, y: 840 }, ecran, "reduite").hauteur).toBe(0.87);
  });

  it("la cache contre le bord et la ressort quand on la tire", () => {
    const ecran = { largeur: 390, hauteur: 844 };
    expect(placerApresGlissement({ x: 385, y: 400 }, ecran, "reduite").etat).toBe("rangee");
    expect(placerApresGlissement({ x: 4, y: 400 }, ecran, "reduite")).toMatchObject({ cote: "gauche", etat: "rangee" });
    expect(placerApresGlissement({ x: 350, y: 400 }, ecran, "rangee").etat).toBe("rangee");
    expect(placerApresGlissement({ x: 250, y: 400 }, ecran, "rangee").etat).toBe("reduite");
  });

  it("distingue un appui d'un glissement", () => {
    expect(estGlissement({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
    expect(estGlissement({ x: 0, y: 0 }, { x: 9, y: 0 })).toBe(true);
  });
});

describe("validation d'une remarque", () => {
  const valide = {
    texte: "  Le bouton est trop petit  ",
    chemin: "/a-traiter/abc",
    appareil: "3f2b8c1e-7d4a-4f6b-9a2e-1c5d8e9f0a1b",
    element: null,
    contexte: { largeur: 390, hauteur: 844, ratioPixels: 3, defilement: 0, theme: "clair", navigateur: "Safari" },
  };

  it("accepte une remarque complète et nettoie le texte", () => {
    expect(retourSchema.parse(valide).texte).toBe("Le bouton est trop petit");
  });

  it("refuse un texte vide, une adresse extérieure ou un appareil inventé", () => {
    expect(retourSchema.safeParse({ ...valide, texte: " " }).success).toBe(false);
    expect(retourSchema.safeParse({ ...valide, chemin: "https://ailleurs.fr" }).success).toBe(false);
    expect(retourSchema.safeParse({ ...valide, appareil: "moi" }).success).toBe(false);
  });

  it("n'accepte que des captures JPEG raisonnables", () => {
    expect(captureValide(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe(true);
    expect(captureValide(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0]))).toBe(false);
    expect(captureValide(new Uint8Array(1_600_000).fill(0xff).map((v, i) => (i === 1 ? 0xd8 : v)))).toBe(false);
  });
});
