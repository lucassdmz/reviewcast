-- CreateTable
CREATE TABLE "retours_beta" (
    "id" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "gabarit" TEXT NOT NULL,
    "ecran" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "appareil" TEXT NOT NULL,
    "etablissement" TEXT,
    "element" JSONB,
    "contexte" JSONB NOT NULL,
    "capture" BYTEA,
    "capture_type" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "reponse" TEXT,
    "commit" TEXT,
    "traite_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retours_beta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retours_beta_statut_gabarit_idx" ON "retours_beta"("statut", "gabarit");

-- CreateIndex
CREATE INDEX "retours_beta_chemin_idx" ON "retours_beta"("chemin");

