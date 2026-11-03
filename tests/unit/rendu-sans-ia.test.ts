import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function fichiers(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(join(dossier, e.name)) : [join(dossier, e.name)]));
}

/** Modules qui déclenchent un appel payant : aucune page ni aucun layout ne les importe, sauf l'aperçu demandé à l'écran, en streaming. */
const INTERDITS = [/@\/lib\/ai\/(service|factory)/, /redigerSynthese/, /preparerMercis/, /creerRemerciement/, /genererBrouillon/];

describe("aucune page n'attend l'IA", () => {
  const pages = fichiers("app").filter((f) => /\/(page|layout)\.tsx$/.test(f));

  it("trouve bien les pages", () => {
    expect(pages.length).toBeGreaterThan(5);
  });

  it.each(pages)("%s n'importe aucun appel à l'IA", (fichier) => {
    const contenu = readFileSync(fichier, "utf8");
    for (const motif of INTERDITS) expect(contenu).not.toMatch(motif);
  });

  it("l'accueil et le service de la file ne rédigent rien à la lecture", () => {
    expect(readFileSync("lib/accueil/service.ts", "utf8")).not.toMatch(/creerRemerciement|genererBrouillon/);
    const mercis = readFileSync("lib/accueil/mercis.ts", "utf8");
    const lecture = mercis.slice(mercis.indexOf("export async function lireMercis"), mercis.indexOf("export async function preparerMercis"));
    expect(lecture).not.toMatch(/creerRemerciement/);
  });

  it("l'aperçu de la voix passe par Suspense", () => {
    expect(readFileSync("app/(app)/reglages/[section]/page.tsx", "utf8")).toMatch(/<Suspense fallback=\{<ApercuEnAttente \/>\}>/);
  });
});
