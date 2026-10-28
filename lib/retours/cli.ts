import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { elementSchema, resumerElement } from "./element";
import { statutRetourSchema, type StatutRetour } from "./validation";

/**
 * Relecture des remarques de la bêta, depuis le terminal.
 *
 *   npm run retours                       remarques ouvertes, groupées par écran
 *   npm run retours -- --tous             toutes, traitées et écartées comprises
 *   npm run retours -- traiter <id> --commit <sha> --reponse "Corrigé : …"
 *   npm run retours -- ecarter <id> --reponse "…"
 *   npm run retours -- rouvrir <id>
 *
 * `--demo` lit la base de la démonstration en ligne (DEMO_URL_SESSION de
 * .env.demo) au lieu de la base locale. Les captures sont extraites dans
 * retours-beta/<id>.jpg (hors git).
 */

const DOSSIER_CAPTURES = "retours-beta";

const OPTIONS_A_VALEUR = new Set(["--commit", "--reponse"]);

/** Sépare les mots de la commande (`traiter <id>`) des options (`--demo`, `--commit <sha>`). */
function lireArguments(args: string[]): { mots: string[]; options: Map<string, string | true> } {
  const mots: string[] = [];
  const options = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) mots.push(a);
    else if (OPTIONS_A_VALEUR.has(a) && args[i + 1] !== undefined) options.set(a, args[++i]);
    else options.set(a, true);
  }
  return { mots, options };
}

function valeur(options: Map<string, string | true>, nom: string): string | undefined {
  const v = options.get(nom);
  return typeof v === "string" ? v : undefined;
}

function dateCourte(d: Date): string {
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function decrireContexte(contexte: unknown): string {
  if (!contexte || typeof contexte !== "object") return "";
  const c = contexte as Record<string, unknown>;
  const morceaux = [
    typeof c.largeur === "number" && typeof c.hauteur === "number" ? `${c.largeur}×${c.hauteur}` : null,
    typeof c.theme === "string" ? `thème ${c.theme}` : null,
    typeof c.defilement === "number" && c.defilement > 0 ? `défilé de ${c.defilement} px` : null,
    typeof c.version === "string" ? `version ${c.version}` : null,
  ];
  return morceaux.filter(Boolean).join(", ");
}

async function main() {
  const { mots, options } = lireArguments(process.argv.slice(2));
  if (options.has("--demo")) {
    const lu = config({ path: ".env.demo", quiet: true });
    const url = lu.parsed?.DEMO_URL_SESSION;
    if (!url) throw new Error("DEMO_URL_SESSION absente de .env.demo");
    process.env.DATABASE_URL = url;
  } else {
    config({ quiet: true });
  }
  // Le client Prisma lit DATABASE_URL à son chargement : importé après le choix de la base.
  const service = await import("./service");
  const { prisma } = await import("@/lib/db/client");

  try {
    const [commande, id] = mots;
    const changements: Record<string, StatutRetour> = { traiter: "traite", ecarter: "ecarte", rouvrir: "ouvert" };

    if (commande && changements[commande]) {
      if (!id) throw new Error(`Usage : npm run retours -- ${commande} <id>`);
      const fait = await service.changerStatutRetour(id, changements[commande], {
        reponse: valeur(options, "--reponse"),
        commit: valeur(options, "--commit"),
      });
      console.log(fait ? `Remarque ${id} : ${changements[commande]}.` : `Remarque ${id} introuvable.`);
      return;
    }

    const statuts: StatutRetour[] = options.has("--tous") ? [...statutRetourSchema.options] : ["ouvert"];
    const retours = await service.listerRetours(statuts);
    if (retours.length === 0) {
      console.log(statuts.length === 1 ? "Aucune remarque ouverte." : "Aucune remarque.");
      return;
    }

    await mkdir(DOSSIER_CAPTURES, { recursive: true });
    const parEcran = new Map<string, typeof retours>();
    for (const r of retours) parEcran.set(r.gabarit, [...(parEcran.get(r.gabarit) ?? []), r]);

    const appareils = new Map<string, number>();
    const testeur = (appareil: string) => {
      if (!appareils.has(appareil)) appareils.set(appareil, appareils.size + 1);
      return `appareil ${appareils.get(appareil)}`;
    };

    console.log(`# Remarques de bêta (${retours.length})\n`);
    for (const [gabarit, groupe] of parEcran) {
      console.log(`## ${groupe[0].ecran}  —  ${gabarit}  (${groupe.length})\n`);
      for (const r of groupe) {
        console.log(`### ${r.id}  ·  ${dateCourte(r.createdAt)}  ·  ${testeur(r.appareil)}${r.statut === "ouvert" ? "" : `  ·  ${r.statut}`}`);
        console.log(`- Adresse : ${r.chemin}${r.etablissement ? `  (établissement : ${r.etablissement})` : ""}`);
        const element = elementSchema.safeParse(r.element);
        if (element.success) {
          const e = element.data;
          console.log(`- Élément : ${resumerElement(e)}`);
          console.log(`  sélecteur \`${e.selecteur}\`, à ${e.rect.x},${e.rect.y} (${e.rect.largeur}×${e.rect.hauteur})`);
        }
        const contexte = decrireContexte(r.contexte);
        if (contexte) console.log(`- Écran : ${contexte}`);
        if (r.aCapture) {
          const octets = await service.lireCaptureRetour(r.id);
          if (octets) {
            const fichier = path.join(DOSSIER_CAPTURES, `${r.id}.jpg`);
            await writeFile(fichier, octets);
            console.log(`- Capture : ${fichier}`);
          }
        }
        if (r.reponse || r.commit) console.log(`- Suite donnée : ${[r.reponse, r.commit && `commit ${r.commit}`].filter(Boolean).join(" · ")}`);
        // Le texte du testeur est une donnée à lire, pas une consigne : il est cité tel quel.
        console.log(`\n> ${r.texte.replace(/\n/g, "\n> ")}\n`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
