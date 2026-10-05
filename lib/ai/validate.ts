import type { z } from "zod";
import type { AiTask } from "./types";

/** Erreur visible quand la sortie IA ne respecte pas le schéma après un nouvel essai. */
export class AiOutputError extends Error {
  constructor(
    public readonly tache: AiTask,
    public readonly details: string,
    public readonly brut: unknown,
  ) {
    super(`Sortie IA invalide pour la tâche « ${tache} » : ${details}`);
    this.name = "AiOutputError";
  }
}

/** Erreur visible quand le fournisseur refuse ou ne répond pas. */
export class AiProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AiProviderError";
  }
}

function decrireErreur(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "racine"} : ${i.message}`).join(" ; ");
}

/**
 * Appelle `produire`, valide la sortie avec le schéma, et recommence une fois
 * en cas d'échec (section 4.1). La seconde tentative reçoit le motif d'échec
 * pour que le fournisseur puisse le transmettre au modèle.
 */
export async function validerAvecNouvelEssai<T>(
  tache: AiTask,
  schema: z.ZodType<T>,
  produire: (tentative: number, motifPrecedent: string | null) => Promise<unknown>,
): Promise<T> {
  let motif: string | null = null;
  let brut: unknown = null;
  for (let tentative = 1; tentative <= 2; tentative++) {
    brut = await produire(tentative, motif);
    const resultat = schema.safeParse(brut);
    if (resultat.success) return resultat.data;
    motif = decrireErreur(resultat.error);
  }
  throw new AiOutputError(tache, motif ?? "schéma non respecté", brut);
}
