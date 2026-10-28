-- Brouillons à jour des réglages : chaque brouillon garde les réglages de la voix
-- qui ont servi à l'écrire, et la raison d'une réécriture par l'application.
ALTER TABLE "drafts" ADD COLUMN "reglages" JSONB,
ADD COLUMN "motif" TEXT;
