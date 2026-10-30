import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import { adressesGoogle } from "./config";

/**
 * Réception des notifications Cloud Pub/Sub (mode push). Le jeton OIDC signé
 * par Google est vérifié avant tout : signature, émetteur, audience, compte de
 * service. Sans configuration, tout est refusé.
 */
const EMETTEURS = ["https://accounts.google.com", "accounts.google.com"];

export interface ConfigPubSub {
  audience: string;
  compteService: string;
}

export function configPubSub(): ConfigPubSub | null {
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE?.trim();
  const compteService = process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT?.trim();
  return audience && compteService ? { audience, compteService } : null;
}

const revendications = z.object({ email: z.string(), email_verified: z.literal(true) });

export async function jetonPubSubValide(entete: string | null, config: ConfigPubSub | null, cles: JWTVerifyGetKey): Promise<boolean> {
  if (!config || !entete?.startsWith("Bearer ")) return false;
  try {
    const { payload } = await jwtVerify(entete.slice("Bearer ".length), cles, {
      issuer: EMETTEURS,
      audience: config.audience,
      algorithms: ["RS256"],
    });
    const lu = revendications.safeParse(payload);
    return lu.success && lu.data.email === config.compteService;
  } catch {
    return false;
  }
}

let clesGoogle: { url: string; cles: JWTVerifyGetKey } | null = null;

/** Clés publiques de Google, mises en cache par jose. */
export function clesOidcGoogle(): JWTVerifyGetKey {
  const url = adressesGoogle().clesOidc;
  if (clesGoogle?.url !== url) clesGoogle = { url, cles: createRemoteJWKSet(new URL(url)) };
  return clesGoogle.cles;
}

const enveloppeSchema = z.object({
  message: z.object({
    data: z.string().optional(),
    publishTime: z.string().optional(),
  }),
});

/**
 * Contenu de la notification. La documentation de Google nomme `reviewName` et
 * `locationName` sans publier d'exemple de message complet : les variantes
 * plausibles sont acceptées, le type et les noms restent facultatifs.
 */
const contenuSchema = z.object({
  notificationType: z.string().optional(),
  type: z.string().optional(),
  locationName: z.string().optional(),
  location: z.string().optional(),
  reviewName: z.string().optional(),
  review: z.string().optional(),
});

const TYPES_AVIS = new Set(["NEW_REVIEW", "UPDATED_REVIEW"]);

export interface NotificationAvis {
  /** Nom de ressource de la fiche ou de l'avis, d'où l'on tire la fiche. */
  ressource: string;
  publieLe: Date | null;
}

/** Null si le message ne concerne pas un avis identifiable : il est alors acquitté sans suite. */
export function lireNotification(corps: unknown): NotificationAvis | null {
  const enveloppe = enveloppeSchema.safeParse(corps);
  if (!enveloppe.success || !enveloppe.data.message.data) return null;
  let brut: unknown;
  try {
    brut = JSON.parse(Buffer.from(enveloppe.data.message.data, "base64").toString("utf8"));
  } catch {
    return null;
  }
  const contenu = contenuSchema.safeParse(brut);
  if (!contenu.success) return null;
  const { notificationType, type, locationName, location, reviewName, review } = contenu.data;
  const genre = notificationType ?? type;
  if (genre && !TYPES_AVIS.has(genre)) return null;
  const ressource = locationName ?? location ?? reviewName ?? review;
  if (!ressource) return null;
  const date = enveloppe.data.message.publishTime ? new Date(enveloppe.data.message.publishTime) : null;
  return { ressource, publieLe: date && !Number.isNaN(date.getTime()) ? date : null };
}
