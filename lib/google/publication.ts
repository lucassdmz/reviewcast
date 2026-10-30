/**
 * Publication d'une réponse sur Google Business Profile (`reviews.updateReply`).
 * Le publieur réel utilise le jeton de la connexion qui porte la fiche ; le
 * publieur simulé sert aux tests et à la démonstration. Dans les deux cas,
 * l'appel n'a lieu qu'après une action explicite de l'utilisateur.
 */
import { adressesGoogle, DELAI_APPEL_MS } from "./config";
import { reponsePublieeSchema } from "./schemas";

export interface DemandePublication {
  /** Nom de ressource Google : accounts/{a}/locations/{l}/reviews/{r}. */
  googleReviewId: string;
  texte: string;
}

export interface ResultatPublication {
  dateReponse: Date;
}

export interface PublieurReponses {
  readonly simule: boolean;
  publier(demande: DemandePublication): Promise<ResultatPublication>;
}

export class PublicationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PublicationError";
  }
}

export class PublieurSimule implements PublieurReponses {
  readonly simule = true;
  readonly publications: DemandePublication[] = [];

  async publier(demande: DemandePublication): Promise<ResultatPublication> {
    this.publications.push(demande);
    return { dateReponse: new Date() };
  }
}

/** Le jeton dépend de la fiche qui porte l'avis. */
export type FournisseurJeton = (googleReviewId: string) => Promise<string>;

export class PublieurGoogle implements PublieurReponses {
  readonly simule = false;

  constructor(private readonly obtenirJeton: FournisseurJeton) {}

  async publier(demande: DemandePublication): Promise<ResultatPublication> {
    if (!/^accounts\/[^/]+\/locations\/[^/]+\/reviews\/[^/]+$/.test(demande.googleReviewId)) {
      throw new PublicationError("Identifiant d'avis Google inattendu : synchronisez la fiche avant de publier.");
    }
    const jeton = await this.obtenirJeton(demande.googleReviewId);
    const reponse = await fetch(`${adressesGoogle().avis}/${demande.googleReviewId}/reply`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comment: demande.texte }),
      signal: AbortSignal.timeout(DELAI_APPEL_MS),
    });
    if (!reponse.ok) {
      throw new PublicationError(`Google a refusé la publication (${reponse.status}).`, await reponse.text().catch(() => undefined));
    }
    const corps = reponsePublieeSchema.safeParse(await reponse.json().catch(() => null));
    return { dateReponse: corps.success && corps.data.updateTime ? new Date(corps.data.updateTime) : new Date() };
  }
}

/**
 * Choisit le publieur : simulé si PUBLICATION_GOOGLE=simulee (démo, tests),
 * sinon le publieur réel, qui utilise le jeton de la fiche connectée.
 */
export function creerPublieur(fournisseur: FournisseurJeton = jetonDepuisLaBase): PublieurReponses {
  if (process.env.PUBLICATION_GOOGLE === "simulee") return new PublieurSimule();
  return new PublieurGoogle(fournisseur);
}

/** Chargé à la demande : les tests unitaires du publieur n'ont pas de base. */
async function jetonDepuisLaBase(googleReviewId: string): Promise<string> {
  const { jetonPourAvis } = await import("./connexion");
  try {
    return await jetonPourAvis(googleReviewId);
  } catch (error) {
    throw new PublicationError("Compte Google non connecté : connectez votre fiche dans Réglages.", error);
  }
}
