-- AlterEnum
ALTER TYPE "review_status" ADD VALUE 'HORS_FILE';

-- AlterTable
ALTER TABLE "review_analyses" ADD COLUMN     "hors_sujet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "probleme_detecte" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "statut" SET DEFAULT 'HORS_FILE';

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "tache" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL,
    "tokens_out" INTEGER NOT NULL,
    "cache_read" INTEGER NOT NULL DEFAULT 0,
    "cache_write" INTEGER NOT NULL DEFAULT 0,
    "batch" BOOLEAN NOT NULL DEFAULT false,
    "cout_estime" DECIMAL(10,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage"("created_at");
