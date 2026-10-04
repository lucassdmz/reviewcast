import { BoutonAction } from "@/components/BoutonAction";
import { actionPublierRemerciement } from "@/app/(app)/a-traiter/actions";
import type { RemerciementPropose } from "@/lib/file/service";

/** Mot de remerciement pré-rédigé pour un avis 5 étoiles, publiable en un geste. */
export function CarteRemerciement({ remerciement }: { remerciement: RemerciementPropose | null }) {
  if (!remerciement) return null;
  return (
    <section aria-labelledby="remerciement-titre" className="bloc">
      <h2 id="remerciement-titre" className="intitule">
        Remercier {remerciement.auteur} pour ses 5 étoiles
      </h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{remerciement.texte}</p>
      {remerciement.signature && <p className="mt-1 text-[15px] text-encre-douce">{remerciement.signature}</p>}
      <form action={actionPublierRemerciement} className="mt-4">
        <input type="hidden" name="reviewId" value={remerciement.reviewId} />
        <input type="hidden" name="texte" value={remerciement.texte} />
        <BoutonAction enCours="Publication…" className="pressable w-full rounded-full bg-encre px-4 py-3 text-[15px] font-bold text-fond">
          Publier ce remerciement
        </BoutonAction>
      </form>
    </section>
  );
}
