import Link from "next/link";
import { Etoiles } from "@/components/file/Etoiles";
import type { Post } from "@/lib/accueil/flux";
import { Avatar } from "./Avatar";

function derniereLigne(post: Post): string {
  if (post.etat === "publie" && post.reponse) return `Vous : ${post.reponse}`;
  if (post.etat === "brouillon") return "Brouillon prêt à relire";
  return post.texte?.trim() || "Avis sans texte";
}

/** Une ligne par client, comme dans Messages : avatar, nom, étoiles, dernière ligne de la conversation. */
export function LigneConversation({ post }: { post: Post }) {
  const enAttente = post.etat === "brouillon" || post.etat === "a_ouvrir";
  return (
    <li className="border-t border-nuage first:border-t-0">
      <Link href={`/a-traiter/${post.id}`} prefetch={false} className="pressable flex items-center gap-3 py-3">
        <Avatar auteur={post.auteur} note={post.note} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-[15px] ${enAttente ? "font-bold" : "font-medium"}`}>{post.auteur}</span>
            <Etoiles note={post.note} />
          </span>
          <span className={`block truncate text-[13px] ${enAttente ? "font-medium text-encre" : "text-encre-douce"}`}>{derniereLigne(post)}</span>
        </span>
      </Link>
    </li>
  );
}

export function ListeConversations({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map((p) => (
        <LigneConversation key={p.id} post={p} />
      ))}
    </ul>
  );
}
