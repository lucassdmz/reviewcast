import { prisma } from "@/lib/db/client";
import { elementSchema, resumerElement } from "./element";
import { reconnaitreEcran } from "./ecrans";
import type { RetourSaisi, StatutRetour } from "./validation";

/** La bulle de retours n'existe que là où la bêta est ouverte (`RETOURS_BETA=1`), jamais chez un client. */
export function retoursActifs(): boolean {
  return process.env.RETOURS_BETA === "1";
}

/** Garde-fou d'une adresse de démonstration publique : 30 remarques par heure et par appareil. */
const MAX_PAR_HEURE = 30;

/** Version déployée : le commit sur Vercel, « local » sur un poste de développement. */
function versionDeployee(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
}

export type ResultatEnvoi = { ok: true; id: string } | { ok: false; erreur: string };

export async function enregistrerRetour(
  saisi: RetourSaisi,
  capture: Uint8Array<ArrayBuffer> | null,
  etablissement: string | null,
): Promise<ResultatEnvoi> {
  const recents = await prisma.retourBeta.count({
    where: { appareil: saisi.appareil, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recents >= MAX_PAR_HEURE) return { ok: false, erreur: "Beaucoup de remarques en peu de temps : réessayez dans un moment." };

  const ecran = reconnaitreEcran(saisi.chemin);
  const r = await prisma.retourBeta.create({
    data: {
      chemin: saisi.chemin,
      gabarit: ecran.gabarit,
      ecran: ecran.libelle,
      texte: saisi.texte,
      appareil: saisi.appareil,
      etablissement,
      element: saisi.element ?? undefined,
      contexte: { ...saisi.contexte, version: versionDeployee() },
      capture: capture ?? undefined,
      captureType: capture ? "image/jpeg" : undefined,
    },
    select: { id: true },
  });
  return { ok: true, id: r.id };
}

/** Une remarque telle que la bulle l'affiche au testeur. */
export interface RetourAffiche {
  id: string;
  texte: string;
  statut: StatutRetour;
  reponse: string | null;
  element: string | null;
  /** Écrite depuis cet appareil : le testeur peut la retirer tant qu'elle n'est pas traitée. */
  mienne: boolean;
  /** Écrite sur ce même écran (même adresse), et pas seulement sur un écran du même type. */
  ici: boolean;
  creeLe: string;
}

function statutConnu(statut: string): StatutRetour {
  return statut === "traite" || statut === "ecarte" ? statut : "ouvert";
}

/** Remarques déjà laissées sur ce type d'écran, les plus récentes d'abord : le testeur voit ce qui est noté et ce qui est corrigé. */
export async function listerRetoursEcran(chemin: string, appareil: string): Promise<RetourAffiche[]> {
  const { gabarit } = reconnaitreEcran(chemin);
  const lignes = await prisma.retourBeta.findMany({
    where: { gabarit },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, texte: true, statut: true, reponse: true, element: true, appareil: true, chemin: true, createdAt: true },
  });
  return lignes.map((l) => {
    const element = elementSchema.safeParse(l.element);
    return {
      id: l.id,
      texte: l.texte,
      statut: statutConnu(l.statut),
      reponse: l.reponse,
      element: element.success ? resumerElement(element.data) : null,
      mienne: l.appareil === appareil,
      ici: l.chemin === chemin,
      creeLe: l.createdAt.toISOString(),
    };
  });
}

/** Retire une remarque encore ouverte, écrite depuis cet appareil. */
export async function retirerRetour(id: string, appareil: string): Promise<boolean> {
  const { count } = await prisma.retourBeta.deleteMany({ where: { id, appareil, statut: "ouvert" } });
  return count === 1;
}

/* Relecture par l'équipe (npm run retours). */

export interface RetourComplet {
  id: string;
  chemin: string;
  gabarit: string;
  ecran: string;
  texte: string;
  appareil: string;
  etablissement: string | null;
  element: unknown;
  contexte: unknown;
  aCapture: boolean;
  statut: StatutRetour;
  reponse: string | null;
  commit: string | null;
  traiteLe: Date | null;
  createdAt: Date;
}

export async function listerRetours(statuts: StatutRetour[]): Promise<RetourComplet[]> {
  const lignes = await prisma.retourBeta.findMany({
    where: { statut: { in: statuts } },
    orderBy: [{ gabarit: "asc" }, { createdAt: "asc" }],
    omit: { capture: true },
  });
  return lignes.map(({ captureType, statut, ...l }) => ({ ...l, statut: statutConnu(statut), aCapture: captureType !== null }));
}

export async function lireCaptureRetour(id: string): Promise<Uint8Array | null> {
  const r = await prisma.retourBeta.findUnique({ where: { id }, select: { capture: true } });
  return r?.capture ?? null;
}

/** Clôt une remarque (traitée ou écartée) avec ce qui a été fait, ou la rouvre. */
export async function changerStatutRetour(
  id: string,
  statut: StatutRetour,
  details: { reponse?: string; commit?: string } = {},
): Promise<boolean> {
  const { count } = await prisma.retourBeta.updateMany({
    where: { id },
    data: {
      statut,
      reponse: details.reponse ?? (statut === "ouvert" ? null : undefined),
      commit: details.commit ?? (statut === "ouvert" ? null : undefined),
      traiteLe: statut === "ouvert" ? null : new Date(),
    },
  });
  return count === 1;
}
