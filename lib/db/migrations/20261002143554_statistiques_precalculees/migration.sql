-- AlterTable
ALTER TABLE "review_analysis_themes" ADD COLUMN     "polarite" "polarite" NOT NULL DEFAULT 'MIXTE';

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "jour" DATE NOT NULL,
    "volume" INTEGER NOT NULL,
    "somme_notes" INTEGER NOT NULL,
    "nb1" INTEGER NOT NULL DEFAULT 0,
    "nb2" INTEGER NOT NULL DEFAULT 0,
    "nb3" INTEGER NOT NULL DEFAULT 0,
    "nb4" INTEGER NOT NULL DEFAULT 0,
    "nb5" INTEGER NOT NULL DEFAULT 0,
    "nb_negatifs" INTEGER NOT NULL DEFAULT 0,
    "nb_negatifs_repondus" INTEGER NOT NULL DEFAULT 0,
    "somme_delai_heures" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_stats" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "jour" DATE NOT NULL,
    "theme_id" TEXT NOT NULL,
    "polarite" "polarite" NOT NULL,
    "nombre" INTEGER NOT NULL,

    CONSTRAINT "theme_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_location_id_jour_key" ON "daily_stats"("location_id", "jour");

-- CreateIndex
CREATE INDEX "theme_stats_location_id_jour_idx" ON "theme_stats"("location_id", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "theme_stats_location_id_jour_theme_id_polarite_key" ON "theme_stats"("location_id", "jour", "theme_id", "polarite");

-- AddForeignKey
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_stats" ADD CONSTRAINT "theme_stats_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_stats" ADD CONSTRAINT "theme_stats_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
