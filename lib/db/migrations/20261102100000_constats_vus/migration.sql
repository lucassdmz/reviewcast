-- CreateTable
CREATE TABLE "constats_vus" (
    "location_id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "nombre" INTEGER NOT NULL,
    "vu_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "constats_vus_pkey" PRIMARY KEY ("location_id","cle")
);

-- AddForeignKey
ALTER TABLE "constats_vus" ADD CONSTRAINT "constats_vus_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
