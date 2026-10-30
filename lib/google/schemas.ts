import { z } from "zod";

/**
 * Réponses de Google, validées avant tout usage. Les champs absents de la
 * documentation restent ignorés, ceux dont on a besoin sont exigés.
 */
const dateGoogle = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date Google illisible");

export const jetonSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.coerce.number().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});
export type ReponseJeton = z.infer<typeof jetonSchema>;

export const erreurJetonSchema = z.object({ error: z.string() });

const compteSchema = z.object({
  name: z.string().regex(/^accounts\/[^/]+$/),
  accountName: z.string().optional(),
  type: z.string().optional(),
});
export type CompteGoogle = z.infer<typeof compteSchema>;

export const pageComptesSchema = z.object({
  accounts: z.array(compteSchema).default([]),
  nextPageToken: z.string().optional(),
});

const ficheSchema = z.object({
  name: z.string().regex(/^locations\/[^/]+$/),
  title: z.string().min(1),
  storefrontAddress: z.object({ addressLines: z.array(z.string()).optional(), postalCode: z.string().optional(), locality: z.string().optional() }).optional(),
  metadata: z.object({ newReviewUri: z.string().url().optional(), placeId: z.string().optional() }).optional(),
});
export type FicheGoogle = z.infer<typeof ficheSchema>;

export const pageFichesSchema = z.object({
  locations: z.array(ficheSchema).default([]),
  nextPageToken: z.string().optional(),
});

/** Champs de la fiche demandés à Google (readMask est obligatoire). */
export const MASQUE_FICHE = "name,title,storefrontAddress,metadata";

export function adresseDeLaFiche(fiche: FicheGoogle): string | null {
  const a = fiche.storefrontAddress;
  if (!a) return null;
  const ville = [a.postalCode, a.locality].filter(Boolean).join(" ");
  const morceaux = [...(a.addressLines ?? []), ville].filter(Boolean);
  return morceaux.length > 0 ? morceaux.join(", ") : null;
}

export const avisGoogleSchema = z.object({
  name: z.string().regex(/^accounts\/[^/]+\/locations\/[^/]+\/reviews\/[^/]+$/),
  reviewer: z.object({ displayName: z.string().optional(), isAnonymous: z.boolean().optional() }).optional(),
  starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE"]),
  comment: z.string().optional(),
  createTime: dateGoogle,
  updateTime: dateGoogle,
  reviewReply: z
    .object({
      comment: z.string(),
      updateTime: dateGoogle.optional(),
      reviewReplyState: z.string().optional(),
    })
    .optional(),
});
export type AvisGoogle = z.infer<typeof avisGoogleSchema>;

/** Chaque avis est validé à part : un avis illisible n'empêche pas de lire les autres. */
export const pageAvisSchema = z.object({
  reviews: z.array(z.unknown()).default([]),
  nextPageToken: z.string().optional(),
});

export const reglageNotificationsSchema = z.object({
  name: z.string().optional(),
  pubsubTopic: z.string().optional(),
  notificationTypes: z.array(z.string()).optional(),
});
export type ReglageNotifications = z.infer<typeof reglageNotificationsSchema>;

export const reponsePublieeSchema = z.object({ updateTime: dateGoogle.optional() });
