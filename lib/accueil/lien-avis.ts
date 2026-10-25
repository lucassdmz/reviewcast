import { z } from "zod";

/**
 * Lien « Laisser un avis » de la fiche Google : il alimente le QR posé au
 * comptoir. Saisi à la main dans Réglages tant que la synchronisation Google
 * (lot 1) ne le fournit pas. Seuls les liens Google sont acceptés : le QR
 * doit mener à la fiche, nulle part ailleurs.
 */
const HOTES_GOOGLE = new Set(["g.page", "search.google.com", "www.google.com", "google.com", "maps.google.com", "www.google.fr", "google.fr", "maps.app.goo.gl", "goo.gl", "g.co"]);

export const lienAvisSchema = z
  .string()
  .trim()
  .max(500, "Ce lien est trop long.")
  .transform((v) => (v === "" ? null : v))
  .refine((v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" && HOTES_GOOGLE.has(url.hostname);
    } catch {
      return false;
    }
  }, "Collez le lien d’avis donné par Google (il commence par https://g.page/ ou https://search.google.com/).");
