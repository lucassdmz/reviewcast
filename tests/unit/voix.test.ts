import { describe, expect, it } from "vitest";
import { FakeProvider } from "@/lib/ai/providers/fake";
import { correctionSignificative, proximite } from "@/lib/voix/apprentissage";
import {
  REGLES_PAR_DEFAUT,
  VOIX_PAR_DEFAUT,
  consignesVoix,
  decouperListe,
  lireRegles,
  motsEvitesPresents,
  reglesPourThemes,
  voixSchema,
  type Voix,
} from "@/lib/voix/reglages";
import { avecSignature, sansSignature } from "@/lib/voix/signature";

const voix = (surcharge: Partial<Voix> = {}): Voix => ({ ...VOIX_PAR_DEFAUT, ...surcharge });

describe("signature", () => {
  it("ajoute la signature après une ligne vide", () => {
    expect(avecSignature("Merci pour votre visite.", "Valentine, The Coffee Jacobins")).toBe("Merci pour votre visite.\n\nValentine, The Coffee Jacobins");
  });

  it("ne signe pas deux fois", () => {
    const signe = avecSignature("Merci pour votre visite.", "L'équipe");
    expect(avecSignature(signe, "L'équipe")).toBe(signe);
    expect(avecSignature("Merci pour votre visite. L’équipe", "L'équipe")).toBe("Merci pour votre visite.\n\nL'équipe");
  });

  it("laisse le texte intact sans signature", () => {
    expect(avecSignature("Merci pour votre visite.  ", null)).toBe("Merci pour votre visite.");
    expect(sansSignature("Merci.\n\nValentine", null)).toBe("Merci.\n\nValentine");
  });

  it("retire la signature pour retrouver le corps", () => {
    expect(sansSignature("Merci pour votre visite.\n\nValentine", "Valentine")).toBe("Merci pour votre visite.");
  });
});

describe("apprendre des corrections", () => {
  const brouillon =
    "Bonjour Lisa, merci d'avoir pris le temps de nous écrire. Nous sommes sincèrement désolés que le prix n'ait pas été à la hauteur de vos attentes. Nous aimerions en discuter avec vous.";

  it("ne retient pas une retouche légère", () => {
    expect(correctionSignificative(brouillon, brouillon.replace("sincèrement désolés", "vraiment désolés"))).toBe(false);
    expect(proximite(brouillon, brouillon)).toBe(1);
  });

  it("retient une vraie réécriture", () => {
    const reecrit =
      "Bonjour Lisa, merci pour votre fidélité. Je comprends que le prix compte quand on vient souvent. Chaque boisson est préparée à la commande avec des produits choisis avec soin. À très vite au comptoir.";
    expect(correctionSignificative(brouillon, reecrit)).toBe(true);
  });

  it("ne retient pas une réponse trop courte pour servir de modèle", () => {
    expect(correctionSignificative(brouillon, "Merci, à bientôt.")).toBe(false);
  });
});

describe("réglages de la voix", () => {
  it("traduit les réglages en consignes pour le modèle", () => {
    const texte = consignesVoix(voix({ personne: "JE", registre: "SOBRE", longueur: "COURTE", contact: "bonjour@cafe.fr", motsEvites: ["la direction"] }));
    expect(texte).toContain("première personne du singulier");
    expect(texte).toContain("Registre sobre");
    expect(texte).toContain("25 à 50 mots");
    expect(texte).toContain("Aucun emoji");
    expect(texte).toContain("Ne signez pas");
    expect(texte).toContain("bonjour@cafe.fr");
    expect(texte).toContain("« la direction »");
    expect(texte).toContain("### Le prix");
  });

  it("ne permet que les emojis choisis, six au plus", () => {
    expect(consignesVoix(voix({ emojis: ["☕", "😊"] }))).toContain("choisi uniquement parmi ceux-ci : ☕ 😊");
    const base = { signature: "", personne: "NOUS", registre: "SOBRE", longueur: "COURTE", apprendreCorrections: true, contact: "", regles: [], motsEvites: [] };
    expect(voixSchema.safeParse({ ...base, emojis: ["☕", "🍵", "🥐", "🍪", "🍰", "🧁", "😊"] }).success).toBe(false);
    expect(voixSchema.safeParse({ ...base, emojis: ["☕", "🍵", "🥐", "🍪", "🍰", "🧁"] }).success).toBe(true);
  });

  it("sans coordonnées, renvoie au comptoir plutôt qu'à un message privé", () => {
    expect(consignesVoix(voix())).toContain("en parler au comptoir");
  });

  it("valide le formulaire et normalise les champs vides", () => {
    const resultat = voixSchema.parse({
      signature: "  Valentine,   The Coffee Jacobins ",
      personne: "JE",
      registre: "COMPLICE",
      longueur: "MOYENNE",
      emojis: ["☕", "☕", "🚀"],
      apprendreCorrections: false,
      contact: " ",
      regles: [{ sujet: " Le prix ", themes: ["prix"], dire: "Nous comprenons.", nePasDire: "" }],
      motsEvites: ["la direction"],
    });
    expect(resultat.signature).toBe("Valentine, The Coffee Jacobins");
    expect(resultat.contact).toBeNull();
    expect(resultat.emojis).toEqual(["☕"]);
    expect(resultat.regles[0].sujet).toBe("Le prix");
    expect(voixSchema.safeParse({ ...resultat, signature: "x".repeat(81), contact: "" }).success).toBe(false);
  });

  it("découpe une liste saisie à la main sans doublon", () => {
    expect(decouperListe("la direction, malheureusement ;  La Direction\n n'hésitez pas,,")).toEqual(["la direction", "malheureusement", "n'hésitez pas"]);
  });

  it("retrouve les règles qui concernent un avis et les mots à éviter présents", () => {
    expect(reglesPourThemes(REGLES_PAR_DEFAUT, ["Prix", "boissons"]).map((r) => r.sujet)).toEqual(["Le prix"]);
    expect(reglesPourThemes(REGLES_PAR_DEFAUT, ["pourboire"]).map((r) => r.sujet)).toEqual(["La tablette et le pourboire"]);
    expect(motsEvitesPresents("Nous transmettons à la Direction.", ["la direction", "hélas"])).toEqual(["la direction"]);
  });

  it("ignore des règles mal formées en base plutôt que de casser l'écran", () => {
    expect(lireRegles([{ sujet: "Prix" }])).toEqual([]);
    expect(lireRegles(REGLES_PAR_DEFAUT)).toHaveLength(REGLES_PAR_DEFAUT.length);
  });
});

describe("fournisseur simulé et voix", () => {
  const entree = (v: Voix) => ({
    review: { auteur: "Lisa B.", note: 3, texte: "Bon mais le prix augmente.", dateCreation: new Date("2026-10-03"), etablissement: "The Coffee Jacobins" },
    analyse: {
      sentiment: "MIXTE" as const,
      gravite: "FAIBLE" as const,
      resume: "Habituée qui regrette des prix en hausse.",
      themes: [{ libelle: "prix", polarite: "NEGATIF" as const, passage: null }],
      passages_cles: [],
      probleme_detecte: true,
      hors_sujet: false,
    },
    ligneDeConduite: { texte: "", exemples: [], voix: v },
  });

  it("parle à la première personne du singulier quand on le lui demande", async () => {
    const { data } = await new FakeProvider().draftReply(entree(voix({ personne: "JE" })));
    expect(data.reponse).toContain("m'écrire");
    expect(data.reponse).not.toMatch(/\bNous\b/);
  });

  it("suit la règle du sujet, donne les coordonnées et ne signe pas", async () => {
    const { data } = await new FakeProvider().draftReply(entree(voix({ contact: "bonjour@cafe.fr" })));
    expect(data.reponse).toContain("Le prix compte, surtout quand on vient souvent");
    expect(data.reponse).toContain("bonjour@cafe.fr");
    expect(data.reponse).not.toMatch(/l'équipe\.?$/i);
    expect(data.reponse).not.toContain("la direction");
  });

  it("raccourcit la réponse en longueur courte", async () => {
    const longue = (await new FakeProvider().draftReply(entree(voix()))).data.reponse;
    const courte = (await new FakeProvider().draftReply(entree(voix({ longueur: "COURTE" })))).data.reponse;
    expect(courte.length).toBeLessThan(longue.length);
  });
});
