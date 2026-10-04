/**
 * Comment saluer l'auteur d'un avis. Reprendre le nom affiché en entier
 * (« Bonjour Caroline Faucheux-Bourlot ») donne une réponse qui sent
 * l'automate : on ne garde que le prénom, et seulement quand le nom affiché
 * ressemble vraiment à un prénom. Au moindre doute (pseudonyme, entreprise,
 * initiales), on salue sans nom. Mieux vaut « Bonjour, » que « Bonjour Compagnie, ».
 */

/** Premiers mots qui annoncent autre chose qu'une personne. */
const PAS_UN_PRENOM = new Set([
  "anonyme", "cafe", "café", "client", "cliente", "coffee", "compagnie", "dr", "entreprise", "equipe", "équipe", "google",
  "la", "le", "les", "madame", "mme", "monsieur", "mr", "restaurant", "sarl", "sas", "societe", "société", "team", "the", "user",
]);

const MOT = /^\p{L}[\p{L}'’-]*$/u;
const INITIALE = /^\p{Lu}\.?$/u;

function capitaliser(mot: string): string {
  return mot
    .split("-")
    .map((partie) => partie.charAt(0).toLocaleUpperCase("fr") + partie.slice(1).toLocaleLowerCase("fr"))
    .join("-");
}

/** Prénom à utiliser dans la salutation, ou null s'il vaut mieux saluer sans nom. */
export function prenomPourSalutation(auteur: string): string | null {
  const mots = auteur.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0 || mots.length > 3) return null;
  // Tout ce qui n'est ni un mot ni une initiale (chiffres, « & », « _ », « ! ») signale un pseudonyme ou une enseigne.
  if (!mots.every((m) => MOT.test(m) || INITIALE.test(m))) return null;
  const premier = mots[0];
  if (!MOT.test(premier) || premier.length < 3) return null;
  if (PAS_UN_PRENOM.has(premier.toLocaleLowerCase("fr"))) return null;
  const toutEnMinuscules = auteur === auteur.toLocaleLowerCase("fr");
  // Un seul mot en minuscules (« darktuner ») : plutôt un pseudonyme.
  if (mots.length === 1 && toutEnMinuscules) return null;
  const commenceParUneMajuscule = premier.charAt(0) !== premier.charAt(0).toLocaleLowerCase("fr");
  if (!commenceParUneMajuscule && !toutEnMinuscules) return null;
  return capitaliser(premier);
}

/** « Bonjour Caroline, » ou « Bonjour, ». */
export function salutation(auteur: string): string {
  const prenom = prenomPourSalutation(auteur);
  return prenom ? `Bonjour ${prenom},` : "Bonjour,";
}
