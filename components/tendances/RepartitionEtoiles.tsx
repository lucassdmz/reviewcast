import type { Repartition } from "@/lib/analytics/agregation";

/** Répartition des étoiles : barres horizontales, 5 étoiles en premier. */
export function RepartitionEtoiles({ repartition }: { repartition: Repartition }) {
  if (repartition.volume === 0) return null;
  const max = Math.max(...Object.values(repartition.etoiles), 1);
  return (
    <section aria-labelledby="repartition-titre" className="rounded-2xl bg-surface p-4">
      <h2 id="repartition-titre" className="text-sm font-semibold">
        Répartition des étoiles
      </h2>
      <ul className="mt-2 space-y-1">
        {(["5", "4", "3", "2", "1"] as const).map((n) => {
          const nombre = repartition.etoiles[n];
          return (
            <li key={n} className="flex items-center gap-2 text-xs">
              <span className="w-6 whitespace-nowrap text-right" aria-label={`${n} étoiles`}>
                {n} <span aria-hidden="true">★</span>
              </span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-nuage" role="presentation">
                <span className="block h-full rounded-full bg-ciel-fonce" style={{ width: `${(nombre / max) * 100}%` }} />
              </span>
              <span className="w-16 whitespace-nowrap text-right text-encre-douce">
                {nombre} · {repartition.parts[n]} %
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
