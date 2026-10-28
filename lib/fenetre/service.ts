import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/lib/db/generated/client";
import { debutLecture, fenetreAdaptative, type Fenetre } from "./adaptative";

/**
 * Lecture en base des fenêtres adaptatives (lib/fenetre/adaptative.ts). Seuls
 * les avis des trois derniers mois sont lus : c'est la fenêtre la plus large.
 */

/** Fenêtre d'une vue : un établissement, ou l'ensemble (`null`), pour les chiffres du climat récent. */
export async function fenetreDeLaVue(locationId: string | null, maintenant = new Date()): Promise<Fenetre> {
  const avis = await prisma.review.findMany({
    where: { ...(locationId ? { locationId } : {}), retireAt: null, dateCreation: { gte: debutLecture(maintenant) } },
    select: { dateCreation: true },
  });
  return fenetreAdaptative(
    avis.map((a) => a.dateCreation),
    maintenant,
  );
}

/** Fenêtre de chaque établissement, qui décide quels avis sans réponse sont dans la file. */
export async function fenetresParEtablissement(maintenant = new Date()): Promise<Map<string, Fenetre>> {
  const [etablissements, avis] = await Promise.all([
    prisma.location.findMany({ select: { id: true } }),
    prisma.review.findMany({ where: { retireAt: null, dateCreation: { gte: debutLecture(maintenant) } }, select: { locationId: true, dateCreation: true } }),
  ]);
  const dates = new Map<string, Date[]>(etablissements.map((e) => [e.id, []]));
  for (const a of avis) dates.get(a.locationId)?.push(a.dateCreation);
  return new Map([...dates].map(([id, d]) => [id, fenetreAdaptative(d, maintenant)]));
}

/** Filtre Prisma des avis entrés dans la fenêtre de leur établissement. */
export function filtreRecents(fenetres: ReadonlyMap<string, Fenetre>): Prisma.ReviewWhereInput {
  return { OR: [...fenetres].map(([locationId, f]) => ({ locationId, dateCreation: { gte: f.debut } })) };
}
