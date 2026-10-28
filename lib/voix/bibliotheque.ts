import type { RegleSujet } from "./reglages";

/**
 * Sujets qui reviennent dans les avis de tout commerce, avec des consignes de
 * base à ajouter en un clic puis à ajuster dans Réglages. Écrits sans « je »
 * ni « nous », sans montant ni fait propre à un lieu : l'établissement complète.
 */
export interface SujetCourant extends RegleSujet {
  cle: string;
}

export const SUJETS_COURANTS: SujetCourant[] = [
  {
    cle: "prix",
    sujet: "Le prix",
    themes: ["prix"],
    dire: "Le prix compte, on le comprend. Il paie la qualité des produits et le travail fait sur place.",
    nePasDire: "Un montant. Une excuse pour le prix. Les charges, les marges, une comparaison avec un autre commerce. Une promesse sur les tarifs.",
  },
  {
    cle: "accueil",
    sujet: "L'accueil",
    themes: ["accueil"],
    dire: "Ce n'est pas l'accueil voulu ici, et ce serait un plaisir de vous recevoir à nouveau.",
    nePasDire: "Plus d'une excuse. Qui était là ce jour-là. Une explication pour l'équipe. Une promesse de sanction.",
  },
  {
    cle: "attente",
    sujet: "L'attente",
    themes: ["délais", "rapidité", "attente"],
    dire: "L'attente a été trop longue ce jour-là : tout est préparé à la minute, et l'affluence peut la rallonger.",
    nePasDire: "Plus d'une excuse. Une promesse de délai. Un reproche au client d'être venu à une heure chargée.",
  },
  {
    cle: "erreur",
    sujet: "Une erreur de commande",
    themes: ["erreur de commande", "commande"],
    dire: "Une erreur peut arriver, et elle se rattrape : il suffit de la signaler au comptoir lors du prochain passage.",
    nePasDire: "Qui s'est trompé. Une promesse de remboursement.",
  },
  {
    cle: "qualite",
    sujet: "Un produit décevant",
    themes: ["qualité", "goût"],
    dire: "Ce n'est pas la qualité voulue. Le produit sera refait avec plaisir lors d'un prochain passage, il suffit de le signaler au comptoir.",
    nePasDire: "Une discussion sur le goût. Que les autres clients l'aiment.",
  },
  {
    cle: "proprete",
    sujet: "La propreté",
    themes: ["propreté"],
    dire: "Merci pour ce signalement : la propreté est suivie de près, et il ne faut pas hésiter à le dire sur place.",
    nePasDire: "Une mesure qui n'a pas été prise. Un reproche aux autres clients.",
  },
  {
    cle: "bruit",
    sujet: "Le bruit et l'ambiance",
    themes: ["bruit", "ambiance"],
    dire: "Le lieu est vivant aux heures d'affluence, et bien plus calme en dehors.",
    nePasDire: "Que le client aurait dû savoir. Une promesse de travaux ou de changement.",
  },
  {
    cle: "places",
    sujet: "Le manque de places",
    themes: ["places assises", "places"],
    dire: "Le lieu est petit, et ne pas trouver de place est frustrant. Il est plus calme en dehors des heures d'affluence.",
    nePasDire: "Un reproche aux clients restés longtemps. Que la règle est affichée.",
  },
];

/** Sujets courants que l'établissement n'a pas encore : même sujet ou thème déjà couvert. */
export function sujetsCourantsDisponibles(regles: RegleSujet[]): SujetCourant[] {
  const sujets = new Set(regles.map((r) => r.sujet.trim().toLowerCase()));
  const themes = new Set(regles.flatMap((r) => r.themes.map((t) => t.trim().toLowerCase())));
  return SUJETS_COURANTS.filter((s) => !sujets.has(s.sujet.toLowerCase()) && !s.themes.some((t) => themes.has(t)));
}

export function trouverSujetCourant(cle: string): SujetCourant | undefined {
  return SUJETS_COURANTS.find((s) => s.cle === cle);
}
