import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { analyserAvis, genererBrouillon, initialiserTaxonomie } from "@/lib/ai/service";
import { FakeProvider } from "@/lib/ai/providers/fake";
import { prisma } from "@/lib/db/client";

/**
 * Données de démonstration : un établissement fictif, les 20 avis de
 * tests/fixtures/reviews.json, leur analyse et les brouillons de la file,
 * produits par le fournisseur simulé (aucun appel réseau).
 * Lancement : npm run db:seed
 */
const fixtureSchema = z.array(
  z.object({
    google_review_id: z.string(),
    auteur: z.string(),
    note: z.number().int().min(1).max(5),
    texte: z.string().nullable(),
    date_creation: z.string(),
  }),
);

async function main() {
  const brut = await readFile(path.join(process.cwd(), "tests", "fixtures", "reviews.json"), "utf8");
  const avis = fixtureSchema.parse(JSON.parse(brut));

  const utilisateur = await prisma.user.upsert({
    where: { email: "demo@eclaircie.local" },
    update: {},
    create: { email: "demo@eclaircie.local", name: "Démo" },
  });
  const connexion = await prisma.googleConnection.upsert({
    where: { googleAccountId: "accounts/demo" },
    update: {},
    create: {
      userId: utilisateur.id,
      googleAccountId: "accounts/demo",
      googleAccountName: "Compte de démonstration",
      refreshTokenEncrypted: "demo",
      scope: "demo",
    },
  });
  const etablissement = await prisma.location.upsert({
    where: { googleLocationId: "locations/demo-1" },
    update: {},
    create: {
      googleConnectionId: connexion.id,
      googleLocationId: "locations/demo-1",
      nom: "Établissement de démonstration",
      adresse: "12 rue des Nuages, 75000 Paris",
    },
  });
  await prisma.settings.upsert({
    where: { locationId: etablissement.id },
    update: {},
    create: { locationId: etablissement.id },
  });
  await initialiserTaxonomie();

  const ia = new FakeProvider();
  let brouillons = 0;
  for (const a of avis) {
    const review = await prisma.review.upsert({
      where: { googleReviewId: a.google_review_id },
      update: {},
      create: {
        googleReviewId: a.google_review_id,
        locationId: etablissement.id,
        auteur: a.auteur,
        note: a.note,
        texte: a.texte,
        dateCreation: new Date(a.date_creation),
        dateMaj: new Date(a.date_creation),
      },
    });
    await analyserAvis(review.id, ia);
    const apres = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    if (apres.statut === "A_TRAITER") {
      await genererBrouillon(review.id, undefined, ia);
      brouillons++;
    }
  }
  console.log(`Démo prête : ${avis.length} avis analysés, ${brouillons} brouillons générés.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
