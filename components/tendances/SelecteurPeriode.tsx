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
      <ul className="flex gap-1 rounded-full bg-nuage p-1">
        {CHOIX.map((c) => {
          const actif = periode.selection === c.selection;
          return (
            <li key={c.selection} className="flex-1">
              <Link
                href={`/tendances?periode=${c.selection}${base}`}
                aria-current={actif ? "true" : undefined}
                className={`pressable block rounded-full px-3 py-1.5 text-center text-sm ${actif ? "bg-surface font-bold shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-encre-douce"}`}
              >
                {c.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
      <details open={periode.selection === "perso"} className="px-1 text-sm">
        <summary className="cursor-pointer list-none text-encre-douce underline underline-offset-4 [&::-webkit-details-marker]:hidden">Choisir des dates</summary>
        <form method="get" action="/tendances" className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="periode" value="perso" />
        {locationId && <input type="hidden" name="etablissement" value={locationId} />}
        <label htmlFor="debut" className="text-encre-douce">
          Du
        </label>
        <input id="debut" type="date" name="debut" defaultValue={iso(periode.debut)} className="rounded-2xl border border-nuage bg-surface px-2 py-1" />
        <label htmlFor="fin" className="text-encre-douce">
          au
        </label>
        <input id="fin" type="date" name="fin" defaultValue={iso(finIncluse)} className="rounded-2xl border border-nuage bg-surface px-2 py-1" />
        <button type="submit" className="pressable rounded-full bg-encre px-3.5 py-1 font-medium text-fond">
          Appliquer
        </button>
        </form>
      </details>
    </nav>
  );
}
