-- CreateEnum
CREATE TYPE "statut_lot" AS ENUM ('PREPARATION', 'EN_COURS', 'TERMINE', 'ABANDONNE');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "analyse_en_lot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lot_analyse_id" TEXT;

-- CreateTable
CREATE TABLE "lots_analyse" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "id_fournisseur" TEXT,
    "statut" "statut_lot" NOT NULL DEFAULT 'PREPARATION',
    "nb_avis" INTEGER NOT NULL,
    "releve_le" TIMESTAMP(3),
    "termine_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lots_analyse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lots_analyse_location_id_statut_idx" ON "lots_analyse"("location_id", "statut");

-- CreateIndex
CREATE INDEX "reviews_lot_analyse_id_idx" ON "reviews"("lot_analyse_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lot_analyse_id_fkey" FOREIGN KEY ("lot_analyse_id") REFERENCES "lots_analyse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots_analyse" ADD CONSTRAINT "lots_analyse_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
