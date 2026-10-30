import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientGoogle, GoogleApiError } from "@/lib/google/client";
import { adressesGoogle } from "@/lib/google/config";
import { AccesRetire, echangerCode, renouvelerJeton } from "@/lib/google/oauth";
import { PublieurGoogle } from "@/lib/google/publication";
import { CLIENT_ID, CLIENT_SECRET, COMPTE_GROUPE, COMPTE_PERSO, demarrerFauxGoogle, FICHE_PRINCIPALE, type FauxGoogle } from "../fake-google/faux-google";

/** Le client contre le faux serveur, en vrai HTTP : URLs, paramètres et validation sont réellement exercés. */
describe("client Google", () => {
  let g: FauxGoogle;
  const ids = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };

  beforeAll(async () => {
    g = await demarrerFauxGoogle();
  });
  afterAll(() => g.fermer());
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_BASE_URL", g.url);
    vi.stubEnv("GOOGLE_OAUTH_BASE_URL", g.url);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function clientAvecJeton(): Promise<ClientGoogle> {
    const redirect = "https://app.test/api/google/callback";
    g.etat().codes.set("code-test", redirect);
    const r = await echangerCode(ids, "code-test", redirect);
    return new ClientGoogle(async () => r.access_token);
  }

  it("échange le code, puis renouvelle le jeton", async () => {
    const redirect = "https://app.test/api/google/callback";
    g.etat().codes.set("code-2", redirect);
    const r = await echangerCode(ids, "code-2", redirect);
    expect(r.refresh_token).toBeTruthy();
    const renouvele = await renouvelerJeton(ids, r.refresh_token ?? "");
    expect(renouvele.access_token).not.toBe(r.access_token);
  });

  it("reconnaît un accès retiré", async () => {
    await expect(renouvelerJeton(ids, "inconnu")).rejects.toBeInstanceOf(AccesRetire);
  });

  it("liste les comptes et les fiches, avec le readMask exigé", async () => {
    const c = await clientAvecJeton();
    expect((await c.listerComptes()).map((x) => x.name)).toEqual([COMPTE_PERSO, COMPTE_GROUPE]);
    const [fiche] = await c.listerFiches(COMPTE_PERSO);
    expect(fiche.name).toBe(FICHE_PRINCIPALE);
    expect(fiche.metadata?.newReviewUri).toContain("writereview");
  });

  it("lit tout l'historique, page par page", async () => {
    const c = await clientAvecJeton();
    const r = await c.listerAvis(`${COMPTE_PERSO}/${FICHE_PRINCIPALE}`);
    expect(r.avis).toHaveLength(59);
    expect(r.complete).toBe(true);
    expect(new Set(r.avis.map((a) => a.name)).size).toBe(59);
  });

  it("signale un avis illisible sans bloquer les autres", async () => {
    const c = await clientAvecJeton();
    g.etat().avis.unshift({ name: `${COMPTE_PERSO}/${FICHE_PRINCIPALE}/reviews/casse`, reviewer: {}, starRating: "STAR_RATING_UNSPECIFIED", createTime: "x", updateTime: "x" });
    const r = await c.listerAvis(`${COMPTE_PERSO}/${FICHE_PRINCIPALE}`);
    expect(r.illisibles).toBe(1);
    expect(r.complete).toBe(false);
    expect(r.avis).toHaveLength(59);
    g.etat().avis.shift();
  });

  it("remonte un refus de Google et une réponse inattendue", async () => {
    const refuse = new ClientGoogle(async () => "mauvais-jeton");
    await expect(refuse.listerComptes()).rejects.toMatchObject({ name: "GoogleApiError", statut: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts: [{ name: "pas-un-compte" }] }), { status: 200 })));
    await expect(new ClientGoogle(async () => "j").listerComptes()).rejects.toBeInstanceOf(GoogleApiError);
  });

  it("enregistre le sujet des notifications sur le compte", async () => {
    const c = await clientAvecJeton();
    await c.ecrireReglageNotifications(COMPTE_PERSO, "projects/p/topics/t", ["NEW_REVIEW", "UPDATED_REVIEW"]);
    const lu = await c.lireReglageNotifications(COMPTE_PERSO);
    expect(lu.pubsubTopic).toBe("projects/p/topics/t");
    expect(lu.notificationTypes).toEqual(["NEW_REVIEW", "UPDATED_REVIEW"]);
  });

  it("le publieur réel écrit la réponse, seulement quand on le lui demande", async () => {
    const redirect = "https://app.test/api/google/callback";
    g.etat().codes.set("code-3", redirect);
    const { access_token } = await echangerCode(ids, "code-3", redirect);
    const name = `${COMPTE_PERSO}/${FICHE_PRINCIPALE}/reviews/r-negatif`;
    expect(g.etat().reponsesPubliees).toEqual([]);
    const { dateReponse } = await new PublieurGoogle(async () => access_token).publier({ googleReviewId: name, texte: "Merci" });
    expect(dateReponse).toBeInstanceOf(Date);
    expect(g.etat().reponsesPubliees).toEqual([{ name, comment: "Merci" }]);
  });

  it("n'accepte aucune adresse de substitution en production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("GOOGLE_OIDC_JWKS_URL", "https://attaquant.test/cles");
    const a = adressesGoogle();
    expect(a.avis).toBe("https://mybusiness.googleapis.com/v4");
    expect(a.jeton).toBe("https://oauth2.googleapis.com/token");
    expect(a.clesOidc).toBe("https://www.googleapis.com/oauth2/v3/certs");
  });
});
