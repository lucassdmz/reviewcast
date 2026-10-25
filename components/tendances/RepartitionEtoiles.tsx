import type { CSSProperties } from "react";
import type { Repartition } from "@/lib/analytics/agregation";

const COULEUR: Record<"5" | "4" | "3" | "2" | "1", string> = {
  "5": "bg-matcha-vif",
  "4": "bg-matcha-vif",
  "3": "bg-soleil",
  "2": "bg-rose",
  "1": "bg-rose",
};

/**
 * Répartition des étoiles, 5 étoiles en premier : une barre épaisse sans rail
 * derrière elle, le nombre posé au bout de la barre. Les barres poussent l'une
 * après l'autre. La part en pourcentage reste lisible par les lecteurs d'écran.
 */
export function RepartitionEtoiles({ repartition }: { repartition: Repartition }) {
  if (repartition.volume === 0) return null;
  const max = Math.max(...Object.values(repartition.etoiles), 1);
  return (
    <section aria-labelledby="repartition-titre" className="bloc">
      <h2 id="repartition-titre" className="titre-display text-lg font-bold">
        Répartition des étoiles
      </h2>
      <ul className="mt-4 space-y-2.5">
        {(["5", "4", "3", "2", "1"] as const).map((n, ligne) => {
          const nombre = repartition.etoiles[n];
          return (
            <li key={n} className="flex items-center gap-3">
              <span className="flex w-7 items-center gap-0.5 text-sm font-semibold" aria-label={`${n} étoiles`}>
                {n}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-soleil" aria-hidden="true">
                  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill="currentColor" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {nombre > 0 && (
                  <span
                    className={`jauge block h-4 rounded-full border-2 border-trait ${COULEUR[n]}`}
                    style={{ width: `${Math.max(6, (nombre / max) * 85)}%`, "--delai": `${ligne * 70}ms` } as CSSProperties}
                    aria-hidden="true"
                  />
                )}
                <span className={`text-sm font-bold tabular-nums ${nombre === 0 ? "text-encre-douce" : ""}`}>
                  {nombre}
                  <span className="sr-only"> avis, {repartition.parts[n]} %</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
