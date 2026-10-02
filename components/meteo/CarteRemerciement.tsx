import { actionPublierRemerciement } from "@/app/(app)/a-traiter/actions";
import type { RemerciementPropose } from "@/lib/file/service";

/** Mot de remerciement pré-rédigé pour un avis 5 étoiles, publiable en un geste. */
export function CarteRemerciement({ remerciement }: { remerciement: RemerciementPropose | null }) {
  if (!remerciement) return null;
  return (
    <section aria-labelledby="remerciement-titre" className="rounded-2xl bg-surface px-4 py-2">
      <h2 id="remerciement-titre" className="text-xs font-semibold text-encre-douce">
        Remercier {remerciement.auteur} pour ses 5 étoiles
      </h2>
      <p className="mt-1 text-sm leading-snug">{remerciement.texte}</p>
      <form action={actionPublierRemerciement} className="mt-1.5">
        <input type="hidden" name="reviewId" value={remerciement.reviewId} />
        <input type="hidden" name="texte" value={remerciement.texte} />
        <button type="submit" className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
          Publier ce remerciement
        </button>
      </form>
    </section>
  );
}
