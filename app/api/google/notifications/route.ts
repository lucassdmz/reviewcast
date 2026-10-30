import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { locationDepuisRessource } from "@/lib/google/comparaison";
import { deciderNotification } from "@/lib/google/limites";
import { clesOidcGoogle, configPubSub, jetonPubSubValide, lireNotification } from "@/lib/google/pubsub";
import { apresNotification, reserverListe } from "@/lib/google/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Réception push de Cloud Pub/Sub. Sans jeton OIDC valide, rien n'est lu.
 * 204 acquitte le message ; 429 le fait représenter plus tard par Pub/Sub,
 * quand la liste précédente est trop récente. Aucune donnée de l'avis n'est
 * prise dans le message : il ne sert qu'à savoir quelle fiche relire.
 */
export async function POST(request: Request) {
  if (!(await jetonPubSubValide(request.headers.get("authorization"), configPubSub(), clesOidcGoogle()))) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const notification = lireNotification(await request.json().catch(() => null));
  const acquitter = new NextResponse(null, { status: 204 });
  if (!notification) return acquitter;

  const googleLocationId = locationDepuisRessource(notification.ressource);
  const fiche = googleLocationId ? await prisma.location.findUnique({ where: { googleLocationId }, select: { id: true, googleCompte: true, derniereListeAt: true } }) : null;
  if (!fiche?.googleCompte) return acquitter;

  const decision = deciderNotification(notification.publieLe, fiche.derniereListeAt, new Date());
  if (decision === "deja-couverte") return acquitter;
  if (decision === "plus-tard" || !(await reserverListe(fiche.id, "notification"))) {
    return NextResponse.json({ erreur: "Trop tôt" }, { status: 429 });
  }
  // Réponse immédiate : Pub/Sub attend un accusé en quelques secondes, la lecture de Google se poursuit après.
  after(() => apresNotification(fiche.id));
  return acquitter;
}
