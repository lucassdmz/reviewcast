import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { analyserAvis, genererBrouillon, initialiserTaxonomie } from "@/lib/ai/service";
import { recalculerStatistiques } from "@/lib/analytics/recalcul";
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
    jours_avant: z.number().int().min(0),
  }),
);

function dateIlYA(jours: number): Date {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
}

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
      update: { dateCreation: dateIlYA(a.jours_avant), dateMaj: dateIlYA(a.jours_avant) },
      create: {
        googleReviewId: a.google_review_id,
        locationId: etablissement.id,
        auteur: a.auteur,
        note: a.note,
        texte: a.texte,
        dateCreation: dateIlYA(a.jours_avant),
        dateMaj: dateIlYA(a.jours_avant),
      },
    });
    await analyserAvis(review.id, ia);
    const apres = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    if (apres.statut === "A_TRAITER") {
      await genererBrouillon(review.id, undefined, ia);
      brouillons++;
    }
  }
  // Les avis négatifs de plus de 90 jours sont considérés déjà répondus (historique de démonstration).
  const anciens = await prisma.review.findMany({
    where: { locationId: etablissement.id, note: { lte: 3 }, statut: { in: ["A_TRAITER", "BROUILLON_PRET"] }, dateCreation: { lt: dateIlYA(90) } },
    include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
  });
  for (const a of anciens) {
    const texte = a.drafts[0]?.texte ?? "Merci pour votre retour, nous restons à votre disposition. L'équipe";
    const delai = (a.googleReviewId.charCodeAt(a.googleReviewId.length - 1) % 36) + 2;
    await prisma.review.update({
      where: { id: a.id },
      data: { statut: "PUBLIE", reponseGoogleTexte: texte, reponseGoogleDate: new Date(a.dateCreation.getTime() + delai * 3_600_000) },
    });
  }
  const jours = await recalculerStatistiques(etablissement.id);
  console.log(`Démo prête : ${avis.length} avis analysés, ${brouillons} brouillons générés, ${anciens.length} réponses historiques, ${jours} jours de statistiques.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
