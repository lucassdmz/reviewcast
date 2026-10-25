import { prenomPourSalutation } from "@/lib/ai/salutation";

/** Prénom tiré de la signature (« Valentine, The Coffee Jacobins » donne « Valentine »), ou null. */
export function prenomDepuisSignature(signature: string | null): string | null {
  if (!signature) return null;
  const avantVirgule = signature.split(",")[0].trim();
  if (avantVirgule.split(/\s+/).length !== 1) return null;
  return prenomPourSalutation(avantVirgule);
}

/** « Bonjour Margaux », ou « Bonsoir » à partir de 18 h et avant 5 h. */
export function salutation(heure: number, prenom: string | null): string {
  const mot = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour";
  return prenom ? `${mot} ${prenom}` : mot;
}
