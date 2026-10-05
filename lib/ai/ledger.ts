import { prisma } from "@/lib/db/client";
import { estimerCout } from "./pricing";
import type { AiTask, AiUsage } from "./types";

/** Enregistre la consommation d'un appel (compteur de tokens des Réglages). */
export async function enregistrerUsage(tache: AiTask, usage: AiUsage, batch = false): Promise<void> {
  if (usage.modele === "fake") return;
  await prisma.aiUsage.create({
    data: {
      tache,
      modele: usage.modele,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      cacheRead: usage.cacheRead,
      cacheWrite: usage.cacheWrite,
      batch,
      coutEstime: estimerCout(usage, batch),
    },
  });
}

export interface ConsommationMensuelle {
  appels: number;
  tokens: number;
  coutEstime: number;
}

/** Totaux du mois civil en cours, pour l'écran Réglages. */
export async function consommationDuMois(maintenant = new Date()): Promise<ConsommationMensuelle> {
  const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  const agg = await prisma.aiUsage.aggregate({
    where: { createdAt: { gte: debut } },
    _count: { _all: true },
    _sum: { tokensIn: true, tokensOut: true, cacheRead: true, cacheWrite: true, coutEstime: true },
  });
  const s = agg._sum;
  return {
    appels: agg._count._all,
    tokens: (s.tokensIn ?? 0) + (s.tokensOut ?? 0) + (s.cacheRead ?? 0) + (s.cacheWrite ?? 0),
    coutEstime: Number(s.coutEstime ?? 0),
  };
}
