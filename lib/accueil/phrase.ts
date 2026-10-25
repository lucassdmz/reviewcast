import { prenomPourSalutation } from "@/lib/ai/salutation";

/**
 * La phrase d'accueil : elle parle avant le chiffre. Elle commence par les
 * clients contents, puis dit ce qui attend, sans compteur anxiogène.
 */
export interface DonneesPhrase {
  prenom: string | null;
  volume: number;
  nbContents: number;
  aRelire: number;
  heure: number;
}

/** Prénom tiré de la signature (« Valentine, The Coffee Jacobins » donne « Valentine »), ou null. */
export function prenomDepuisSignature(signature: string | null): string | null {
  if (!signature) return null;
  const avantVirgule = signature.split(",")[0].trim();
  if (avantVirgule.split(/\s+/).length !== 1) return null;
  return prenomPourSalutation(avantVirgule);
}

function salut(heure: number, prenom: string | null): string {
  const mot = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour";
  return prenom ? `${mot}, ${prenom}.` : `${mot}.`;
}

/** Deux parties : l'ouverture, et le constat sur les clients contents, mis en valeur à l'écran. */
export function phraseAccueil(d: DonneesPhrase): { ouverture: string; contents: string; suite: string } {
  const ouverture = salut(d.heure, d.prenom);
  if (d.volume === 0) {
    return { ouverture, contents: "Pas encore d’avis ces trois derniers mois", suite: "." };
  }
  const contents = `${d.nbContents} client${d.nbContents > 1 ? "s" : ""} content${d.nbContents > 1 ? "s" : ""} sur ${d.volume}`;
  const suite =
    d.aRelire === 0
      ? ", et rien n’attend votre réponse."
      : d.aRelire === 1
        ? ", et un avis attend un mot de vous."
        : `, et ${d.aRelire} avis attendent un mot de vous.`;
  return { ouverture, contents, suite };
}
