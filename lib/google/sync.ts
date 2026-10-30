import { analyserAvis, genererBrouillon, initialiserTaxonomie } from "@/lib/ai/service";
import { statutApresAnalyse } from "@/lib/ai/queue";
import { recalculerJour, recalculerStatistiques } from "@/lib/analytics/recalcul";
import { prisma } from "@/lib/db/client";
import type { ReviewStatus } from "@/lib/db/generated/enums";
import { debutLecture, estRecent } from "@/lib/fenetre/adaptative";
import { fenetresParEtablissement } from "@/lib/fenetre/service";
import { notifierAvisATraiter } from "@/lib/notifications/service";
import { GoogleApiError } from "./client";
import { cheminFiche, comparerAvis, versAvisDistant, type AvisDistant, type Comparaison, type MiseAJour } from "./comparaison";
import { activerNotifications, clientDeLaConnexion } from "./connexion";
import { avancerLots } from "./import-lots";
import { limitePourLister, type Declencheur } from "./limites";
import { AccesRetire } from "./oauth";

/**
 * Synchronisation d'une fiche : lit tous les avis sur Google, applique les
 * écarts à la base, puis fait passer les avis nouveaux ou modifiés par l'IA et
 * la file. Elle ne publie jamais rien sur Google. Le texte d'un avis reste une
 * donnée : il est stocké tel quel et encadré dans les prompts de lib/ai.
 */

export type EtatSynchro = "faite" | "limitee" | "reconnexion" | "erreur" | "sans-google";

export interface ResultatSynchro {
  etat: EtatSynchro;
  nouveaux: number;
  modifies: number;
  retires: number;
}

const RIEN: Omit<ResultatSynchro, "etat"> = { nouveaux: 0, modifies: 0, retires: 0 };

/**
 * Réserve le droit de lister, de façon atomique : deux déclencheurs simultanés
 * ne produisent qu'une requête. Une liste réservée compte même si elle échoue.
 */
export async function reserverListe(locationId: string, declencheur: Declencheur, maintenant = new Date()): Promise<boolean> {
  const assezAncienne = { OR: [{ derniereListeAt: null }, { derniereListeAt: { lte: limitePourLister(declencheur, maintenant) } }] };
  const { count } = await prisma.location.updateMany({
    where: { id: locationId, googleCompte: { not: null }, ...assezAncienne },
    data: { derniereListeAt: maintenant },
  });
  return count === 1;
}

/** Statut d'un avis dont on connaît la réponse Google, sans attendre l'IA. */
function statutProvisoire(a: { note: number; reponse: AvisDistant["reponse"] }): ReviewStatus {
  return statutApresAnalyse({ note: a.note, reponseGoogleTexte: a.reponse?.texte ?? null, statut: "HORS_FILE" }, { probleme_detecte: false }, { inclureQuatreEtoiles: true });
}

/** Statut après une mise à jour venue de Google. Un avis ignoré le reste, sauf s'il a désormais une réponse. */
function statutApresMiseAJour(actuel: ReviewStatus, m: MiseAJour): ReviewStatus {
  if (m.distant.reponse) return "PUBLIE";
  if (m.reponseDisparue) return statutProvisoire(m.distant);
  // Le brouillon portait sur l'ancien texte : l'avis repart de « à traiter » et un nouveau sera rédigé.
  if (m.contenuChange && actuel === "BROUILLON_PRET") return "A_TRAITER";
  return actuel;
}

async function appliquer(locationId: string, comparaison: Comparaison, importInitial: boolean, maintenant: Date): Promise<void> {
  const { aCreer, aMettreAJour, aRetirer } = comparaison;
  const jours = new Map<number, Date>();
  const noter = (d: Date) => jours.set(d.getTime(), d);

  if (aCreer.length > 0) {
    await prisma.review.createMany({
      skipDuplicates: true,
      data: aCreer.map((d) => ({
        googleReviewId: d.googleReviewId,
        locationId,
        auteur: d.auteur,
        note: d.note,
        texte: d.texte,
        dateCreation: d.dateCreation,
        dateMaj: d.dateMaj,
        reponseGoogleTexte: d.reponse?.texte ?? null,
        reponseGoogleDate: d.reponse?.date ?? null,
        statut: statutProvisoire(d),
        analyseAFaire: true,
        // L'historique part en lot, à moitié prix ; les avis suivants sont analysés dès leur arrivée.
        analyseEnLot: importInitial,
        // L'import de l'historique ne déclenche aucune notification.
        notifieAt: importInitial ? maintenant : null,
      })),
    });
    aCreer.forEach((d) => noter(d.dateCreation));
  }

  for (const m of aMettreAJour) {
    const actuel = await prisma.review.findUniqueOrThrow({ where: { id: m.id }, select: { statut: true } });
    const d = m.distant;
    await prisma.review.update({
      where: { id: m.id },
      data: {
        auteur: d.auteur,
        note: d.note,
        texte: d.texte,
        dateMaj: d.dateMaj,
        retireAt: null,
        statut: statutApresMiseAJour(actuel.statut, m),
        ...(m.reponseDetectee ? { reponseGoogleTexte: d.reponse?.texte ?? null, reponseGoogleDate: d.reponse?.date ?? maintenant } : {}),
        ...(m.reponseDisparue ? { reponseGoogleTexte: null, reponseGoogleDate: null } : {}),
        // Un avis modifié quitte son lot éventuel : le résultat attendu porterait sur l'ancien texte.
        ...(m.contenuChange ? { analyseAFaire: true, analyseReserveeAt: null, analyseEnLot: false, lotAnalyseId: null } : {}),
      },
    });
    noter(d.dateCreation);
  }

  if (aRetirer.length > 0) {
    await prisma.review.updateMany({ where: { id: { in: aRetirer.map((a) => a.id) } }, data: { retireAt: maintenant } });
    for (const a of await prisma.review.findMany({ where: { id: { in: aRetirer.map((r) => r.id) } }, select: { dateCreation: true } })) noter(a.dateCreation);
  }

  if (importInitial) await recalculerStatistiques(locationId);
  else for (const jour of jours.values()) await recalculerJour(locationId, jour);
}

/** Lit Google et applique les écarts. Suppose la liste déjà réservée (reserverListe). */
export async function executerListe(locationId: string, maintenant = new Date()): Promise<ResultatSynchro> {
  const location = await prisma.location.findUniqueOrThrow({
    where: { id: locationId },
    select: { googleCompte: true, googleLocationId: true, googleConnectionId: true, lastSyncAt: true, googleConnection: { select: { aReconnecterAt: true } } },
  });
  if (!location.googleCompte) return { etat: "sans-google", ...RIEN };
  if (location.googleConnection.aReconnecterAt) return { etat: "reconnexion", ...RIEN };

  try {
    const client = clientDeLaConnexion(location.googleConnectionId);
    const liste = await client.listerAvis(cheminFiche(location.googleCompte, location.googleLocationId));
    if (liste.illisibles > 0) console.error(`Synchronisation : ${liste.illisibles} avis illisibles ignorés sur une fiche`);
    const locaux = await prisma.review.findMany({
      where: { locationId },
      select: { id: true, googleReviewId: true, note: true, texte: true, auteur: true, dateMaj: true, reponseGoogleTexte: true, reponseGoogleDate: true, retireAt: true },
    });
    const comparaison = comparerAvis(liste.avis.map(versAvisDistant), locaux, {
      listeComplete: liste.complete,
      publicationSimulee: process.env.PUBLICATION_GOOGLE === "simulee",
    });
    await initialiserTaxonomie();
    await appliquer(locationId, comparaison, location.lastSyncAt === null, maintenant);
    await prisma.location.update({ where: { id: locationId }, data: { lastSyncAt: maintenant } });
    return { etat: "faite", nouveaux: comparaison.aCreer.length, modifies: comparaison.aMettreAJour.length, retires: comparaison.aRetirer.length };
  } catch (error) {
    if (error instanceof AccesRetire) return { etat: "reconnexion", ...RIEN };
    if (!(error instanceof GoogleApiError)) throw error;
    console.error("Synchronisation Google interrompue", error.message);
    return { etat: "erreur", ...RIEN };
  }
}

/** Réserve puis lit. Renvoie « limitee » si la dernière liste est trop récente. */
export async function synchroniserFiche(locationId: string, declencheur: Declencheur, maintenant = new Date()): Promise<ResultatSynchro> {
  if (!(await reserverListe(locationId, declencheur, maintenant))) return { etat: "limitee", ...RIEN };
  return executerListe(locationId, maintenant);
}

const ANALYSES_SIMULTANEES = 4;
const RESERVATION_MS = 5 * 60_000;
const ECHECS_AVANT_ARRET = 3;

async function traiterAvis(reviewId: string, fenetres: Awaited<ReturnType<typeof fenetresParEtablissement>>, maintenant: Date): Promise<void> {
  await analyserAvis(reviewId);
  const a = await prisma.review.findUniqueOrThrow({ where: { id: reviewId }, select: { statut: true, locationId: true, dateCreation: true } });
  // Seuls les avis récents reçoivent un brouillon d'office : l'historique attend qu'on l'ouvre, pour ne pas payer ce qu'on ne lira pas.
  if (a.statut === "A_TRAITER" && estRecent(a, fenetres, maintenant)) await genererBrouillon(reviewId);
  await prisma.review.update({ where: { id: reviewId }, data: { analyseAFaire: false, analyseReserveeAt: null } });
}

/**
 * Fait passer par l'IA les avis en attente, jusqu'à épuiser le budget de temps.
 * Ce qui reste repart au prochain passage : rien n'est perdu si la fonction
 * s'arrête en route, et aucun avis n'est analysé deux fois en même temps.
 */
export async function reprendreAnalyses(locationIds: string[], budgetMs: number, debut = Date.now()): Promise<{ analyses: number; restants: number }> {
  const maintenant = new Date();
  const enAttente = { locationId: { in: locationIds }, analyseAFaire: true, analyseEnLot: false, retireAt: null };
  let analyses = 0;
  let echecs = 0;

  while (Date.now() - debut < budgetMs && echecs < ECHECS_AVANT_ARRET) {
    const limite = new Date(Date.now() - RESERVATION_MS);
    const lot = await prisma.review.findMany({
      where: { ...enAttente, OR: [{ analyseReserveeAt: null }, { analyseReserveeAt: { lt: limite } }] },
      orderBy: { dateCreation: "desc" },
      take: ANALYSES_SIMULTANEES,
      select: { id: true },
    });
    if (lot.length === 0) break;
    const fenetres = await fenetresParEtablissement(maintenant);
    const resultats = await Promise.allSettled(
      lot.map(async ({ id }) => {
        const { count } = await prisma.review.updateMany({
          where: { id, OR: [{ analyseReserveeAt: null }, { analyseReserveeAt: { lt: limite } }] },
          data: { analyseReserveeAt: new Date() },
        });
        if (count === 0) return false;
        await traiterAvis(id, fenetres, maintenant);
        return true;
      }),
    );
    for (const r of resultats) {
      if (r.status === "fulfilled") {
        if (r.value) analyses += 1;
        echecs = 0;
      } else {
        echecs += 1;
        // Jamais le texte de l'avis dans les journaux.
        console.error("Analyse d'un avis reportée", r.reason instanceof Error ? r.reason.name : "erreur inconnue");
      }
    }
    if (resultats.some((r) => r.status === "rejected")) {
      // Libère les avis en échec : ils repartiront au prochain passage.
      await prisma.review.updateMany({ where: { id: { in: lot.map((l) => l.id) }, analyseAFaire: true }, data: { analyseReserveeAt: null } });
    }
  }
  const restants = await prisma.review.count({ where: enAttente });
  return { analyses, restants };
}

/** Brouillons des avis récents arrivés par un lot : l'analyse était en lot, la rédaction reste en appel direct. */
async function brouillonsApresLots(locationIds: string[], echeance: number, maintenant: Date): Promise<number> {
  const candidats = await prisma.review.findMany({
    where: { locationId: { in: locationIds }, analyseEnLot: true, analyseAFaire: false, statut: "A_TRAITER", retireAt: null, drafts: { none: {} }, dateCreation: { gte: debutLecture(maintenant) } },
    orderBy: { dateCreation: "desc" },
    select: { id: true, locationId: true, dateCreation: true },
  });
  if (candidats.length === 0) return 0;
  const fenetres = await fenetresParEtablissement(maintenant);
  let ecrits = 0;
  for (const a of candidats) {
    if (Date.now() >= echeance) break;
    if (!estRecent(a, fenetres, maintenant)) continue;
    try {
      await genererBrouillon(a.id);
      ecrits += 1;
    } catch (error) {
      console.error("Brouillon reporté", error instanceof Error ? error.name : "erreur inconnue");
      break;
    }
  }
  return ecrits;
}

/** Tout ce qu'un passage fait avancer après la lecture de Google : lots de l'import, puis avis arrivés ensuite. */
async function avancerAnalyses(locationIds: string[], budgetMs: number, debut: number, maintenant: Date): Promise<{ analyses: number; restants: number }> {
  const echeance = debut + budgetMs;
  const enLot = await avancerLots(locationIds, echeance, maintenant);
  const ecrits = await brouillonsApresLots(locationIds, echeance, maintenant);
  const { analyses, restants } = await reprendreAnalyses(locationIds, budgetMs, debut);
  return { analyses: enLot + ecrits + analyses, restants };
}

/** Passage de fond (cron) : synchronise et analyse toutes les fiches réellement connectées. */
export async function synchroniserToutesLesFiches(budgetMs: number): Promise<{ fiches: number; faites: number; analyses: number; restants: number; notifies: number }> {
  const debut = Date.now();
  const fiches = await prisma.location.findMany({ where: { googleCompte: { not: null } }, select: { id: true, notificationsGoogle: true } });
  let faites = 0;
  for (const f of fiches) {
    const r = await synchroniserFiche(f.id, "cron");
    if (r.etat === "faite") faites += 1;
    // Le temps réel n'avait pas pu s'enregistrer à la connexion : on retente chaque jour.
    if (f.notificationsGoogle === null) {
      await activerNotifications(f.id).catch((error: unknown) => console.error("Notifications Google non enregistrées", error instanceof Error ? error.message : "erreur inconnue"));
    }
  }
  const { analyses, restants } = await avancerAnalyses(
    fiches.map((f) => f.id),
    budgetMs,
    debut,
    new Date(),
  );
  const { avis } = await notifierAvisATraiter(new Date(), fiches.map((f) => f.id));
  return { fiches: fiches.length, faites, analyses, restants, notifies: avis };
}

/** Après une notification : la liste a été réservée par la route, on lit, on analyse, on prévient. */
export async function apresNotification(locationId: string): Promise<void> {
  await executerListe(locationId);
  await avancerAnalyses([locationId], BUDGET_NOTIFICATION_MS, Date.now(), new Date());
  await notifierAvisATraiter(new Date(), [locationId]);
}

const BUDGET_NOTIFICATION_MS = 120_000;
/** Un tour court : l'écran relance tant qu'il reste des avis à lire. */
const BUDGET_OUVERTURE_MS = 20_000;

/** À l'ouverture de l'application : relit les fiches de l'utilisateur si besoin et avance les analyses. */
export async function synchroniserMesFiches(userId: string): Promise<{ changements: number; restants: number }> {
  const debut = Date.now();
  const fiches = await prisma.location.findMany({ where: { googleCompte: { not: null }, googleConnection: { userId } }, select: { id: true } });
  let changements = 0;
  for (const f of fiches) {
    const r = await synchroniserFiche(f.id, "ouverture");
    changements += r.nouveaux + r.modifies + r.retires;
  }
  const ids = fiches.map((f) => f.id);
  const { analyses, restants } = await avancerAnalyses(ids, BUDGET_OUVERTURE_MS, debut, new Date());
  if (analyses > 0) await notifierAvisATraiter(new Date(), ids);
  return { changements: changements + analyses, restants };
}

export async function aDesFichesConnectees(userId: string): Promise<boolean> {
  return (await prisma.location.count({ where: { googleCompte: { not: null }, googleConnection: { userId } } })) > 0;
}

export async function etatDesFiches(userId: string) {
  const fiches = await prisma.location.findMany({
    where: { googleCompte: { not: null }, googleConnection: { userId } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, lastSyncAt: true, notificationsGoogle: true, _count: { select: { reviews: { where: { analyseAFaire: true, retireAt: null } } } } },
  });
  const enLot = await prisma.review.groupBy({ by: ["locationId"], where: { locationId: { in: fiches.map((f) => f.id) }, analyseAFaire: true, analyseEnLot: true, retireAt: null }, _count: { _all: true } });
  const parFiche = new Map(enLot.map((l) => [l.locationId, l._count._all]));
  return fiches.map(({ _count, ...f }) => ({ ...f, enAttente: _count.reviews, historiqueEnCours: (parFiche.get(f.id) ?? 0) > 0 }));
}
