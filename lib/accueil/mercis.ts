import { creerRemerciement } from "@/lib/ai/service";
import { prisma } from "@/lib/db/client";
import { filtreFiches } from "@/lib/etablissements/perimetre";
import { fenetreDeLaVue } from "@/lib/fenetre/service";
import { lireVoix } from "@/lib/voix/service";
import { sansSignature } from "@/lib/voix/signature";
import { initiales, texteDeCarte, type MerciPret } from "./rituel";

/**
 * Les mercis de l'accueil. La lecture n'appelle jamais l'IA : elle donne les
 * mercis déjà rédigés et la liste de ceux qui manquent. Leur rédaction se fait
 * à part, demandée par l'écran une fois affiché ou par la tâche quotidienne.
 */

/** Au plus quatre mercis par matin : au delà, la validation groupée n'est plus une relecture. */
const MERCIS_MAX = 4;
/** Une réservation plus ancienne appartient à un passage interrompu : elle est libérée. */
const RESERVATION_MS = 2 * 60_000;

async function avisAMercier(locationId: string | null, depuis: Date) {
  return prisma.review.findMany({
    where: { ...(await filtreFiches(locationId)), note: { gte: 4 }, statut: "HORS_FILE", reponseGoogleTexte: null, retireAt: null, dateCreation: { gte: depuis }, NOT: { texte: null } },
    orderBy: { dateCreation: "desc" },
    take: MERCIS_MAX,
    include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
  });
}

export async function lireMercis(locationId: string | null, depuis: Date): Promise<{ prets: MerciPret[]; aPreparer: string[] }> {
  const avis = await avisAMercier(locationId, depuis);
  const signatures = new Map<string, string | null>();
  for (const id of new Set(avis.filter((a) => a.drafts[0]).map((a) => a.locationId))) signatures.set(id, (await lireVoix(id)).signature);
  const prets: MerciPret[] = [];
  const aPreparer: string[] = [];
  for (const a of avis) {
    const texte = a.drafts[0]?.texte;
    if (!texte) {
      aPreparer.push(a.id);
      continue;
    }
    prets.push({
      reviewId: a.id,
      auteur: a.auteur,
      initiales: initiales(a.auteur),
      note: a.note,
      extrait: a.texte ? texteDeCarte(a.texte, 60) : null,
      texte: sansSignature(texte, signatures.get(a.locationId) ?? null),
    });
  }
  return { prets, aPreparer };
}

/** Rédige les mercis qui manquent, en parallèle. Une réservation en base évite de payer deux fois le même merci. */
export async function preparerMercis(locationId: string | null, depuis: Date): Promise<{ prepares: number }> {
  const { aPreparer } = await lireMercis(locationId, depuis);
  const resultats = await Promise.allSettled(
    aPreparer.map(async (reviewId) => {
      const { count } = await prisma.review.updateMany({
        where: { id: reviewId, drafts: { none: {} }, OR: [{ merciReserveAt: null }, { merciReserveAt: { lt: new Date(Date.now() - RESERVATION_MS) } }] },
        data: { merciReserveAt: new Date() },
      });
      if (count === 0) return false;
      try {
        await creerRemerciement(reviewId);
        return true;
      } finally {
        // updateMany : l'avis a pu disparaître entre-temps, la libération n'a alors plus d'objet.
        await prisma.review.updateMany({ where: { id: reviewId }, data: { merciReserveAt: null } });
      }
    }),
  );
  let prepares = 0;
  for (const r of resultats) {
    if (r.status === "rejected") console.error("Remerciement indisponible :", r.reason instanceof Error ? r.reason.message : "erreur inconnue");
    else if (r.value) prepares += 1;
  }
  return { prepares };
}

/** Depuis l'écran : la vue affichée, sur sa fenêtre de lecture. */
export async function preparerMercisDeLaVue(locationId: string | null): Promise<{ prepares: number }> {
  const fenetre = await fenetreDeLaVue(locationId);
  return preparerMercis(locationId, fenetre.debut);
}

/** Tâche quotidienne : les mercis sont prêts avant même l'ouverture de l'application. */
export async function preparerMercisDeToutesLesFiches(): Promise<{ prepares: number }> {
  const fiches = await prisma.location.findMany({ select: { id: true } });
  let prepares = 0;
  for (const { id } of fiches) prepares += (await preparerMercisDeLaVue(id)).prepares;
  return { prepares };
}
