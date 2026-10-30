-- AlterTable
ALTER TABLE "google_connections" ADD COLUMN     "a_reconnecter_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "derniere_liste_at" TIMESTAMP(3),
ADD COLUMN     "google_compte" TEXT,
ADD COLUMN     "notifications_google" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "analyse_a_faire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyse_reservee_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reviews_location_id_analyse_a_faire_idx" ON "reviews"("location_id", "analyse_a_faire");
