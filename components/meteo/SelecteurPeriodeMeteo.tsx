import Link from "next/link";
import { LIBELLES_PERIODE, PERIODES_METEO, PERIODE_METEO_PAR_DEFAUT, type PeriodeMeteo } from "@/lib/meteo/periodes";

/** Choix de la période de la météo : trois durées dans un contrôle segmenté, en tête de la carte. */
export function SelecteurPeriodeMeteo({ periode }: { periode: PeriodeMeteo }) {
  const lien = (p: PeriodeMeteo) => (p === PERIODE_METEO_PAR_DEFAUT ? "/" : `/?periode=${p}`);
  return (
    <nav aria-label="Période" className="inline-block">
      <ul className="inline-flex gap-0.5 rounded-full bg-fond/85 p-1 backdrop-blur-sm">
        {PERIODES_METEO.map((p) => {
          const actif = p === periode;
          return (
            <li key={p}>
              <Link
                href={lien(p)}
                prefetch
                scroll={false}
                aria-current={actif ? "true" : undefined}
                className={`pressable block rounded-full px-3.5 py-1.5 text-[13px] leading-none ${
                  actif ? "bg-surface font-bold shadow-[0_1px_3px_rgb(0_0_0/0.14)]" : "font-medium text-encre-douce"
                }`}
              >
                {LIBELLES_PERIODE[p].court}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
