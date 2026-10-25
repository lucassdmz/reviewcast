/**
 * Repères tirés des études sur la réponse aux avis, affichés dans Réglages.
 * Le relevé complet, ses limites et ses sources sont dans docs/backlog.md.
 * Chaque repère reprend un résultat publié, sans l'étendre : ces études
 * portent surtout sur des hôtels, ce que l'écran rappelle.
 */
export interface RepereEtude {
  /** Le résultat en très court : un chiffre ou deux mots. */
  cle: string;
  texte: string;
  source: string;
}

export const REPERES_ETUDES: RepereEtude[] = [
  {
    cle: "+0,12 étoile",
    texte: "Les hôtels qui se mettent à répondre à leurs avis gagnent en moyenne 0,12 étoile et reçoivent 12 % d’avis en plus.",
    source: "Proserpio et Zervas, Marketing Science, 2017",
  },
  {
    cle: "Les avis négatifs d’abord",
    texte: "La note progresse surtout grâce aux réponses constructives aux avis négatifs. Au delà de 40 % d’avis répondus, répondre davantage n’apporte plus rien.",
    source: "Anderson et Han, université Cornell, 2016",
  },
  {
    cle: "Reformuler",
    texte: "Une réponse qui reprend ce que le client a vécu, avec une phrase d’empathie, est mieux jugée par ceux qui la lisent.",
    source: "Min, Lim et Magnini, Cornell Hospitality Quarterly, 2015",
  },
  {
    cle: "Des faits",
    texte: "Face à une plainte, dire ce qui s’est passé et ce qui change améliore davantage les avis suivants qu’une réponse seulement émotionnelle.",
    source: "Ravichandran et Deng, Information Systems Research, 2023",
  },
  {
    cle: "4,0 à 4,7",
    texte: "C’est la plage de notes qui convainc le plus. Une note parfaite paraît suspecte : quelques avis moyens rendent les autres crédibles.",
    source: "Spiegel Research Center, université Northwestern, 2017",
  },
  {
    cle: "5 à 9 %",
    texte: "Pour un restaurant indépendant, une étoile de plus correspond à 5 à 9 % de chiffre d’affaires en plus.",
    source: "Luca, Harvard Business School, 2016",
  },
];
