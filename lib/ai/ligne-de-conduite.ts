import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LigneDeConduite } from "./types";

/** Lecture de la ligne de conduite depuis un fichier Markdown (docs/ligne-de-conduite.md par défaut). */
export async function lireLigneDeConduiteFichier(
  fichier = path.join(process.cwd(), "docs", "ligne-de-conduite.md"),
): Promise<LigneDeConduite> {
  try {
    return parserLigneDeConduite(await readFile(fichier, "utf8"));
  } catch {
    return { texte: "", exemples: [] };
  }
}

/**
 * Découpe le document : tout sauf la section « Exemples de réponses » forme
 * le texte ; chaque bloc de cette section (séparé par `---`) est un exemple.
 */
export function parserLigneDeConduite(markdown: string): LigneDeConduite {
  const marqueur = /^##\s+Exemples de réponses\s*$/m;
  const index = markdown.search(marqueur);
  if (index === -1) return { texte: markdown.trim(), exemples: [] };
  const texte = markdown.slice(0, index).trim();
  const section = markdown.slice(index).replace(marqueur, "").trim();
  const exemples = section
    .split(/^\s*---\s*$/m)
    .map((bloc) => bloc.trim())
    .filter((bloc) => bloc.length > 0);
  return { texte, exemples };
}
