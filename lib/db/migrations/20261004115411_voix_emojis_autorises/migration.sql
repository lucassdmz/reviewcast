-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "emojis_autorises" TEXT[] DEFAULT ARRAY[]::TEXT[];
