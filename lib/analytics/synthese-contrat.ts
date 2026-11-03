/**
 * Ce qu'échangent l'écran Tendances et la route de rédaction de la synthèse.
 * Aucun appel à l'IA ici, et aucune dépendance serveur : ce fichier part aussi
 * dans le navigateur.
 */

export interface SyntheseTendances {
  lignes: string[];
  /** Date de rédaction, au format ISO. */
  generee: string;
}

export type EtatRedaction = "prete" | "en_cours" | "vide" | "indisponible";

export interface ReponseSynthese {
  etat: EtatRedaction;
  synthese: SyntheseTendances | null;
}

export interface DemandeSynthese {
  periode: string;
  debut?: string;
  fin?: string;
  /** Vrai seulement après un geste explicite (« Régénérer ») : ce nouvel appel est payé. */
  forcer?: boolean;
}

export type ResultatDemande = ReponseSynthese | { etat: "hors_ligne"; synthese: null };

/** Une autre rédaction est en cours : on relit toutes les 3 s, une minute au plus. */
const ATTENTE_MS = 3000;
const RELECTURES_MAX = 20;

function lireReponse(donnees: unknown): ReponseSynthese | null {
  if (typeof donnees !== "object" || donnees === null) return null;
  const { etat, synthese } = donnees as { etat?: unknown; synthese?: unknown };
  if (etat !== "prete" && etat !== "en_cours" && etat !== "vide" && etat !== "indisponible") return null;
  if (synthese === null) return { etat, synthese: null };
  if (typeof synthese !== "object" || synthese === undefined) return null;
  const { lignes, generee } = synthese as { lignes?: unknown; generee?: unknown };
  if (!Array.isArray(lignes) || !lignes.every((l) => typeof l === "string") || typeof generee !== "string") return null;
  return { etat, synthese: { lignes: lignes as string[], generee } };
}

/**
 * Demande la synthèse au serveur et attend qu'elle soit là, dans une limite de
 * temps. Sans réseau, répond « hors_ligne » : l'écran reste lisible et l'on
 * réessaie au retour de la connexion.
 */
export async function demanderSynthese(
  demande: DemandeSynthese,
  appeler: typeof fetch = (...args) => fetch(...args),
  attendre: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<ResultatDemande> {
  let derniere: ReponseSynthese = { etat: "indisponible", synthese: null };
  for (let essai = 0; essai <= RELECTURES_MAX; essai += 1) {
    let reponse: Response;
    try {
      // Une relecture ne force plus : la rédaction demandée est déjà en cours.
      const corps = essai === 0 ? demande : { ...demande, forcer: false };
      reponse = await appeler("/api/tendances/synthese", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
    } catch {
      return { etat: "hors_ligne", synthese: null };
    }
    if (!reponse.ok) return { etat: "indisponible", synthese: derniere.synthese };
    const lue = lireReponse(await reponse.json().catch(() => null));
    if (!lue) return { etat: "indisponible", synthese: derniere.synthese };
    derniere = lue;
    if (lue.etat !== "en_cours") return lue;
    await attendre(ATTENTE_MS);
  }
  return { etat: "indisponible", synthese: derniere.synthese };
}
