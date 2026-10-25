import { prisma } from "@/lib/db/client";
import type { ReviewStatus } from "@/lib/db/generated/enums";
import { FENETRE_FILE_JOURS, fenetreGlissante } from "@/lib/meteo/agregation";
import { STATUTS_FILE } from "@/lib/file/statuts";
import { lireVoix } from "@/lib/voix/service";
import { sansSignature } from "@/lib/voix/signature";

/**
 * Le fil de l'accueil : chaque avis est un post, avec sous lui ce que vous
 * avez répondu ou le brouillon qui attend. Les avis récents à relire passent
 * en tête ; tout le reste suit par date.
 */
export type EtatPost = "brouillon" | "a_ouvrir" | "publie" | "rien";

export interface Post {
  id: string;
  auteur: string;
  note: number;
  dateCreation: Date;
  texte: string | null;
  /** Le sujet qui fâche, en minuscules (« le prix »), ou null. */
  sujet: string | null;
  etat: EtatPost;
  /** Le brouillon (état brouillon) ou la réponse publiée (état publié), sans la signature. */
  reponse: string | null;
  /** Vrai pour un avis récent qui attend une réponse : il est en tête du fil. */
  aRelire: boolean;
}

function etatDe(statut: ReviewStatus, reponsePubliee: string | null): EtatPost {
  if (reponsePubliee) return "publie";
  if (statut === "BROUILLON_PRET") return "brouillon";
  if (statut === "A_TRAITER") return "a_ouvrir";
  return "rien";
}

export async function listerFlux(locationId: string | null, maintenant = new Date(), limite = 40): Promise<Post[]> {
  const avis = await prisma.review.findMany({
    where: { ...(locationId ? { locationId } : {}), retireAt: null },
    orderBy: { dateCreation: "desc" },
    take: limite,
    include: {
      drafts: { orderBy: { version: "desc" }, take: 1, select: { texte: true } },
      analysis: { select: { themes: { select: { polarite: true, theme: { select: { libelle: true } } } } } },
    },
  });
  const signatures = new Map<string, string | null>();
  for (const id of new Set(avis.map((a) => a.locationId))) signatures.set(id, (await lireVoix(id)).signature);
  const depuis = fenetreGlissante(maintenant, FENETRE_FILE_JOURS).debut;

  const posts = avis.map((a): Post => {
    const etat = etatDe(a.statut, a.reponseGoogleTexte);
    const signature = signatures.get(a.locationId) ?? null;
    const brut = etat === "publie" ? a.reponseGoogleTexte : etat === "brouillon" ? (a.drafts[0]?.texte ?? null) : null;
    const sujet = a.analysis?.themes.find((t) => t.polarite === "NEGATIF")?.theme.libelle ?? null;
    return {
      id: a.id,
      auteur: a.auteur,
      note: a.note,
      dateCreation: a.dateCreation,
      texte: a.texte,
      sujet: sujet ? sujet.charAt(0).toLocaleLowerCase("fr") + sujet.slice(1) : null,
      etat,
      reponse: brut ? sansSignature(brut, signature) : null,
      aRelire: (STATUTS_FILE as readonly ReviewStatus[]).includes(a.statut) && a.dateCreation >= depuis,
    };
  });
  // Les avis à relire d'abord, puis le reste : l'ordre par date est conservé dans chaque groupe.
  return [...posts.filter((p) => p.aRelire), ...posts.filter((p) => !p.aRelire)];
}
