import { decryptSecret, parseEncryptionKey } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db/client";
import { lireLigneDeConduiteFichier } from "./ligne-de-conduite";
import { MODELES_PAR_DEFAUT } from "./pricing";
import { consignesVoix } from "@/lib/voix/reglages";
import { exemplesAppris, lireVoix } from "@/lib/voix/service";
import type { AiConfig, LigneDeConduite } from "./types";

/**
 * Résout la configuration IA d'un établissement : réglages en base, sinon
 * variables d'environnement. `AI_PROVIDER=fake` force le fournisseur simulé
 * (développement sans clé, tests de parcours).
 */
export async function resolveAiConfig(locationId: string | null): Promise<AiConfig> {
  if (process.env.AI_PROVIDER === "fake") {
    return { fournisseur: "FAKE", apiKey: null, modeles: { ...MODELES_PAR_DEFAUT } };
  }
  const settings = locationId ? await prisma.settings.findUnique({ where: { locationId } }) : null;
  let apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  if (settings?.cleIaChiffree && process.env.ENCRYPTION_KEY) {
    apiKey = decryptSecret(settings.cleIaChiffree, parseEncryptionKey(process.env.ENCRYPTION_KEY));
  }
  return {
    fournisseur: settings?.fournisseurIa ?? "ANTHROPIC",
    apiKey,
    modeles: {
      analyse: settings?.modeleAnalyse ?? MODELES_PAR_DEFAUT.analyse,
      redaction: settings?.modeleRedaction ?? MODELES_PAR_DEFAUT.redaction,
    },
  };
}

/**
 * Ligne de conduite envoyée au modèle : le texte de l'établissement (sinon
 * docs/ligne-de-conduite.md), puis les réglages de la voix traduits en
 * consignes. Les corrections retenues s'ajoutent aux réponses de référence.
 */
export async function resolveLigneDeConduite(locationId: string | null): Promise<LigneDeConduite> {
  const settings = locationId ? await prisma.settings.findUnique({ where: { locationId } }) : null;
  const base = settings?.ligneDeConduite?.trim()
    ? { texte: settings.ligneDeConduite, exemples: settings.exemplesReference }
    : await lireLigneDeConduiteFichier();
  const voix = await lireVoix(locationId);
  const appris = await exemplesAppris(locationId, voix);
  return {
    texte: [base.texte.trim(), consignesVoix(voix)].filter(Boolean).join("\n\n"),
    exemples: [...appris, ...base.exemples],
    voix,
  };
}
