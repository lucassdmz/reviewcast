/**
 * Apparence de l'application : claire par défaut, sombre, ou alignée sur le
 * réglage du téléphone. Le choix est propre à chaque appareil : il est gardé
 * dans un cookie, lu par le serveur pour afficher le bon thème dès le premier
 * rendu, sans clignotement.
 */
export const THEMES = ["clair", "sombre", "systeme"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_PAR_DEFAUT: Theme = "clair";
export const COOKIE_THEME = "apparence";

export const LIBELLES_THEME: Record<Theme, { titre: string; detail: string }> = {
  clair: { titre: "Clair", detail: "Fond clair, de jour comme de nuit." },
  sombre: { titre: "Sombre", detail: "Fond sombre, plus doux le soir." },
  systeme: { titre: "Réglage du téléphone", detail: "Suit le mode clair ou sombre de l'appareil." },
};

/** Thème à appliquer pour une valeur de cookie : toute valeur inconnue ou absente donne le thème clair. */
export function lireTheme(valeur: string | undefined | null): Theme {
  return (THEMES as readonly string[]).includes(valeur ?? "") ? (valeur as Theme) : THEME_PAR_DEFAUT;
}

export const COULEUR_BARRE = { clair: "#f1f2f0", sombre: "#111213" } as const;
