import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicationError, PublieurGoogle, PublieurSimule, creerPublieur } from "@/lib/google/publication";

describe("publication des réponses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("le publieur simulé enregistre la demande sans réseau", async () => {
    const p = new PublieurSimule();
    const r = await p.publier({ googleReviewId: "fx-001", texte: "Merci" });
    expect(r.dateReponse).toBeInstanceOf(Date);
    expect(p.publications).toHaveLength(1);
  });

  it("le publieur Google appelle reviews.updateReply avec le jeton", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ updateTime: "2026-10-02T10:00:00Z" }) });
    vi.stubGlobal("fetch", fetchMock);
    const p = new PublieurGoogle(async () => "jeton");
    const r = await p.publier({ googleReviewId: "accounts/1/locations/2/reviews/3", texte: "Merci" });
    expect(r.dateReponse.toISOString()).toBe("2026-10-02T10:00:00.000Z");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews/3/reply");
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer jeton");
    expect(JSON.parse(options.body)).toEqual({ comment: "Merci" });
  });

  it("refuse un identifiant d'avis qui n'est pas un nom de ressource Google", async () => {
    const p = new PublieurGoogle(async () => "jeton");
    await expect(p.publier({ googleReviewId: "fx-001", texte: "Merci" })).rejects.toBeInstanceOf(PublicationError);
  });

  it("remonte un refus de Google en français", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "forbidden" }));
    const p = new PublieurGoogle(async () => "jeton");
    await expect(p.publier({ googleReviewId: "accounts/1/locations/2/reviews/3", texte: "Merci" })).rejects.toThrow(/403/);
  });

  it("la fabrique choisit le publieur selon l'environnement", async () => {
    vi.stubEnv("PUBLICATION_GOOGLE", "simulee");
    expect(creerPublieur().simule).toBe(true);
    vi.stubEnv("PUBLICATION_GOOGLE", "");
    const reel = creerPublieur();
    expect(reel.simule).toBe(false);
    await expect(reel.publier({ googleReviewId: "accounts/1/locations/2/reviews/3", texte: "Merci" })).rejects.toThrow(/non connecté/);
  });
});
