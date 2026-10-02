import { prisma } from "@/lib/db/client";
import {
  classerThemes,
  courbeMensuelle,
  reactivite,
  repartitionEtoiles,
  type LigneJour,
  type LigneTheme,
  type PointMensuel,
  type Reactivite,
  type Repartition,
  type ThemeClasse,
} from "./agregation";
import { type PeriodeTendances } from "./periodes";

/** Vue complète de la page Tendances, lue uniquement dans les tables précalculées. */
export interface Tendances {
  periode: PeriodeTendances;
  etablissement: { id: string; nom: string } | null;
  etablissements: { id: string; nom: string }[];
  repartition: Repartition;
  precedente: Repartition;
  positifs: ThemeClasse[];
  negatifs: ThemeClasse[];
  courbe: PointMensuel[];
  reactivite: Reactivite;
}

async function lignesJour(locationId: string | null, debut: Date, fin: Date): Promise<LigneJour[]> {
  const rows = await prisma.dailyStat.findMany({ where: { ...(locationId ? { locationId } : {}), jour: { gte: debut, lt: fin } } });
  return rows.map((r) => ({
    jour: r.jour,
    volume: r.volume,
    sommeNotes: r.sommeNotes,
    nb1: r.nb1,
    nb2: r.nb2,
    nb3: r.nb3,
    nb4: r.nb4,
    nb5: r.nb5,
    nbNegatifs: r.nbNegatifs,
    nbNegatifsRepondus: r.nbNegatifsRepondus,
    sommeDelaiHeures: r.sommeDelaiHeures.toNumber(),
  }));
}

async function lignesTheme(locationId: string | null, debut: Date, fin: Date): Promise<LigneTheme[]> {
  const rows = await prisma.themeStat.findMany({
    where: { ...(locationId ? { locationId } : {}), jour: { gte: debut, lt: fin } },
    include: { theme: { select: { libelle: true } } },
  });
  return rows.map((r) => ({ themeId: r.themeId, libelle: r.theme.libelle, polarite: r.polarite, nombre: r.nombre }));
}

export async function obtenirTendances(locationId: string | null, periode: PeriodeTendances): Promise<Tendances> {
  const etablissements = await prisma.location.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } });
  const etablissement = locationId ? (etablissements.find((e) => e.id === locationId) ?? null) : null;
  const id = etablissement?.id ?? null;

  const [joursActuels, joursPrecedents, themesActuels, themesPrecedents] = await Promise.all([
    lignesJour(id, periode.debut, periode.fin),
    lignesJour(id, periode.precedente.debut, periode.precedente.fin),
    lignesTheme(id, periode.debut, periode.fin),
    lignesTheme(id, periode.precedente.debut, periode.precedente.fin),
  ]);
  const { positifs, negatifs } = classerThemes(themesActuels, themesPrecedents);

  return {
    periode,
    etablissement,
    etablissements,
    repartition: repartitionEtoiles(joursActuels),
    precedente: repartitionEtoiles(joursPrecedents),
    positifs,
    negatifs,
    courbe: courbeMensuelle(joursActuels, periode.debut, periode.fin),
    reactivite: reactivite(joursActuels),
  };
}

/** Avis d'un thème sur la période, avec le passage à surligner (détail, lecture des avis). */
export interface AvisDuTheme {
  id: string;
  auteur: string;
  note: number;
  dateCreation: Date;
  texte: string | null;
  passage: string | null;
  polarite: string;
  etablissement: string;
}

export async function avisParTheme(themeId: string, locationId: string | null, periode: PeriodeTendances): Promise<{ libelle: string; avis: AvisDuTheme[] } | null> {
  const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { libelle: true } });
  if (!theme) return null;
  const liens = await prisma.reviewAnalysisTheme.findMany({
    where: {
      themeId,
      analysis: { review: { ...(locationId ? { locationId } : {}), retireAt: null, dateCreation: { gte: periode.debut, lt: periode.fin } } },
    },
    include: { analysis: { include: { review: { include: { location: { select: { nom: true } } } } } } },
  });
  const avis = liens
    .map((l) => ({
      id: l.analysis.review.id,
      auteur: l.analysis.review.auteur,
      note: l.analysis.review.note,
      dateCreation: l.analysis.review.dateCreation,
      texte: l.analysis.review.texte,
      passage: l.passage,
      polarite: l.polarite,
      etablissement: l.analysis.review.location.nom,
    }))
    .sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime());
  return { libelle: theme.libelle, avis };
}
