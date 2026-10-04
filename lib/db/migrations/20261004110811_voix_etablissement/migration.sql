-- CreateEnum
CREATE TYPE "personne" AS ENUM ('JE', 'NOUS');

-- CreateEnum
CREATE TYPE "registre" AS ENUM ('SOBRE', 'CHALEUREUX', 'COMPLICE');

-- CreateEnum
CREATE TYPE "longueur" AS ENUM ('COURTE', 'MOYENNE');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "apprendre_corrections" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emojis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longueur" "longueur" NOT NULL DEFAULT 'MOYENNE',
ADD COLUMN     "personne" "personne" NOT NULL DEFAULT 'NOUS',
ADD COLUMN     "registre" "registre" NOT NULL DEFAULT 'CHALEUREUX',
ADD COLUMN     "signature" TEXT;

-- CreateTable
CREATE TABLE "corrections" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "brouillon" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corrections_review_id_key" ON "corrections"("review_id");

-- CreateIndex
CREATE INDEX "corrections_location_id_created_at_idx" ON "corrections"("location_id", "created_at");

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
