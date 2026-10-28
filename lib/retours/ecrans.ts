/**
 * Reconnaît l'écran d'où part une remarque de bêta : un gabarit stable
 * (`/a-traiter/[id]`) pour regrouper les remarques d'un même écran, quel que
 * soit l'avis ouvert, et un nom lisible pour les relire.
 */
export interface Ecran {
  gabarit: string;
  libelle: string;
}

const SECTIONS_REGLAGES: Record<string, string> = {
  signature: "Signature",
  ton: "Ton",
  sujets: "Sujets",
  apprentissage: "Apprentissage",
  apercu: "Aperçu",
  avis: "Lien d’avis Google",
  apparence: "Apparence",
  etudes: "Pourquoi répondre",
  notifications: "Notifications",
};

const FIXES: Record<string, string> = {
  "/": "Accueil",
  "/a-traiter": "À traiter",
  "/a-traiter/historique": "Réponses publiées",
  "/avis": "Tous les avis",
  "/tendances": "Tendances",
  "/reglages": "Réglages",
};

/** Chemin sans paramètres, sans fragment ni barre finale. */
export function cheminNu(chemin: string): string {
  const nu = chemin.split(/[?#]/)[0] || "/";
  return nu.length > 1 ? nu.replace(/\/+$/, "") : nu;
}

export function reconnaitreEcran(chemin: string): Ecran {
  const nu = cheminNu(chemin);
  if (FIXES[nu]) return { gabarit: nu, libelle: FIXES[nu] };

  const segments = nu.split("/").filter(Boolean);
  if (segments[0] === "a-traiter" && segments.length === 2) return { gabarit: "/a-traiter/[id]", libelle: "Fiche d’un avis" };
  if (segments[0] === "tendances" && segments[1] === "theme" && segments.length === 3) {
    return { gabarit: "/tendances/theme/[id]", libelle: "Thème de Tendances" };
  }
  if (segments[0] === "reglages" && segments.length === 2) {
    const section = SECTIONS_REGLAGES[segments[1]];
    if (section) return { gabarit: nu, libelle: `Réglages › ${section}` };
  }
  return { gabarit: nu, libelle: nu };
}
