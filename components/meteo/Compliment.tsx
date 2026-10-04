import type { Compliment as CompliementType } from "@/lib/meteo/compliment";

/** Le compliment du moment : un extrait d'avis 5 étoiles récent. */
export function Compliment({ compliment }: { compliment: CompliementType | null }) {
  if (!compliment) return null;
  return (
    <section aria-labelledby="compliment-titre" className="rounded-3xl bg-soleil-doux p-5">
      <h2 id="compliment-titre" className="intitule">
        Le compliment du moment
      </h2>
      <blockquote className="mt-2">
        <p className="text-balance text-xl font-bold leading-snug tracking-tight">
          {`« ${compliment.texte} »`}
        </p>
        <footer className="mt-2.5 text-sm text-encre-douce">{compliment.auteur}, 5 étoiles</footer>
      </blockquote>
    </section>
  );
}
