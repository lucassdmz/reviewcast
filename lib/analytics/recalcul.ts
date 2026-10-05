import { prisma } from "@/lib/db/client";
import { jourUtc } from "./periodes";

/**
 * Reconstruit les statistiques précalculées d'un établissement, pour un jour
 * ou pour tout l'historique. Appelé après chaque analyse IA, chaque
 * publication et le seed : la page Tendances ne lit jamais les avis bruts.
 */
export async function recalculerJour(locationId: string, date: Date): Promise<void> {
  const jour = jourUtc(date);
  const lendemain = new Date(jour);
  lendemain.setUTCDate(lendemain.getUTCDate() + 1);

  const avis = await prisma.review.findMany({
    where: { locationId, retireAt: null, dateCreation: { gte: jour, lt: lendemain } },
    select: {
      note: true,
      dateCreation: true,
      reponseGoogleDate: true,
      reponseGoogleTexte: true,
      analysis: { select: { themes: { select: { themeId: true, polarite: true } } } },
    },
  });

  const nb = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  let sommeNotes = 0;
  let nbNegatifs = 0;
  let nbNegatifsRepondus = 0;
  let sommeDelaiHeures = 0;
  const themes = new Map<string, { themeId: string; polarite: "POSITIF" | "NEGATIF" | "MIXTE"; nombre: number }>();

  for (const a of avis) {
    nb[a.note] = (nb[a.note] ?? 0) + 1;
    sommeNotes += a.note;
    if (a.note <= 3) {
      nbNegatifs++;
      if (a.reponseGoogleTexte) {
        nbNegatifsRepondus++;
        if (a.reponseGoogleDate) {
          sommeDelaiHeures += Math.max(0, (a.reponseGoogleDate.getTime() - a.dateCreation.getTime()) / 3_600_000);
        }
      }
    }
    for (const t of a.analysis?.themes ?? []) {
      const cle = `${t.themeId}|${t.polarite}`;
      const cur = themes.get(cle);
      themes.set(cle, { themeId: t.themeId, polarite: t.polarite, nombre: (cur?.nombre ?? 0) + 1 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.themeStat.deleteMany({ where: { locationId, jour } });
    if (avis.length === 0) {
      await tx.dailyStat.deleteMany({ where: { locationId, jour } });
      return;
    }
    const valeurs = {
      volume: avis.length,
      sommeNotes,
      nb1: nb[1],
      nb2: nb[2],
      nb3: nb[3],
      nb4: nb[4],
      nb5: nb[5],
      nbNegatifs,
      nbNegatifsRepondus,
      sommeDelaiHeures: Math.round(sommeDelaiHeures * 100) / 100,
    };
    await tx.dailyStat.upsert({
      where: { locationId_jour: { locationId, jour } },
      update: valeurs,
      create: { locationId, jour, ...valeurs },
    });
    if (themes.size > 0) {
      await tx.themeStat.createMany({ data: [...themes.values()].map((t) => ({ locationId, jour, ...t })) });
    }
  });
}

/** Recalcul complet d'un établissement (import initial, seed, réparation). */
export async function recalculerStatistiques(locationId: string): Promise<number> {
  const jours = await prisma.review.findMany({
    where: { locationId, retireAt: null },
    select: { dateCreation: true },
    distinct: ["dateCreation"],
  });
  const uniques = new Map<string, Date>();
  for (const { dateCreation } of jours) {
    const j = jourUtc(dateCreation);
    uniques.set(j.toISOString(), j);
  }
  await prisma.dailyStat.deleteMany({ where: { locationId } });
  await prisma.themeStat.deleteMany({ where: { locationId } });
  for (const j of uniques.values()) await recalculerJour(locationId, j);
  return uniques.size;
}

/** Recalcule les jours concernés par un avis (sa date de création). */
export async function recalculerPourAvis(reviewId: string): Promise<void> {
  const a = await prisma.review.findUnique({ where: { id: reviewId }, select: { locationId: true, dateCreation: true } });
  if (a) await recalculerJour(a.locationId, a.dateCreation);
}
