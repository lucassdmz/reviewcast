import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { creerEtat, etatValide, DUREE_ETAT_MS } from "@/lib/google/etat-oauth";
import { deciderNotification, intervallePour, limitePourLister } from "@/lib/google/limites";
import { scopeAccorde, urlAutorisation } from "@/lib/google/oauth";
import { jetonPubSubValide, lireNotification } from "@/lib/google/pubsub";

describe("state de l'OAuth de la fiche", () => {
  const SECRET = "un-secret-de-test-assez-long";

  it("accepte le state émis pour cet utilisateur et ce navigateur", () => {
    const { etat, nonce } = creerEtat("u1", SECRET);
    expect(etatValide(etat, { userId: "u1", nonce, secret: SECRET })).toBe(true);
  });

  it("refuse un autre utilisateur, un autre navigateur, une autre clé", () => {
    const { etat, nonce } = creerEtat("u1", SECRET);
    expect(etatValide(etat, { userId: "u2", nonce, secret: SECRET })).toBe(false);
    expect(etatValide(etat, { userId: "u1", nonce: "autre-nonce-assez-long-pour-passer", secret: SECRET })).toBe(false);
    expect(etatValide(etat, { userId: "u1", nonce: undefined, secret: SECRET })).toBe(false);
    expect(etatValide(etat, { userId: "u1", nonce, secret: "une-autre-cle-de-signature" })).toBe(false);
  });

  it("refuse un state falsifié, absent ou expiré", () => {
    const { etat, nonce } = creerEtat("u1", SECRET);
    const [donnees, signature] = etat.split(".");
    const faux = Buffer.from(JSON.stringify({ u: "u1", n: nonce, e: Date.now() + 10 ** 9 })).toString("base64url");
    expect(etatValide(`${faux}.${signature}`, { userId: "u1", nonce, secret: SECRET })).toBe(false);
    expect(etatValide(donnees, { userId: "u1", nonce, secret: SECRET })).toBe(false);
    expect(etatValide(null, { userId: "u1", nonce, secret: SECRET })).toBe(false);
    expect(etatValide(etat, { userId: "u1", nonce, secret: SECRET, maintenant: Date.now() + DUREE_ETAT_MS + 1000 })).toBe(false);
  });
});

describe("écran de consentement", () => {
  it("demande l'accès hors ligne, le consentement et le seul scope de la fiche", () => {
    const u = new URL(urlAutorisation({ clientId: "id", clientSecret: "s" }, "https://app.test/api/google/callback", "etat"));
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(u.searchParams)).toEqual({
      client_id: "id",
      redirect_uri: "https://app.test/api/google/callback",
      response_type: "code",
      scope: "https://www.googleapis.com/auth/business.manage",
      access_type: "offline",
      prompt: "consent",
      state: "etat",
    });
    expect(scopeAccorde("openid https://www.googleapis.com/auth/business.manage")).toBe(true);
    expect(scopeAccorde("openid")).toBe(false);
    expect(scopeAccorde(undefined)).toBe(false);
  });
});

describe("jeton OIDC de Pub/Sub", () => {
  const CONFIG = { audience: "https://app.test/push", compteService: "push@projet.iam.gserviceaccount.com" };

  async function preparer() {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const cles = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "k", alg: "RS256" }] });
    const signer = (revendications: Record<string, unknown> = {}, o: { aud?: string; iss?: string; exp?: string; cle?: typeof privateKey } = {}) =>
      new SignJWT({ email: CONFIG.compteService, email_verified: true, ...revendications })
        .setProtectedHeader({ alg: "RS256", kid: "k" })
        .setIssuer(o.iss ?? "https://accounts.google.com")
        .setAudience(o.aud ?? CONFIG.audience)
        .setIssuedAt()
        .setExpirationTime(o.exp ?? "1h")
        .sign(o.cle ?? privateKey);
    return { cles, signer };
  }

  it("accepte un jeton signé, pour la bonne audience et le bon compte", async () => {
    const { cles, signer } = await preparer();
    expect(await jetonPubSubValide(`Bearer ${await signer()}`, CONFIG, cles)).toBe(true);
    expect(await jetonPubSubValide(`Bearer ${await signer({}, { iss: "accounts.google.com" })}`, CONFIG, cles)).toBe(true);
  });

  it("rejette tout le reste", async () => {
    const { cles, signer } = await preparer();
    const autre = await generateKeyPair("RS256");
    const refuses = [
      await signer({}, { aud: "https://ailleurs.test" }),
      await signer({}, { iss: "https://attaquant.test" }),
      await signer({}, { exp: "-1h" }),
      await signer({ email: "autre@projet.iam.gserviceaccount.com" }),
      await signer({ email_verified: false }),
      await signer({}, { cle: autre.privateKey }),
      "pas-un-jeton",
    ];
    for (const jeton of refuses) expect(await jetonPubSubValide(`Bearer ${jeton}`, CONFIG, cles)).toBe(false);
    expect(await jetonPubSubValide(null, CONFIG, cles)).toBe(false);
    expect(await jetonPubSubValide(await signer(), CONFIG, cles)).toBe(false);
  });

  it("refuse tout tant que la configuration est absente", async () => {
    const { cles, signer } = await preparer();
    expect(await jetonPubSubValide(`Bearer ${await signer()}`, null, cles)).toBe(false);
  });
});

describe("message Pub/Sub", () => {
  const enveloppe = (contenu: unknown, publishTime = "2026-10-30T10:00:00Z") => ({
    message: { data: Buffer.from(typeof contenu === "string" ? contenu : JSON.stringify(contenu)).toString("base64"), messageId: "1", publishTime },
    subscription: "projects/p/subscriptions/s",
  });

  it("lit la fiche concernée par un nouvel avis ou un avis modifié", () => {
    const n = lireNotification(enveloppe({ notificationType: "NEW_REVIEW", locationName: "accounts/1/locations/2", reviewName: "accounts/1/locations/2/reviews/3" }));
    expect(n?.ressource).toBe("accounts/1/locations/2");
    expect(n?.publieLe?.toISOString()).toBe("2026-10-30T10:00:00.000Z");
    expect(lireNotification(enveloppe({ type: "UPDATED_REVIEW", reviewName: "accounts/1/locations/2/reviews/3" }))?.ressource).toContain("reviews/3");
  });

  it("ignore les autres types et les messages illisibles, sans erreur", () => {
    expect(lireNotification(enveloppe({ notificationType: "GOOGLE_UPDATE", locationName: "accounts/1/locations/2" }))).toBeNull();
    expect(lireNotification(enveloppe({ notificationType: "NEW_REVIEW" }))).toBeNull();
    expect(lireNotification(enveloppe("pas du json"))).toBeNull();
    expect(lireNotification({ message: {} })).toBeNull();
    expect(lireNotification(null)).toBeNull();
  });
});

describe("rythme des listes", () => {
  const T = new Date("2026-10-30T10:00:00Z");
  const avant = (ms: number) => new Date(T.getTime() - ms);

  it("une liste toutes les 15 minutes, une minute pour une notification, sans limite à la connexion", () => {
    expect(intervallePour("ouverture")).toBe(900_000);
    expect(intervallePour("cron")).toBe(900_000);
    expect(intervallePour("notification")).toBe(60_000);
    expect(limitePourLister("connexion", T)).toEqual(T);
    expect(limitePourLister("ouverture", T)).toEqual(avant(900_000));
  });

  it("une notification déjà couverte par une liste postérieure est acquittée", () => {
    expect(deciderNotification(avant(30_000), avant(10_000), T)).toBe("deja-couverte");
  });

  it("une rafale attend, sans perdre le message", () => {
    expect(deciderNotification(avant(1_000), avant(20_000), T)).toBe("plus-tard");
    expect(deciderNotification(null, avant(20_000), T)).toBe("plus-tard");
  });

  it("synchronise si rien ne couvre le message et que l'intervalle est passé", () => {
    expect(deciderNotification(avant(1_000), avant(120_000), T)).toBe("synchroniser");
    expect(deciderNotification(avant(1_000), null, T)).toBe("synchroniser");
  });
});
