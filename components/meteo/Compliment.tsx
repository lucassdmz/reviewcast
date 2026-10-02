import type { Compliment as CompliementType } from "@/lib/meteo/compliment";

/** Le compliment du moment : un extrait d'avis 5 étoiles récent. */
export function Compliment({ compliment }: { compliment: CompliementType | null }) {
  if (!compliment) return null;
  return (
    <section aria-labelledby="compliment-titre" className="rounded-2xl bg-soleil-doux px-4 py-2">
      <h2 id="compliment-titre" className="text-xs font-semibold text-encre-douce">
        Le compliment du moment
      </h2>
      <blockquote className="mt-1">
        <p className="text-sm leading-snug">« {compliment.texte} »</p>
        <footer className="mt-1 text-xs text-encre-douce">{compliment.auteur}, 5 étoiles</footer>
      </blockquote>
    </section>
  );
}
