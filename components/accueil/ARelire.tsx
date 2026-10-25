import Link from "next/link";
import { actionPublierDepuisAccueil } from "@/app/(app)/a-traiter/actions";
import { BoutonAction } from "@/components/BoutonAction";
import type { Post } from "@/lib/accueil/flux";
import { Avatar } from "./Avatar";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

function citation(texte: string, max = 160): string {
  const t = texte.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function sousTitre(post: Post): string {
  return [formatDate.format(post.dateCreation), post.sujet].filter(Boolean).join(" · ");
}

/** Le premier avis à relire, déployé : l'avis cité, le brouillon entier, Publier ou Modifier. */
export function CarteARelire({ post }: { post: Post }) {
  const fiche = `/a-traiter/${post.id}`;
  return (
    <li className="rounded-3xl bg-soleil-doux px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar auteur={post.auteur} note={post.note} className="h-8 w-8 bg-surface text-[12px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">
            {post.auteur} · {post.note} étoile{post.note > 1 ? "s" : ""}
          </p>
          <p className="truncate text-xs text-encre-douce">{sousTitre(post)}</p>
        </div>
      </div>
      {post.texte && <p className="mt-2.5 text-sm leading-snug text-encre-douce">« {citation(post.texte)} »</p>}
      {post.etat === "brouillon" && post.reponse ? (
        <>
          <p className="mt-2.5 whitespace-pre-line text-sm leading-snug">{post.reponse}</p>
          <div className="mt-3 flex gap-2">
            <form action={actionPublierDepuisAccueil} className="flex-1">
              <input type="hidden" name="reviewId" value={post.id} />
              <input type="hidden" name="texte" value={post.reponse} />
              <BoutonAction enCours="Publication…" className="pressable w-full rounded-full bg-encre py-2.5 text-sm font-bold text-fond">
                Publier
              </BoutonAction>
            </form>
            <Link href={fiche} prefetch={false} className="pressable flex-1 rounded-full bg-surface py-2.5 text-center text-sm font-bold">
              Modifier
            </Link>
          </div>
        </>
      ) : (
        <Link href={fiche} prefetch={false} className="pressable mt-3 block rounded-full bg-encre py-2.5 text-center text-sm font-bold text-fond">
          Préparer une réponse
        </Link>
      )}
    </li>
  );
}

/** Les avis à relire suivants, repliés sur une ligne. */
export function LigneARelire({ post }: { post: Post }) {
  return (
    <li>
      <Link href={`/a-traiter/${post.id}`} prefetch={false} className="pressable flex items-center gap-2.5 rounded-3xl bg-soleil-doux px-4 py-3">
        <Avatar auteur={post.auteur} note={post.note} className="h-8 w-8 bg-surface text-[12px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight">
            {post.auteur} · {post.note} étoile{post.note > 1 ? "s" : ""}
          </span>
          <span className="block truncate text-xs text-encre-douce">
            {sousTitre(post)} · {post.etat === "brouillon" ? "brouillon prêt" : "à répondre"}
          </span>
        </span>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-encre-douce" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
