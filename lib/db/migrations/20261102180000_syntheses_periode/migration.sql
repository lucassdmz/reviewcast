-- CreateTable
CREATE TABLE "syntheses_periode" (
    "id" TEXT NOT NULL,
    "portee" TEXT NOT NULL,
    "location_id" TEXT,
    "debut" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "libelle" TEXT NOT NULL,
    "empreinte" TEXT,
    "texte" TEXT,
    "reservee_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syntheses_periode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "syntheses_periode_portee_empreinte_idx" ON "syntheses_periode"("portee", "empreinte");

-- CreateIndex
CREATE INDEX "syntheses_periode_portee_libelle_idx" ON "syntheses_periode"("portee", "libelle");

-- CreateIndex
CREATE INDEX "syntheses_periode_location_id_idx" ON "syntheses_periode"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "syntheses_periode_portee_debut_fin_key" ON "syntheses_periode"("portee", "debut", "fin");

-- AddForeignKey
ALTER TABLE "syntheses_periode" ADD CONSTRAINT "syntheses_periode_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
