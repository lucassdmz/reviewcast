import { describe, expect, it } from "vitest";
import {
  conseilSignature,
  ecartsBrouillon,
  emojisNonAutorises,
  lireReglagesBrouillon,
  messageReecriture,
  personneDuTexte,
  phraseEcarts,
  raisonCorrectionEcartee,
  reglagesDe,
  type BrouillonAVerifier,
} from "@/lib/voix/fraicheur";
import { VOIX_PAR_DEFAUT, consignesVoix, type RegleSujet, type Voix } from "@/lib/voix/reglages";

const voix = (surcharge: Partial<Voix> = {}): Voix => ({ ...VOIX_PAR_DEFAUT, regles: [], ...surcharge });

const ATTENTE: RegleSujet = { sujet: "L'attente", themes: ["attente"], dire: "Le matin, tout est préparé à la commande.", nePasDire: "Une promesse de délai." };

const ecrit = new Date("2026-10-20T10:00:00Z");
const brouillon = (surcharge: Partial<BrouillonAVerifier> = {}): BrouillonAVerifier => ({
  texte: "Merci pour votre retour, nous espérons vous revoir bientôt.",
  utilises: reglagesDe(voix()),
  ecritLe: ecrit,
  themes: ["attente"],
  remerciement: false,
  ...surcharge,
});

describe("écarts entre un brouillon et les réglages actuels", () => {
  it("rien à signaler quand les réglages n'ont pas bougé", () => {
    expect(ecartsBrouillon(brouillon(), voix(), new Date())).toEqual([]);
  });

  it("une nouvelle règle sur l'attente concerne les avis qui parlent d'attente", () => {
    expect(ecartsBrouillon(brouillon(), voix({ regles: [ATTENTE] }), null)).toEqual([{ type: "regle", sujet: "L'attente", nature: "nouvelle" }]);
  });

  it("une règle sur l'attente ne touche pas un avis sur le prix", () => {
    expect(ecartsBrouillon(brouillon({ themes: ["prix"] }), voix({ regles: [ATTENTE] }), null)).toEqual([]);
  });

  it("une règle ajoutée vide ne compte pas, une règle modifiée ou retirée compte", () => {
    expect(ecartsBrouillon(brouillon(), voix({ regles: [{ ...ATTENTE, dire: "", nePasDire: "" }] }), null)).toEqual([]);
    const avecRegle = brouillon({ utilises: reglagesDe(voix({ regles: [ATTENTE] })) });
    expect(ecartsBrouillon(avecRegle, voix({ regles: [{ ...ATTENTE, dire: "Nous sommes désolés pour l'attente." }] }), null)).toEqual([
      { type: "regle", sujet: "L'attente", nature: "modifiee" },
    ]);
    expect(ecartsBrouillon(avecRegle, voix(), null)).toEqual([{ type: "regle", sujet: "L'attente", nature: "retiree" }]);
  });

  it("un mot à éviter se cherche dans le texte, quels que soient les réglages d'origine", () => {
    expect(ecartsBrouillon(brouillon({ texte: "Nous sommes désolés pour l'attente." }), voix({ motsEvites: ["désolés"] }), null)).toEqual([
      { type: "mot_evite", mots: ["désolés"] },
    ]);
    expect(ecartsBrouillon(brouillon(), voix({ motsEvites: ["désolés"] }), null)).toEqual([]);
  });

  it("le passage au « je », le ton et la longueur concernent tous les brouillons", () => {
    const types = ecartsBrouillon(brouillon({ themes: [] }), voix({ personne: "JE", registre: "SOBRE", longueur: "MOYENNE" }), null).map((e) => e.type);
    expect(types).toEqual(["personne", "registre", "longueur"]);
  });

  it("changer qui signe compte, retoucher la signature sans changer de personne non", () => {
    const utilises = reglagesDe(voix({ signature: "L'équipe The Coffee Jacobins" }));
    expect(ecartsBrouillon(brouillon({ utilises }), voix({ signature: "Valentine, The Coffee Jacobins" }), null)).toEqual([{ type: "signataire" }]);
    const valentine = reglagesDe(voix({ signature: "Valentine, The Coffee Jacobins" }));
    expect(ecartsBrouillon(brouillon({ utilises: valentine }), voix({ signature: "Valentine, The Coffee" }), null)).toEqual([]);
  });

  it("de nouvelles coordonnées concernent les réponses, et un remerciement seulement s'il citait les anciennes", () => {
    expect(ecartsBrouillon(brouillon(), voix({ contact: "bonjour@cafe.fr" }), null)).toEqual([{ type: "contact" }]);
    expect(ecartsBrouillon(brouillon({ remerciement: true }), voix({ contact: "bonjour@cafe.fr" }), null)).toEqual([]);
    const utilises = reglagesDe(voix({ contact: "ancien@cafe.fr" }));
    expect(ecartsBrouillon(brouillon({ remerciement: true, utilises, texte: "Écrivez-nous à ancien@cafe.fr." }), voix({ contact: "bonjour@cafe.fr" }), null)).toEqual([{ type: "contact" }]);
  });

  it("un emoji retiré des réglages est repéré dans le texte", () => {
    expect(ecartsBrouillon(brouillon({ texte: "Merci, à bientôt ☀️" }), voix({ emojis: [] }), null)).toEqual([{ type: "emoji", emojis: ["☀"] }]);
    expect(ecartsBrouillon(brouillon({ texte: "Merci, à bientôt ☀️" }), voix({ emojis: ["☀️"] }), null)).toEqual([]);
  });

  it("un brouillon d'avant le suivi est dépassé si les réglages ont changé après lui", () => {
    expect(ecartsBrouillon(brouillon({ utilises: null }), voix(), new Date("2026-10-28T13:34:00Z"))).toEqual([{ type: "anterieur" }]);
    expect(ecartsBrouillon(brouillon({ utilises: null }), voix(), new Date("2026-10-01T00:00:00Z"))).toEqual([]);
    expect(ecartsBrouillon(brouillon({ utilises: null }), voix(), null)).toEqual([]);
  });
});

describe("empreinte des réglages", () => {
  it("se relit après un passage en JSON, et une forme inattendue vaut inconnue", () => {
    const empreinte = reglagesDe(voix({ regles: [ATTENTE], motsEvites: ["hélas"] }));
    expect(lireReglagesBrouillon(JSON.parse(JSON.stringify(empreinte)))).toEqual(empreinte);
    expect(lireReglagesBrouillon({ personne: "ILS" })).toBeNull();
    expect(lireReglagesBrouillon(null)).toBeNull();
  });
});

describe("phrases", () => {
  it("dit ce qui a changé en une phrase", () => {
    expect(phraseEcarts([])).toBeNull();
    expect(phraseEcarts([{ type: "regle", sujet: "L'attente", nature: "nouvelle" }])).toBe("Écrit avant votre règle « L'attente ».");
    expect(phraseEcarts([{ type: "personne", personne: "JE" }, { type: "mot_evite", mots: ["désolé"] }])).toBe(
      "Écrit avant votre passage au « je » et contient un mot que vous évitez : « désolé ».",
    );
  });

  it("annonce les brouillons réécrits et ceux seulement signalés", () => {
    expect(messageReecriture(undefined, undefined)).toBeNull();
    expect(messageReecriture("3", "0")).toMatch(/^3 brouillons pas encore publiés sont réécrits/);
    expect(messageReecriture("0", "1")).toMatch(/^Un brouillon que vous aviez modifié/);
    expect(messageReecriture("abc", "-2")).toBeNull();
  });
});

describe("corrections retenues qui contredisent les réglages", () => {
  it("reconnaît la personne d'un texte", () => {
    expect(personneDuTexte("Je suis ravie que mon matcha vous ait plu.")).toBe("JE");
    expect(personneDuTexte("Nous sommes ravis que notre matcha vous ait plu.")).toBe("NOUS");
    expect(personneDuTexte("J’espère que nous vous reverrons.")).toBeNull();
    expect(personneDuTexte("Merci pour votre visite.")).toBeNull();
  });

  it("met de côté une correction avec un mot évité ou l'autre personne", () => {
    expect(raisonCorrectionEcartee("Nous sommes désolés.", voix({ motsEvites: ["désolés"] }))).toMatch(/« désolés »/);
    expect(raisonCorrectionEcartee("Nous vous attendons.", voix({ personne: "JE" }))).toMatch(/« nous »/);
    expect(raisonCorrectionEcartee("Nous vous attendons.", voix())).toBeNull();
  });
});

describe("signature et personne", () => {
  it("conseille le « je » quand un prénom signe des réponses au « nous »", () => {
    expect(conseilSignature({ signature: "Valentine, The Coffee Jacobins", personne: "NOUS" })).toMatch(/Si c'est Valentine qui répond/);
    expect(conseilSignature({ signature: "Valentine, The Coffee Jacobins", personne: "JE" })).toBeNull();
    expect(conseilSignature({ signature: "L’équipe The Coffee", personne: "JE" })).toMatch(/choisissez « Nous »/);
    expect(conseilSignature({ signature: null, personne: "NOUS" })).toBeNull();
  });

  it("donne la signature au modèle pour qu'il sache qui parle", () => {
    expect(consignesVoix(voix({ signature: "Valentine, The Coffee Jacobins" }))).toContain("La réponse sera signée « Valentine, The Coffee Jacobins »");
    expect(consignesVoix(voix())).toContain("Ne signez pas la réponse");
  });
});

describe("emojis", () => {
  it("ignore la variante de présentation", () => {
    expect(emojisNonAutorises("Merci ☀️ et ☕", ["☀"])).toEqual(["☕"]);
  });
});
