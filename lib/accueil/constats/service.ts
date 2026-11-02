import { filtreEtablissements, filtreFiches } from "@/lib/etablissements/perimetre";
import { prisma } from "@/lib/db/client";
import { HISTORIQUE_JOURS, choisirConstats, detecterConstats, type AvisConstat, type Constat } from "./regles";

/** Les fiches de constat à montrer sur l'établissement affiché, ou sur tous en vue d'ensemble. */
export async function preparerConstats(locationId: string | null, maintenant: Date): Promise<Constat[]> {
  const [etablissements, avis] = await Promise.all([
    prisma.location.findMany({ where: locationId ? { id: locationId } : await filtreEtablissements(), select: { id: true, nom: true } }),
    prisma.review.findMany({
      where: { ...(await filtreFiches(locationId)), retireAt: null, dateCreation: { gte: new Date(maintenant.getTime() - HISTORIQUE_JOURS * 86_400_000) } },
      select: {
        locationId: true,
        note: true,
        texte: true,
        dateCreation: true,
        analysis: { select: { horsSujet: true, themes: { select: { themeId: true, polarite: true, theme: { select: { libelle: true } } } } } },
      },
    }),
  ]);
  const parFiche = new Map<string, AvisConstat[]>(etablissements.map((e) => [e.id, []]));
  for (const a of avis) {
    const lisible = a.texte !== null && a.analysis !== null && !a.analysis.horsSujet;
    parFiche.get(a.locationId)?.push({
      note: a.note,
      dateCreation: a.dateCreation,
      themes: lisible ? (a.analysis?.themes ?? []).map((t) => ({ themeId: t.themeId, libelle: t.theme.libelle, polarite: t.polarite })) : null,
    });
  }
  const candidats = detecterConstats(
    etablissements.map((e) => ({ locationId: e.id, nom: e.nom, avis: parFiche.get(e.id) ?? [] })),
    maintenant,
  );
  if (candidats.length === 0) return [];
  const vus = await prisma.constatVu.findMany({ where: { locationId: { in: etablissements.map((e) => e.id) } } });
  return choisirConstats(candidats, vus, maintenant);
}

/** Retient qu'une fiche a été vue, pour ne pas la répéter d'un appareil à l'autre. */
export async function marquerConstatVu(locationId: string, cle: string, nombre: number, maintenant = new Date()): Promise<void> {
  await prisma.constatVu.upsert({
    where: { locationId_cle: { locationId, cle } },
    create: { locationId, cle, nombre, vuAt: maintenant },
    update: { nombre, vuAt: maintenant },
  });
}
