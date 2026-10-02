import Link from "next/link";
import type { PeriodeTendances } from "@/lib/analytics/periodes";

const CHOIX: { selection: "30j" | "90j" | "12m"; libelle: string }[] = [
  { selection: "30j", libelle: "30 jours" },
  { selection: "90j", libelle: "90 jours" },
  { selection: "12m", libelle: "12 mois" },
];

/** Sélecteur de période : trois raccourcis et une plage personnalisée. */
export function SelecteurPeriode({ periode, locationId }: { periode: PeriodeTendances; locationId: string | null }) {
  const base = locationId ? `&etablissement=${locationId}` : "";
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const finIncluse = new Date(periode.fin.getTime() - 86_400_000);
  return (
    <nav aria-label="Période" className="no-print space-y-2">
      <ul className="flex gap-2">
        {CHOIX.map((c) => {
          const actif = periode.selection === c.selection;
          return (
            <li key={c.selection}>
              <Link
                href={`/tendances?periode=${c.selection}${base}`}
                aria-current={actif ? "true" : undefined}
                className={`inline-block rounded-full px-3 py-1 text-sm ${actif ? "bg-accent font-semibold text-white" : "bg-surface text-encre-douce"}`}
              >
                {c.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
      <form method="get" action="/tendances" className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="periode" value="perso" />
        {locationId && <input type="hidden" name="etablissement" value={locationId} />}
        <label htmlFor="debut" className="text-encre-douce">
          Du
        </label>
        <input id="debut" type="date" name="debut" defaultValue={iso(periode.debut)} className="rounded-xl border border-nuage bg-surface px-2 py-1" />
        <label htmlFor="fin" className="text-encre-douce">
          au
        </label>
        <input id="fin" type="date" name="fin" defaultValue={iso(finIncluse)} className="rounded-xl border border-nuage bg-surface px-2 py-1" />
        <button type="submit" className="rounded-xl border border-nuage px-3 py-1 hover:bg-nuage">
          Appliquer
        </button>
      </form>
    </nav>
  );
}
