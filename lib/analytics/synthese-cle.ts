import { createHash } from "node:crypto";
import type { SummarizeInput } from "@/lib/ai/types";
import type { Tendances } from "./tendances";

/**
 * Règles de rangement des synthèses, en fonctions pures. Une synthèse se range
 * par période réelle (du… au…) et porte l'empreinte des chiffres qu'elle
 * raconte : tant que ces chiffres ne bougent pas, elle n'est pas repayée.
 */

/** À qui appartient la synthèse : une fiche, ou la vue d'ensemble d'un groupe de fiches précis. */
export function porteeSynthese(etablissement: { id: string } | null, etablissements: { id: string }[]): string {
  if (etablissement) return `fiche:${etablissement.id}`;
  const ids = etablissements.map((e) => e.id).sort();
  return `ensemble:${createHash("sha256").update(ids.join(",")).digest("hex").slice(0, 32)}`;
}

/** Ce que le modèle reçoit. `null` : rien à raconter sur cette période, donc rien à payer. */
export function entreeSynthese(t: Tendances): SummarizeInput | null {
  if (t.repartition.volume === 0 || t.repartition.noteMoyenne === null) return null;
  return {
    etablissement: t.etablissement?.nom ?? null,
    periode: t.periode.libelle,
    volume: t.repartition.volume,
    noteMoyenne: t.repartition.noteMoyenne,
    noteMoyennePrecedente: t.precedente.noteMoyenne,
    repartition: t.repartition.etoiles,
    themesPositifs: t.positifs.map((p) => ({ libelle: p.libelle, nombre: p.nombre })),
    themesNegatifs: t.negatifs.map((p) => ({ libelle: p.libelle, nombre: p.nombre })),
    tauxReponse: t.reactivite.tauxReponse === null ? null : t.reactivite.tauxReponse / 100,
  };
}

const auDixieme = (note: number | null) => (note === null ? null : Math.round(note * 10) / 10);

/**
 * Empreinte des chiffres que la synthèse raconte. Les notes comptent au dixième,
 * comme à l'écran. Le taux de réponse n'y entre pas : chaque réponse publiée le
 * ferait bouger, et une synthèse serait repayée à chaque geste de la gérante.
 */
export function empreinteSynthese(entree: SummarizeInput): string {
  const contenu = JSON.stringify({
    etablissement: entree.etablissement,
    periode: entree.periode,
    volume: entree.volume,
    note: auDixieme(entree.noteMoyenne),
    precedente: auDixieme(entree.noteMoyennePrecedente),
    repartition: ["1", "2", "3", "4", "5"].map((n) => entree.repartition[n as keyof SummarizeInput["repartition"]]),
    positifs: entree.themesPositifs.map((t) => [t.libelle, t.nombre]),
    negatifs: entree.themesNegatifs.map((t) => [t.libelle, t.nombre]),
  });
  return createHash("sha256").update(contenu).digest("hex").slice(0, 32);
}

export interface LigneSynthese {
  debut: Date;
  fin: Date;
  libelle: string;
  empreinte: string | null;
  texte: string | null;
  updatedAt: Date;
}

export interface ChoixSynthese<L> {
  ligne: L | null;
  /** Vrai si le texte correspond aux chiffres actuels : rien à rédiger. */
  aJour: boolean;
}

/**
 * La synthèse à montrer parmi celles déjà stockées, sans appel à l'IA :
 * 1. mêmes chiffres, même période ; 2. mêmes chiffres sur une autre période
 * glissante (le lendemain, sur une fiche calme) : le texte serait le même ;
 * 3. à défaut, la dernière de cette période ou de ce libellé, montrée le temps
 * que la nouvelle arrive.
 */
export function choisirSynthese<L extends LigneSynthese>(lignes: L[], periode: { debut: Date; fin: Date; libelle: string }, empreinte: string): ChoixSynthese<L> {
  const avecTexte = lignes.filter((l) => l.texte).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const memePeriode = (l: L) => l.debut.getTime() === periode.debut.getTime() && l.fin.getTime() === periode.fin.getTime();
  const memesChiffres = avecTexte.filter((l) => l.empreinte === empreinte);
  const fraiche = memesChiffres.find(memePeriode) ?? memesChiffres[0];
  if (fraiche) return { ligne: fraiche, aJour: true };
  return { ligne: avecTexte.find(memePeriode) ?? avecTexte.find((l) => l.libelle === periode.libelle) ?? null, aJour: false };
}

/** Une réservation plus ancienne appartient à un passage interrompu : elle est libérée. */
export const RESERVATION_SYNTHESE_MS = 2 * 60_000;
