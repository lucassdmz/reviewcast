import { recalculerJour } from "@/lib/analytics/recalcul";
import { enregistrerUsage } from "@/lib/ai/ledger";
import {
  decouperEnLots,
  gereLesLots,
  INTERVALLE_RELEVE_MS,
  preparationAbandonnee,
  releverLot,
  type DepotLot,
} from "@/lib/ai/lots";
import { appliquerAnalyse, fournisseurPour, entreeAnalyse } from "@/lib/ai/service";
import { prisma } from "@/lib/db/client";

/**
 * Import initial d'une fiche : l'analyse de l'historique passe par la Batch
 * API. Les avis restent visibles dès l'import, avec leur statut provisoire.
 * Les avis arrivés après l'import ne passent pas par ici (reprendreAnalyses).
 */

const depotPrisma: DepotLot = {
  async avisEnAttente(lotId) {
    const avis = await prisma.review.findMany({ where: { lotAnalyseId: lotId, analyseAFaire: true }, select: { id: true } });
    return avis.map((a) => a.id);
  },
  async appliquer(lotId, avisId, resultat) {
    // Un avis modifié entre-temps a quitté le lot : ce résultat porte sur l'ancien texte.
    const encore = await prisma.review.count({ where: { id: avisId, lotAnalyseId: lotId, analyseAFaire: true } });
    if (encore === 0) return;
    await appliquerAnalyse(avisId, resultat.data, resultat.usage.modele);
    const { count } = await prisma.review.updateMany({ where: { id: avisId, lotAnalyseId: lotId, analyseAFaire: true }, data: { analyseAFaire: false } });
    if (count === 1) await enregistrerUsage("analyse", resultat.usage, true);
  },
  async relacher(lotId, avisId) {
    await prisma.review.updateMany({ where: { id: avisId, lotAnalyseId: lotId }, data: { lotAnalyseId: null, analyseEnLot: false, analyseReserveeAt: null } });
  },
  async clore(lotId, statut) {
    await prisma.lotAnalyse.update({ where: { id: lotId }, data: { statut, termineLe: new Date() } });
  },
};

async function recalculerAvisDuLot(lotId: string, depuis: Date): Promise<void> {
  const avis = await prisma.review.findMany({
    where: { lotAnalyseId: lotId, analyseAFaire: false, updatedAt: { gte: depuis } },
    select: { locationId: true, dateCreation: true },
  });
  const jours = new Map(avis.map((a) => [`${a.locationId}|${a.dateCreation.toISOString().slice(0, 10)}`, a]));
  for (const a of jours.values()) await recalculerJour(a.locationId, a.dateCreation);
}

/** Relève les lots en cours d'une fiche. Le verrou évite deux relevés simultanés et les relevés trop rapprochés. */
async function releverLesLots(locationId: string, echeance: number, maintenant: Date): Promise<number> {
  const lots = await prisma.lotAnalyse.findMany({ where: { locationId, statut: "EN_COURS", idFournisseur: { not: null } }, orderBy: { createdAt: "asc" } });
  let appliques = 0;
  for (const lot of lots) {
    if (Date.now() >= echeance) break;
    const { count } = await prisma.lotAnalyse.updateMany({
      where: { id: lot.id, OR: [{ releveLe: null }, { releveLe: { lte: new Date(maintenant.getTime() - INTERVALLE_RELEVE_MS) } }] },
      data: { releveLe: maintenant },
    });
    if (count === 0 || !lot.idFournisseur) continue;
    const debut = new Date();
    try {
      const fournisseur = await fournisseurPour(locationId);
      if (!gereLesLots(fournisseur)) continue;
      const bilan = await releverLot({ id: lot.id, idFournisseur: lot.idFournisseur, soumisLe: lot.createdAt }, fournisseur, depotPrisma, { echeance, maintenant });
      appliques += bilan.appliques;
      await recalculerAvisDuLot(lot.id, debut);
      // Il reste des résultats et le temps manque : le passage suivant ne doit pas attendre l'intervalle.
      if (bilan.etat === "partiel") await prisma.lotAnalyse.update({ where: { id: lot.id }, data: { releveLe: null } });
    } catch (error) {
      console.error("Relevé d'un lot reporté", error instanceof Error ? error.name : "erreur inconnue");
    }
  }
  return appliques;
}

/** Un passage qui s'est arrêté entre la réservation et la soumission : ses avis redeviennent disponibles. */
async function liberePreparations(locationId: string, maintenant: Date): Promise<void> {
  const lots = await prisma.lotAnalyse.findMany({ where: { locationId, statut: "PREPARATION" }, select: { id: true, createdAt: true } });
  for (const lot of lots) {
    if (!preparationAbandonnee(lot.createdAt, maintenant)) continue;
    await prisma.review.updateMany({ where: { lotAnalyseId: lot.id }, data: { lotAnalyseId: null } });
    await prisma.lotAnalyse.update({ where: { id: lot.id }, data: { statut: "ABANDONNE", termineLe: maintenant } });
  }
}

/** Soumet ce qui attend encore un lot. Les avis sont réservés d'abord, pour qu'un second passage ne les soumette pas aussi. */
async function soumettreEnAttente(locationId: string, echeance: number): Promise<void> {
  const attente = { locationId, analyseEnLot: true, analyseAFaire: true, lotAnalyseId: null, retireAt: null };
  const avis = await prisma.review.findMany({ where: attente, orderBy: { dateCreation: "desc" }, select: { id: true } });
  if (avis.length === 0) return;

  const fournisseur = await fournisseurPour(locationId);
  if (!gereLesLots(fournisseur)) {
    // Fournisseur sans traitement par lots : ces avis passent par les appels unitaires.
    await prisma.review.updateMany({ where: attente, data: { analyseEnLot: false } });
    return;
  }

  for (const morceau of decouperEnLots(avis.map((a) => a.id))) {
    if (Date.now() >= echeance) return;
    const lot = await prisma.lotAnalyse.create({ data: { locationId, nbAvis: morceau.length } });
    const { count } = await prisma.review.updateMany({ where: { ...attente, id: { in: morceau } }, data: { lotAnalyseId: lot.id } });
    const reserves = await prisma.review.findMany({ where: { lotAnalyseId: lot.id }, select: { id: true } });
    if (count === 0) {
      await prisma.lotAnalyse.update({ where: { id: lot.id }, data: { statut: "ABANDONNE", termineLe: new Date() } });
      continue;
    }
    try {
      const items = await Promise.all(reserves.map(async ({ id }) => ({ id, input: await entreeAnalyse(id) })));
      const idFournisseur = await fournisseur.soumettreLotAnalyses(items);
      await prisma.lotAnalyse.update({ where: { id: lot.id }, data: { idFournisseur, statut: "EN_COURS" } });
    } catch (error) {
      // Rien n'est parti : les avis retournent en attente, le prochain passage réessaie.
      await prisma.review.updateMany({ where: { lotAnalyseId: lot.id }, data: { lotAnalyseId: null } });
      await prisma.lotAnalyse.update({ where: { id: lot.id }, data: { statut: "ABANDONNE", termineLe: new Date() } });
      console.error("Soumission d'un lot reportée", error instanceof Error ? error.name : "erreur inconnue");
      return;
    }
  }
}

/** Fait avancer les lots des fiches : à chaque passage, ce que le temps permet. Renvoie le nombre d'avis analysés. */
export async function avancerLots(locationIds: string[], echeance: number, maintenant = new Date()): Promise<number> {
  let appliques = 0;
  for (const locationId of locationIds) {
    try {
      await liberePreparations(locationId, maintenant);
      appliques += await releverLesLots(locationId, echeance, maintenant);
      await soumettreEnAttente(locationId, echeance);
    } catch (error) {
      console.error("Lots d'analyse reportés", error instanceof Error ? error.name : "erreur inconnue");
    }
  }
  return appliques;
}
