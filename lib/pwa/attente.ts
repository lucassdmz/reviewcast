/**
 * Les actions parties sans réseau (enregistrer, publier) : Next les garde et
 * les renvoie au retour de la connexion, tant que l'application reste ouverte.
 * Ce petit registre les compte, pour le dire clairement et pour ne pas
 * recharger la page pendant qu'une action attend (elle serait perdue).
 */
type Ecouteur = () => void;

export interface RegistreAttente {
  /** Déclare une action en attente ; la fonction renvoyée la retire. */
  ajouter(): () => void;
  nombre(): number;
  abonner(ecouteur: Ecouteur): () => void;
}

export function creerRegistreAttente(): RegistreAttente {
  let nombre = 0;
  const ecouteurs = new Set<Ecouteur>();
  const prevenir = () => ecouteurs.forEach((e) => e());
  return {
    ajouter() {
      nombre += 1;
      prevenir();
      let retiree = false;
      return () => {
        if (retiree) return;
        retiree = true;
        nombre -= 1;
        prevenir();
      };
    },
    nombre: () => nombre,
    abonner(ecouteur) {
      ecouteurs.add(ecouteur);
      return () => ecouteurs.delete(ecouteur);
    },
  };
}

/** Le registre de l'application, partagé par tous les écrans d'un même onglet. */
export const actionsEnAttente = creerRegistreAttente();

/** Phrase du bandeau hors ligne. Les actions en attente passent en premier : c'est ce qu'il faut savoir. */
export function messageHorsLigne(enAttente: number): string {
  if (enAttente === 0) return "Hors ligne. Vous lisez les derniers avis chargés.";
  const actions = enAttente === 1 ? "Votre action partira" : `Vos ${enAttente} actions partiront`;
  return `Hors ligne. ${actions} au retour du réseau : gardez l'application ouverte.`;
}
