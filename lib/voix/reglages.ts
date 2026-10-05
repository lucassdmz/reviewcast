import { z } from "zod";

/**
 * La voix de l'établissement (section 12 du cdc) : ce que la gérante règle
 * elle-même dans Réglages, sans écrire de consigne technique.
 */
export const PERSONNES = ["JE", "NOUS"] as const;
export const REGISTRES = ["SOBRE", "CHALEUREUX", "COMPLICE"] as const;
export const LONGUEURS = ["COURTE", "MOYENNE"] as const;

export type Personne = (typeof PERSONNES)[number];
export type Registre = (typeof REGISTRES)[number];
export type Longueur = (typeof LONGUEURS)[number];

/** Règle pour un sujet qui revient dans les avis : ce qu'on veut dire, ce qu'on ne veut pas dire. */
export interface RegleSujet {
  sujet: string;
  /** Libellés de thèmes (minuscules) auxquels la règle s'applique. */
  themes: string[];
  dire: string;
  nePasDire: string;
}

export interface Voix {
  signature: string | null;
  personne: Personne;
  registre: Registre;
  longueur: Longueur;
  /** Emojis que l'IA a le droit d'utiliser. Vide : aucun emoji dans les réponses. */
  emojis: string[];
  apprendreCorrections: boolean;
  /** E-mail ou téléphone à proposer pour poursuivre l'échange. */
  contact: string | null;
  regles: RegleSujet[];
  motsEvites: string[];
}

/**
 * Règles proposées au départ, reprises de docs/ligne-de-conduite.md. Elles sont
 * écrites sans « je » ni « nous » pour convenir aux deux réglages.
 */
export const REGLES_PAR_DEFAUT: RegleSujet[] = [
  {
    sujet: "Le prix",
    themes: ["prix"],
    dire: "Le prix compte, surtout quand on vient souvent. Chaque boisson est préparée à la commande, avec des produits choisis avec soin.",
    nePasDire: "Que les prix sont affichés. Les fournisseurs, les charges, le loyer. Une promesse sur les tarifs.",
  },
  {
    sujet: "L'accueil",
    themes: ["accueil"],
    dire: "Ce n'est pas l'accueil voulu ici, et ce serait un plaisir de vous montrer un autre visage.",
    nePasDire: "Qui était là ce jour-là. Une explication ou une excuse pour l'équipe. Une promesse de sanction.",
  },
  {
    sujet: "Les places et l'ordinateur",
    themes: ["places assises", "travail sur ordinateur"],
    dire: "Le lieu est petit : la durée limitée avec un ordinateur permet à chacun de trouver une place aux heures d'affluence.",
    nePasDire: "Que la règle est affichée. Un reproche au client resté longtemps.",
  },
  {
    sujet: "La tablette et le pourboire",
    themes: ["commande sur tablette", "pourboire"],
    dire: "La tablette sert à composer sa boisson librement, elle ne remplace pas un bonjour. Le pourboire proposé à l'écran est facultatif.",
    nePasDire: "Défendre l'outil contre le client.",
  },
];

export const VOIX_PAR_DEFAUT: Voix = {
  signature: null,
  personne: "NOUS",
  registre: "CHALEUREUX",
  longueur: "MOYENNE",
  emojis: [],
  apprendreCorrections: true,
  contact: null,
  regles: REGLES_PAR_DEFAUT,
  motsEvites: [],
};

export const NB_REGLES_MAX = 12;

/** Emojis proposés dans Réglages : sobres, adaptés à un commerce de bouche. */
export const EMOJIS_PROPOSES = [
  "☕", "🍵", "🥐", "🍪", "🍰", "🧁",
  "😊", "🙂", "😉", "🤗", "👋", "🙏",
  "✨", "🌿", "🌸", "☀️", "🎉", "👏",
  "💛", "🤍", "💚", "❤️", "🫶", "👍",
] as const;

export const NB_EMOJIS_MAX = 6;

export const LIBELLES_PERSONNE: Record<Personne, { titre: string; exemple: string }> = {
  JE: { titre: "Je", exemple: "« Je regrette que… »" },
  NOUS: { titre: "Nous", exemple: "« Nous sommes désolés que… »" },
};

export const LIBELLES_REGISTRE: Record<Registre, { titre: string; description: string }> = {
  SOBRE: { titre: "Sobre", description: "Poli et direct, sans effusion." },
  CHALEUREUX: { titre: "Chaleureux", description: "Comme à un client qu'on a envie de revoir." },
  COMPLICE: { titre: "Complice", description: "Proche et souriant, comme au comptoir." },
};

export const LIBELLES_LONGUEUR: Record<Longueur, { titre: string; description: string }> = {
  COURTE: { titre: "Courte", description: "Deux ou trois phrases." },
  MOYENNE: { titre: "Moyenne", description: "Quatre ou cinq phrases." },
};

const ligne = (max: number, message: string) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .refine((s) => s.length <= max, message);

export const regleSujetSchema = z.object({
  sujet: ligne(60, "Le nom du sujet dépasse 60 caractères.").refine((s) => s.length > 0, "Un sujet n'a pas de nom."),
  themes: z.array(z.string().min(1).max(40)).max(6),
  dire: ligne(400, "« Ce que je veux dire » dépasse 400 caractères."),
  nePasDire: ligne(400, "« Ce que je ne veux pas dire » dépasse 400 caractères."),
});

/** Découpe une liste saisie à la main (virgules, points-virgules ou retours à la ligne). */
export function decouperListe(saisie: string): string[] {
  const vus = new Set<string>();
  const mots: string[] = [];
  for (const brut of saisie.split(/[,;\n]+/)) {
    const mot = brut.replace(/\s+/g, " ").trim();
    const cle = mot.toLowerCase();
    if (mot && !vus.has(cle)) {
      vus.add(cle);
      mots.push(mot);
    }
  }
  return mots;
}

/** Entrée du formulaire de Réglages. Un champ vide revient à « non renseigné ». */
export const voixSchema = z.object({
  signature: ligne(80, "La signature dépasse 80 caractères.").transform((s) => (s.length === 0 ? null : s)),
  personne: z.enum(PERSONNES),
  registre: z.enum(REGISTRES),
  longueur: z.enum(LONGUEURS),
  emojis: z
    .array(z.string())
    .transform((liste) => [...new Set(liste)].filter((e) => (EMOJIS_PROPOSES as readonly string[]).includes(e)))
    .refine((liste) => liste.length <= NB_EMOJIS_MAX, `Pas plus de ${NB_EMOJIS_MAX} emojis autorisés.`),
  apprendreCorrections: z.boolean(),
  contact: ligne(120, "Les coordonnées dépassent 120 caractères.").transform((s) => (s.length === 0 ? null : s)),
  regles: z.array(regleSujetSchema).max(NB_REGLES_MAX, `Pas plus de ${NB_REGLES_MAX} sujets.`),
  motsEvites: z
    .array(z.string().max(40, "Un mot à éviter dépasse 40 caractères."))
    .max(30, "Pas plus de 30 mots à éviter."),
});

/** Relit les règles stockées en base (JSON) : toute forme inattendue est ignorée plutôt que de casser l'écran. */
export function lireRegles(json: unknown): RegleSujet[] {
  const resultat = z.array(regleSujetSchema).safeParse(json);
  return resultat.success ? resultat.data : [];
}

const CONSIGNE_PERSONNE: Record<Personne, string> = {
  JE: "Parlez à la première personne du singulier (« je ») : c'est la gérante ou le gérant qui répond en son nom. Évitez les accords qui supposent son genre.",
  NOUS: "Parlez à la première personne du pluriel (« nous ») : c'est l'équipe qui répond.",
};

const CONSIGNE_REGISTRE: Record<Registre, string> = {
  SOBRE: "Registre sobre : poli, direct, sans effusion ni point d'exclamation.",
  CHALEUREUX: "Registre chaleureux : comme on parlerait à un client qu'on a envie de revoir.",
  COMPLICE: "Registre complice : proche et souriant, comme au comptoir, sans familiarité déplacée et toujours au vouvoiement.",
};

const CONSIGNE_LONGUEUR: Record<Longueur, string> = {
  COURTE: "Longueur : courte, 25 à 50 mots, deux ou trois phrases.",
  MOYENNE: "Longueur : moyenne, 40 à 90 mots, quatre ou cinq phrases.",
};

/** Règles qui concernent un avis, d'après les thèmes que l'analyse y a trouvés. */
export function reglesPourThemes(regles: RegleSujet[], themes: string[]): RegleSujet[] {
  const presents = new Set(themes.map((t) => t.trim().toLowerCase()));
  return regles.filter((r) => r.themes.some((t) => presents.has(t.trim().toLowerCase())));
}

/** Mots à éviter que l'on retrouve dans un texte (comparaison sans casse). */
export function motsEvitesPresents(texte: string, motsEvites: string[]): string[] {
  const bas = texte.toLowerCase();
  return motsEvites.filter((m) => m.trim() && bas.includes(m.trim().toLowerCase()));
}

/**
 * Traduit les réglages en consignes pour le modèle. Ce bloc s'ajoute à la
 * ligne de conduite et l'emporte sur elle en cas de contradiction.
 */
export function consignesVoix(voix: Voix): string {
  const lignes = [
    "## Réglages de l'établissement (prioritaires)",
    "",
    `- ${CONSIGNE_PERSONNE[voix.personne]}`,
    `- ${CONSIGNE_REGISTRE[voix.registre]}`,
    `- ${CONSIGNE_LONGUEUR[voix.longueur]}`,
    voix.emojis.length > 0
      ? `- Un emoji est permis, un seul par réponse, choisi uniquement parmi ceux-ci : ${voix.emojis.join(" ")}. Jamais sur un avis négatif ou difficile.`
      : "- Aucun emoji.",
    "- Ne signez pas la réponse : la signature est ajoutée automatiquement après votre texte.",
    voix.contact
      ? `- Pour proposer de poursuivre l'échange, donnez ces coordonnées et aucune autre : ${voix.contact}`
      : "- Pour proposer de poursuivre l'échange, invitez le client à repasser et à en parler au comptoir. Ne proposez pas de « message privé » et n'inventez aucune coordonnée.",
  ];
  if (voix.motsEvites.length > 0) {
    lignes.push(`- N'utilisez jamais ces mots ou tournures : ${voix.motsEvites.map((m) => `« ${m} »`).join(", ")}.`);
  }
  const regles = voix.regles.filter((r) => r.dire || r.nePasDire);
  if (regles.length > 0) {
    lignes.push("", "## Règles par sujet (prioritaires)", "", "Quand l'avis aborde l'un de ces sujets, suivez la règle de l'établissement.");
    for (const r of regles) {
      lignes.push("", `### ${r.sujet}`);
      if (r.dire) lignes.push(`- Ce que nous voulons dire : ${r.dire}`);
      if (r.nePasDire) lignes.push(`- Ce que nous ne voulons pas dire : ${r.nePasDire}`);
    }
  }
  return lignes.join("\n");
}
