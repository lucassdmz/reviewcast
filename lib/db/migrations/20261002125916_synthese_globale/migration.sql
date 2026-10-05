-- AlterTable
ALTER TABLE "monthly_summaries" ADD COLUMN     "phrase" TEXT,
ALTER COLUMN "location_id" DROP NOT NULL;
