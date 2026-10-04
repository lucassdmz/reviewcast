-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "contact" TEXT,
ADD COLUMN     "mots_evites" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "regles_sujets" JSONB;
