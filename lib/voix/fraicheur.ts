import { z } from "zod";
import { prenomDepuisSignature } from "@/lib/accueil/phrase";
import {
  LONGUEURS,
  PERSONNES,
  REGISTRES,
  motsEvitesPresents,
  regleSujetSchema,
  reglesPourThemes,
  type Personne,
  type RegleSujet,
  type Voix,
} from "./reglages";

/**
 * Un brouillon est écrit avec les réglages du moment. Quand la gérante les
 * change ensuite (un mot à éviter, une règle sur l'attente, le « je »), les
 * brouillons déjà prêts ne les suivent plus. Ce module dit, brouillon par
 * brouillon, ce qui a changé depuis son écriture et le concerne vraiment.
 */

/** Les réglages qui ont servi à écrire un brouillon, gardés avec lui (en JSON, d'où des types et non des interfaces). */
export type ReglagesBrouillon = {
  signature: string | null;
  personne: Personne;
  registre: Voix["registre"];
  longueur: Voix["longueur"];
  emojis: string[];
  contact: string | null;
  regles: { sujet: string; themes: string[]; dire: string; nePasDire: string }[];
  motsEvites: string[];
};

export const reglagesBrouillonSchema = z.object({
  signature: z.string().nullable(),
  personne: z.enum(PERSONNES),
  registre: z.enum(REGISTRES),
  longueur: z.enum(LONGUEURS),
  emojis: z.array(z.string()),
  contact: z.string().nullable(),
  regles: z.array(regleSujetSchema),
  motsEvites: z.array(z.string()),
});

export function reglagesDe(voix: Voix): ReglagesBrouillon {
  return {
    signature: voix.signature,
    personne: voix.personne,
    registre: voix.registre,
    longueur: voix.longueur,
    emojis: voix.emojis,
    contact: voix.contact,
    regles: voix.regles.map((r) => ({ sujet: r.sujet, themes: r.themes, dire: r.dire, nePasDire: r.nePasDire })),
    motsEvites: voix.motsEvites,
  };
}

/** Relit l'empreinte stockée en base (JSON) : une forme inattendue vaut « inconnue ». */
export function lireReglagesBrouillon(json: unknown): ReglagesBrouillon | null {
  const resultat = reglagesBrouillonSchema.safeParse(json);
  return resultat.success ? resultat.data : null;
}

export type Ecart =
  | { type: "mot_evite"; mots: string[] }
  | { type: "emoji"; emojis: string[] }
  | { type: "regle"; sujet: string; nature: "nouvelle" | "modifiee" | "retiree" }
  | { type: "personne"; personne: Personne }
  | { type: "registre" }
  | { type: "longueur" }
  | { type: "contact" }
  | { type: "signataire" }
  /** Brouillon écrit avant que l'application garde ses réglages : on sait seulement qu'ils ont changé depuis. */
  | { type: "anterieur" };

const EMOJI = /\p{Extended_Pictographic}/gu;

function sansVariante(emoji: string): string {
  return emoji.replace(/️/g, "");
}

/** Emojis du texte que les réglages n'autorisent pas (ou plus). */
export function emojisNonAutorises(texte: string, autorises: string[]): string[] {
  const permis = new Set(autorises.map(sansVariante));
  return [...new Set(texte.match(EMOJI) ?? [])].filter((e) => !permis.has(sansVariante(e)));
}

/** Une règle ne compte que si elle dit quelque chose (une règle vide n'est pas envoyée au modèle). */
function reglesActives(regles: RegleSujet[], themes: string[]): Map<string, RegleSujet> {
  return new Map(
    reglesPourThemes(regles, themes)
      .filter((r) => r.dire || r.nePasDire)
      .map((r) => [r.sujet.trim().toLowerCase(), r]),
  );
}

function ecartsDeRegles(avant: RegleSujet[], apres: RegleSujet[], themes: string[]): Ecart[] {
  const anciennes = reglesActives(avant, themes);
  const nouvelles = reglesActives(apres, themes);
  const ecarts: Ecart[] = [];
  for (const [cle, r] of nouvelles) {
    const ancienne = anciennes.get(cle);
    if (!ancienne) ecarts.push({ type: "regle", sujet: r.sujet, nature: "nouvelle" });
    else if (ancienne.dire !== r.dire || ancienne.nePasDire !== r.nePasDire) ecarts.push({ type: "regle", sujet: r.sujet, nature: "modifiee" });
  }
  for (const [cle, r] of anciennes) {
    if (!nouvelles.has(cle)) ecarts.push({ type: "regle", sujet: r.sujet, nature: "retiree" });
  }
  return ecarts;
}

export interface BrouillonAVerifier {
  /** Corps du brouillon, sans la signature. */
  texte: string;
  /** Réglages utilisés à l'écriture ; null pour un brouillon plus ancien que ce suivi. */
  utilises: ReglagesBrouillon | null;
  ecritLe: Date;
  /** Thèmes trouvés dans l'avis par l'analyse. */
  themes: string[];
  /** Mot de remerciement d'un avis positif, plutôt que réponse à un avis à traiter. */
  remerciement: boolean;
}

/**
 * Ce qui a changé dans les réglages depuis l'écriture du brouillon et le
 * concerne. Les mots à éviter et les emojis se vérifient sur le texte même ;
 * le reste se compare aux réglages gardés avec le brouillon. Une règle sur
 * l'attente ne concerne que les avis qui parlent d'attente.
 */
export function ecartsBrouillon(b: BrouillonAVerifier, voix: Voix, reglagesModifiesLe: Date | null): Ecart[] {
  const ecarts: Ecart[] = [];
  const mots = motsEvitesPresents(b.texte, voix.motsEvites);
  if (mots.length > 0) ecarts.push({ type: "mot_evite", mots });
  const emojis = emojisNonAutorises(b.texte, voix.emojis);
  if (emojis.length > 0) ecarts.push({ type: "emoji", emojis });

  const avant = b.utilises;
  if (!avant) {
    if (reglagesModifiesLe && reglagesModifiesLe > b.ecritLe) ecarts.push({ type: "anterieur" });
    return ecarts;
  }
  if (avant.personne !== voix.personne) ecarts.push({ type: "personne", personne: voix.personne });
  if (avant.registre !== voix.registre) ecarts.push({ type: "registre" });
  if (avant.longueur !== voix.longueur) ecarts.push({ type: "longueur" });
  if (prenomDepuisSignature(avant.signature) !== prenomDepuisSignature(voix.signature)) ecarts.push({ type: "signataire" });
  const ancienContactCite = avant.contact !== null && b.texte.includes(avant.contact);
  if (avant.contact !== voix.contact && (ancienContactCite || !b.remerciement)) ecarts.push({ type: "contact" });
  ecarts.push(...ecartsDeRegles(avant.regles, voix.regles, b.themes));
  return ecarts;
}

const LIBELLES_PERSONNE_ECART: Record<Personne, string> = { JE: "votre passage au « je »", NOUS: "votre passage au « nous »" };

/** Chaque écart en quelques mots, pour compléter « Écrit avant… ». */
export function libelleEcart(e: Ecart): string {
  switch (e.type) {
    case "mot_evite":
      return `${e.mots.length > 1 ? "contient des mots" : "contient un mot"} que vous évitez : ${e.mots.map((m) => `« ${m} »`).join(", ")}`;
    case "emoji":
      return `contient ${e.emojis.length > 1 ? "des emojis" : "un emoji"} que vous n'avez pas choisi${e.emojis.length > 1 ? "s" : ""} : ${e.emojis.join(" ")}`;
    case "regle":
      return e.nature === "retiree" ? `écrit avec votre ancienne règle « ${e.sujet} »` : `écrit avant votre ${e.nature === "nouvelle" ? "règle" : "nouvelle règle"} « ${e.sujet} »`;
    case "personne":
      return `écrit avant ${LIBELLES_PERSONNE_ECART[e.personne]}`;
    case "registre":
      return "écrit avant votre changement de ton";
    case "longueur":
      return "écrit avant votre changement de longueur";
    case "contact":
      return "écrit avant vos nouvelles coordonnées";
    case "signataire":
      return "écrit avant votre nouvelle signature";
    case "anterieur":
      return "écrit avant vos derniers réglages";
  }
}

/** « Écrit avant votre règle « L'attente » et contient un mot que vous évitez : « désolé ». » */
export function phraseEcarts(ecarts: Ecart[]): string | null {
  if (ecarts.length === 0) return null;
  const morceaux = ecarts.map(libelleEcart);
  const texte = morceaux.length === 1 ? morceaux[0] : `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}`;
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)}.`;
}

const MARQUES_JE = /(?<![\p{L}])(?:je|me|moi|mon|ma|mes)(?![\p{L}])|(?<![\p{L}])[jm]['’]/giu;
const MARQUES_NOUS = /(?<![\p{L}])(?:nous|notre|nos)(?![\p{L}])/giu;

/** Personne dans laquelle un texte est écrit, ou null s'il mélange les deux ou n'en montre aucune. */
export function personneDuTexte(texte: string): Personne | null {
  const je = (texte.match(MARQUES_JE) ?? []).length;
  const nous = (texte.match(MARQUES_NOUS) ?? []).length;
  if (je > 0 && nous === 0) return "JE";
  if (nous > 0 && je === 0) return "NOUS";
  return null;
}

/**
 * Une correction retenue sert de modèle au brouillon suivant. Si elle
 * contredit les réglages d'aujourd'hui (un mot désormais évité, l'autre
 * personne), elle apprendrait au modèle l'inverse de ce qui est demandé :
 * elle est mise de côté, avec la raison.
 */
export function raisonCorrectionEcartee(texte: string, voix: Voix): string | null {
  const mots = motsEvitesPresents(texte, voix.motsEvites);
  if (mots.length > 0) return `Elle contient ${mots.map((m) => `« ${m} »`).join(", ")}, que vous évitez désormais.`;
  const emojis = emojisNonAutorises(texte, voix.emojis);
  if (emojis.length > 0) return `Elle contient ${emojis.join(" ")}, que vous n'avez pas choisi.`;
  const personne = personneDuTexte(texte);
  if (personne && personne !== voix.personne) return `Elle parle au « ${personne === "JE" ? "je" : "nous"} », vos réponses au « ${voix.personne === "JE" ? "je" : "nous"} ».`;
  return null;
}

const nombreSchema = z.coerce.number().int().min(0).max(1000).catch(0);

/** Ce que l'écran dit après l'enregistrement des réglages, d'après les paramètres de l'adresse. */
export function messageReecriture(reecrits: unknown, signales: unknown): string | null {
  const r = nombreSchema.parse(reecrits ?? 0);
  const s = nombreSchema.parse(signales ?? 0);
  const phrases: string[] = [];
  if (r > 0) {
    phrases.push(
      r > 1
        ? `${r} brouillons pas encore publiés sont réécrits avec ces réglages. L'ancienne version reste dans leur historique.`
        : "Un brouillon pas encore publié est réécrit avec ces réglages. L'ancienne version reste dans son historique.",
    );
  }
  if (s > 0) {
    phrases.push(
      s > 1
        ? `${s} brouillons que vous aviez modifiés ne suivent plus ces réglages : ils sont signalés sur leur fiche, sans que l'on y touche.`
        : "Un brouillon que vous aviez modifié ne suit plus ces réglages : il est signalé sur sa fiche, sans que l'on y touche.",
    );
  }
  return phrases.length > 0 ? phrases.join(" ") : null;
}

/**
 * Une signature au prénom avec des réponses au « nous », ou une signature
 * d'équipe avec des réponses au « je » : la réponse ne sonne pas juste.
 * Renvoie le conseil à afficher sous la signature, ou null.
 */
export function conseilSignature(voix: Pick<Voix, "signature" | "personne">): string | null {
  const prenom = prenomDepuisSignature(voix.signature);
  if (prenom && voix.personne === "NOUS") {
    return `Vos réponses parlent au « nous », celui de l'équipe. Si c'est ${prenom} qui répond, choisissez « Je » dans le ton : les brouillons seront réécrits à son nom.`;
  }
  if (!prenom && voix.signature && /(?<![\p{L}])(équipe|team)(?![\p{L}])/iu.test(voix.signature) && voix.personne === "JE") {
    return "Vos réponses parlent au « je » mais sont signées par l'équipe. Pour qu'elles parlent au nom de tous, choisissez « Nous » dans le ton.";
  }
  return null;
}
