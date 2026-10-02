import { prisma } from "@/lib/db/client";

/** Actions sensibles journalisées (section 7 du cdc). */
export type AuditAction =
  | "connexion"
  | "deconnexion"
  | "publication_reponse"
  | "modification_ligne_de_conduite"
  | "changement_cle_api"
  | "export_donnees"
  | "suppression_donnees";

export async function logAudit(params: {
  userId?: string | null;
  action: AuditAction;
  cible?: string;
  details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      cible: params.cible,
      details: params.details,
    },
  });
}
