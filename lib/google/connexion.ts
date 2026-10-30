import { decryptSecret, encryptSecret, parseEncryptionKey } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ClientGoogle, GoogleApiError } from "./client";
import { locationDepuisRessource } from "./comparaison";
import { MARGE_JETON_MS } from "./config";
import { AccesRetire, renouvelerJeton, scopeAccorde, type IdentifiantsOAuth } from "./oauth";
import { adresseDeLaFiche, type FicheGoogle, type ReponseJeton } from "./schemas";

/**
 * Connexion d'un compte Google à l'application : refresh token chiffré,
 * jeton d'accès renouvelé à la demande, fiches qu'il gère.
 */
export class ConnexionFicheError extends Error {
  constructor(public readonly code: "refus-scope" | "sans-refresh" | "sans-compte" | "fiche-inconnue" | "fiche-prise" | "compte-pris") {
    super(code);
    this.name = "ConnexionFicheError";
  }
}

export function identifiantsOAuth(): IdentifiantsOAuth {
  const env = getEnv();
  return { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET };
}

const cleChiffrement = () => parseEncryptionKey(getEnv().ENCRYPTION_KEY);

/** Jetons d'accès en mémoire, le temps de leur validité : jamais en base ni dans le navigateur. */
const jetons = new Map<string, { jeton: string; expire: number }>();

/** Jeton d'accès valide de la connexion. Marque la connexion « à reconnecter » si Google a retiré l'accès. */
export async function jetonDeLaConnexion(connexionId: string): Promise<string> {
  const connu = jetons.get(connexionId);
  if (connu && connu.expire > Date.now() + MARGE_JETON_MS) return connu.jeton;
  const c = await prisma.googleConnection.findUniqueOrThrow({ where: { id: connexionId }, select: { refreshTokenEncrypted: true } });
  try {
    const r = await renouvelerJeton(identifiantsOAuth(), decryptSecret(c.refreshTokenEncrypted, cleChiffrement()));
    jetons.set(connexionId, { jeton: r.access_token, expire: Date.now() + r.expires_in * 1000 });
    return r.access_token;
  } catch (error) {
    if (error instanceof AccesRetire) {
      await prisma.googleConnection.update({ where: { id: connexionId }, data: { aReconnecterAt: new Date() } });
    }
    throw error;
  }
}

export function clientDeLaConnexion(connexionId: string): ClientGoogle {
  return new ClientGoogle(() => jetonDeLaConnexion(connexionId));
}

/** Enregistre (ou renouvelle) la connexion après le retour de l'écran de consentement. */
export async function enregistrerConnexion(userId: string, reponse: ReponseJeton): Promise<void> {
  if (!scopeAccorde(reponse.scope)) throw new ConnexionFicheError("refus-scope");
  if (!reponse.refresh_token) throw new ConnexionFicheError("sans-refresh");
  const client = new ClientGoogle(async () => reponse.access_token);
  const [principal] = await client.listerComptes();
  if (!principal) throw new ConnexionFicheError("sans-compte");

  const existante = await prisma.googleConnection.findUnique({ where: { googleAccountId: principal.name }, select: { userId: true, id: true } });
  if (existante && existante.userId !== userId) throw new ConnexionFicheError("compte-pris");

  const donnees = {
    googleAccountName: principal.accountName ?? null,
    refreshTokenEncrypted: encryptSecret(reponse.refresh_token, cleChiffrement()),
    scope: reponse.scope ?? "",
    aReconnecterAt: null,
  };
  const connexion = await prisma.googleConnection.upsert({
    where: { googleAccountId: principal.name },
    create: { userId, googleAccountId: principal.name, ...donnees },
    update: donnees,
    select: { id: true },
  });
  jetons.set(connexion.id, { jeton: reponse.access_token, expire: Date.now() + reponse.expires_in * 1000 });
}

/** Connexion réelle de l'utilisateur (la démonstration n'a pas de refresh token). */
export async function lireConnexion(userId: string) {
  return prisma.googleConnection.findFirst({
    where: { userId, scope: { not: "demo" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, googleAccountName: true, aReconnecterAt: true, locations: { select: { googleLocationId: true } } },
  });
}

export interface FicheDisponible {
  compte: string;
  googleLocationId: string;
  nom: string;
  adresse: string | null;
  lienAvis: string | null;
  rattachee: boolean;
}

function versDisponible(compte: string, f: FicheGoogle, rattachees: Set<string>): FicheDisponible {
  return {
    compte,
    googleLocationId: f.name,
    nom: f.title,
    adresse: adresseDeLaFiche(f),
    lienAvis: f.metadata?.newReviewUri ?? null,
    rattachee: rattachees.has(f.name),
  };
}

/** Toutes les fiches que gère le compte, dans tous ses comptes et groupes, sans doublon. */
export async function listerFichesDisponibles(connexionId: string): Promise<FicheDisponible[]> {
  const client = clientDeLaConnexion(connexionId);
  const rattachees = new Set((await prisma.location.findMany({ where: { googleConnectionId: connexionId }, select: { googleLocationId: true } })).map((l) => l.googleLocationId));
  const parId = new Map<string, FicheDisponible>();
  for (const compte of await client.listerComptes()) {
    for (const fiche of await client.listerFiches(compte.name)) {
      if (!parId.has(fiche.name)) parId.set(fiche.name, versDisponible(compte.name, fiche, rattachees));
    }
  }
  return [...parId.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Rattache une fiche à l'utilisateur. Le choix vient du navigateur : il est
 * vérifié auprès de Google, on ne rattache que ce que ce compte gère vraiment.
 */
export async function rattacherFiche(userId: string, googleLocationId: string): Promise<string> {
  const connexion = await lireConnexion(userId);
  if (!connexion) throw new ConnexionFicheError("fiche-inconnue");
  const fiche = (await listerFichesDisponibles(connexion.id)).find((f) => f.googleLocationId === googleLocationId);
  if (!fiche) throw new ConnexionFicheError("fiche-inconnue");

  const deja = await prisma.location.findUnique({
    where: { googleLocationId },
    select: { id: true, googleConnection: { select: { userId: true } } },
  });
  if (deja && deja.googleConnection.userId !== userId) throw new ConnexionFicheError("fiche-prise");

  const donnees = { nom: fiche.nom, adresse: fiche.adresse, googleCompte: fiche.compte, googleConnectionId: connexion.id };
  const location = await prisma.location.upsert({
    where: { googleLocationId },
    create: { googleLocationId, ...donnees },
    update: donnees,
    select: { id: true },
  });
  await prisma.settings.upsert({
    where: { locationId: location.id },
    create: { locationId: location.id, lienAvis: fiche.lienAvis },
    update: {},
  });
  await activerNotifications(location.id).catch((error: unknown) => {
    // Le temps réel est un plus : sans lui, l'ouverture de l'app et le passage quotidien suffisent.
    console.error("Notifications Google non enregistrées", error instanceof Error ? error.message : "erreur inconnue");
  });
  return location.id;
}

const TYPES_NOTIFIES = ["NEW_REVIEW", "UPDATED_REVIEW"];

/**
 * Enregistre le sujet Pub/Sub sur le compte de la fiche. Un compte n'a qu'un
 * seul sujet : s'il en a déjà un autre, un autre outil s'en sert, on ne
 * l'écrase pas.
 */
export async function activerNotifications(locationId: string): Promise<void> {
  const sujet = process.env.GOOGLE_PUBSUB_TOPIC?.trim();
  if (!sujet) return;
  const l = await prisma.location.findUniqueOrThrow({ where: { id: locationId }, select: { googleCompte: true, googleConnectionId: true } });
  if (!l.googleCompte) return;
  const client = clientDeLaConnexion(l.googleConnectionId);
  const actuel = await client.lireReglageNotifications(l.googleCompte);
  if (actuel.pubsubTopic && actuel.pubsubTopic !== sujet) {
    await prisma.location.update({ where: { id: locationId }, data: { notificationsGoogle: "autre_sujet" } });
    return;
  }
  const dejaBon = actuel.pubsubTopic === sujet && TYPES_NOTIFIES.every((t) => actuel.notificationTypes?.includes(t));
  if (!dejaBon) await client.ecrireReglageNotifications(l.googleCompte, sujet, TYPES_NOTIFIES);
  await prisma.location.update({ where: { id: locationId }, data: { notificationsGoogle: "actives" } });
}

/** Fournit le jeton pour publier la réponse à un avis, à partir de la fiche qui le porte. */
export async function jetonPourAvis(googleReviewId: string): Promise<string> {
  const googleLocationId = locationDepuisRessource(googleReviewId);
  const l = googleLocationId ? await prisma.location.findUnique({ where: { googleLocationId }, select: { googleCompte: true, googleConnectionId: true } }) : null;
  if (!l?.googleCompte) throw new AccesRetire();
  return jetonDeLaConnexion(l.googleConnectionId);
}

/** Message en français pour une erreur rencontrée pendant la connexion de la fiche. */
export function messageConnexion(code: string | undefined): string | null {
  const messages: Record<string, string> = {
    "etat-invalide": "La demande a expiré ou ne vient pas de cet appareil. Reprenez la connexion de votre fiche.",
    "refus-google": "La connexion n'a pas abouti : l'autorisation n'a pas été donnée sur Google.",
    "refus-scope": "Éclaircie a besoin de l'accès à votre fiche pour lire vos avis. Recommencez en laissant la case cochée.",
    "sans-refresh": "Google n'a pas accordé d'accès durable. Recommencez la connexion de votre fiche.",
    "sans-compte": "Ce compte Google ne gère aucune fiche d'établissement.",
    "compte-pris": "Ce compte Google est déjà connecté à un autre utilisateur d'Éclaircie.",
    "fiche-inconnue": "Cette fiche ne fait pas partie de celles que gère votre compte Google.",
    "fiche-prise": "Cette fiche est déjà rattachée à un autre utilisateur d'Éclaircie.",
    "google-indisponible": "Google n'a pas répondu comme prévu. Réessayez dans quelques instants.",
  };
  return code ? (messages[code] ?? messages["google-indisponible"]) : null;
}

/** Code d'erreur stable, à mettre dans une URL, pour une erreur de connexion. */
export function codeErreurConnexion(error: unknown): string {
  if (error instanceof ConnexionFicheError) return error.code;
  if (error instanceof GoogleApiError || error instanceof AccesRetire) return "google-indisponible";
  return "google-indisponible";
}
