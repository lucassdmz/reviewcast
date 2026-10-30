import type { z } from "zod";
import { adressesGoogle, DELAI_APPEL_MS } from "./config";
import {
  avisGoogleSchema,
  MASQUE_FICHE,
  pageAvisSchema,
  pageComptesSchema,
  pageFichesSchema,
  reglageNotificationsSchema,
  type AvisGoogle,
  type CompteGoogle,
  type FicheGoogle,
  type ReglageNotifications,
} from "./schemas";

/**
 * Client serveur des API Google Business Profile. Il ne connaît que le jeton
 * d'accès qu'on lui donne ; le renouvellement est dans lib/google/connexion.ts.
 */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly statut: number | null,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

/** Au plus 50 avis par page pour reviews.list, au plus 100 fiches, au plus 20 comptes. */
const TAILLE_PAGE_AVIS = 50;
const TAILLE_PAGE_FICHES = 100;
/** Garde-fou contre un jeton de page qui ne finirait jamais. */
const PAGES_MAX = 2_000;

export interface ListeAvis {
  avis: AvisGoogle[];
  /** Faux si au moins un avis était illisible : on ne peut alors rien déduire des absents. */
  complete: boolean;
  illisibles: number;
}

export class ClientGoogle {
  constructor(private readonly obtenirJeton: () => Promise<string>) {}

  private async appeler<S extends z.ZodType>(url: string, schema: S, options: { method?: string; corps?: unknown } = {}): Promise<z.output<S>> {
    const jeton = await this.obtenirJeton();
    let reponse: Response;
    try {
      reponse = await fetch(url, {
        method: options.method ?? "GET",
        headers: { Authorization: `Bearer ${jeton}`, ...(options.corps ? { "Content-Type": "application/json" } : {}) },
        body: options.corps ? JSON.stringify(options.corps) : undefined,
        signal: AbortSignal.timeout(DELAI_APPEL_MS),
      });
    } catch (error) {
      throw new GoogleApiError(`Google ne répond pas : ${error instanceof Error ? error.message : "erreur réseau"}`, null);
    }
    if (!reponse.ok) throw new GoogleApiError(`Google a répondu ${reponse.status} sur ${new URL(url).pathname}`, reponse.status);
    const lu = schema.safeParse(await reponse.json().catch(() => null));
    if (!lu.success) throw new GoogleApiError(`Réponse de Google inattendue sur ${new URL(url).pathname}`, reponse.status);
    return lu.data;
  }

  /** accounts.list : tous les comptes accessibles, le compte personnel en premier. */
  async listerComptes(): Promise<CompteGoogle[]> {
    const comptes: CompteGoogle[] = [];
    let page: string | undefined;
    for (let i = 0; i < PAGES_MAX; i++) {
      const url = new URL(`${adressesGoogle().comptes}/accounts`);
      if (page) url.searchParams.set("pageToken", page);
      const r = await this.appeler(url.toString(), pageComptesSchema);
      comptes.push(...r.accounts);
      page = r.nextPageToken;
      if (!page) break;
    }
    return comptes;
  }

  /** accounts.locations.list : toutes les fiches d'un compte. */
  async listerFiches(compte: string): Promise<FicheGoogle[]> {
    const fiches: FicheGoogle[] = [];
    let page: string | undefined;
    for (let i = 0; i < PAGES_MAX; i++) {
      const url = new URL(`${adressesGoogle().fiches}/${compte}/locations`);
      url.searchParams.set("readMask", MASQUE_FICHE);
      url.searchParams.set("pageSize", String(TAILLE_PAGE_FICHES));
      if (page) url.searchParams.set("pageToken", page);
      const r = await this.appeler(url.toString(), pageFichesSchema);
      fiches.push(...r.locations);
      page = r.nextPageToken;
      if (!page) break;
    }
    return fiches;
  }

  /** accounts.locations.reviews.list : tout l'historique, page par page. `fiche` vaut accounts/{a}/locations/{l}. */
  async listerAvis(fiche: string): Promise<ListeAvis> {
    const avis: AvisGoogle[] = [];
    let illisibles = 0;
    let page: string | undefined;
    for (let i = 0; i < PAGES_MAX; i++) {
      const url = new URL(`${adressesGoogle().avis}/${fiche}/reviews`);
      url.searchParams.set("pageSize", String(TAILLE_PAGE_AVIS));
      if (page) url.searchParams.set("pageToken", page);
      const r = await this.appeler(url.toString(), pageAvisSchema);
      for (const brut of r.reviews) {
        const lu = avisGoogleSchema.safeParse(brut);
        if (lu.success) avis.push(lu.data);
        else illisibles += 1;
      }
      page = r.nextPageToken;
      if (!page) break;
    }
    return { avis, complete: illisibles === 0, illisibles };
  }

  async lireReglageNotifications(compte: string): Promise<ReglageNotifications> {
    return this.appeler(`${adressesGoogle().notifications}/${compte}/notificationSetting`, reglageNotificationsSchema);
  }

  /**
   * accounts.updateNotificationSetting. La référence et le guide de Google ne
   * disent pas la même chose du masque ; celui-ci nomme les deux champs modifiés.
   */
  async ecrireReglageNotifications(compte: string, sujet: string, types: string[]): Promise<ReglageNotifications> {
    const url = new URL(`${adressesGoogle().notifications}/${compte}/notificationSetting`);
    url.searchParams.set("updateMask", "pubsubTopic,notificationTypes");
    return this.appeler(url.toString(), reglageNotificationsSchema, {
      method: "PATCH",
      corps: { name: `${compte}/notificationSetting`, pubsubTopic: sujet, notificationTypes: types },
    });
  }
}
