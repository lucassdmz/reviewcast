/**
 * Publication d'une réponse sur Google Business Profile (`reviews.updateReply`).
 * Le publieur réel sera branché sur l'OAuth du lot 1 ; le publieur simulé sert
 * aux tests et à la démonstration. Dans les deux cas, l'appel n'a lieu
 * qu'après une action explicite de l'utilisateur.
 */
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

const API = "https://mybusiness.googleapis.com/v4";

export class PublieurGoogle implements PublieurReponses {
  readonly simule = false;

  constructor(private readonly obtenirJeton: () => Promise<string>) {}

  async publier(demande: DemandePublication): Promise<ResultatPublication> {
    if (!/^accounts\/[^/]+\/locations\/[^/]+\/reviews\/[^/]+$/.test(demande.googleReviewId)) {
      throw new PublicationError("Identifiant d'avis Google inattendu : synchronisez la fiche avant de publier.");
    }
    const jeton = await this.obtenirJeton();
    const reponse = await fetch(`${API}/${demande.googleReviewId}/reply`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comment: demande.texte }),
    });
    if (!reponse.ok) {
      throw new PublicationError(`Google a refusé la publication (${reponse.status}).`, await reponse.text().catch(() => undefined));
    }
    const corps = (await reponse.json()) as { updateTime?: string };
    return { dateReponse: corps.updateTime ? new Date(corps.updateTime) : new Date() };
  }
}

/**
 * Choisit le publieur : simulé si PUBLICATION_GOOGLE=simulee (démo, tests),
 * sinon le publieur réel, qui exige la connexion Google du lot 1.
 */
export function creerPublieur(): PublieurReponses {
  if (process.env.PUBLICATION_GOOGLE === "simulee") return new PublieurSimule();
  return new PublieurGoogle(async () => {
    throw new PublicationError("Compte Google non connecté : connectez votre fiche dans Réglages.");
  });
}
