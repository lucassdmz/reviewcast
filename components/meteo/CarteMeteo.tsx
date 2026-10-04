import type { Meteo } from "@/lib/db/generated/enums";
import { METEO_LIBELLES } from "@/lib/meteo/calcul";
import { NombreAnime } from "@/components/NombreAnime";
import { LIBELLES_PERIODE, type PeriodeMeteo } from "@/lib/meteo/periodes";
import { Ciel } from "./Ciel";
import { SelecteurPeriodeMeteo } from "./SelecteurPeriodeMeteo";

const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signe(valeur: number, decimales: number): string {
  const texte = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(Math.abs(valeur));
  return valeur > 0 ? `+${texte}` : valeur < 0 ? `−${texte}` : texte;
}

export interface CarteMeteoProps {
  meteo: Meteo;
  noteMoyenneMois: number | null;
  periode: PeriodeMeteo;
  etablissementId: string | null;
  repere: { libelle: string; note: number | null };
  volumeMois: number;
  nbEnthousiastes: number;
  evolutionNote: number | null;
  evolutionVolume: number | null;
  phrase: string | null;
}

/** Météo de la période choisie : le ciel en grand, la note en chiffre héros, la phrase de synthèse, trois repères. */
export function CarteMeteo(p: CarteMeteoProps) {
  const m = METEO_LIBELLES[p.meteo];
  return (
    <section aria-labelledby="meteo-titre" className="relative overflow-hidden rounded-[2rem] bg-surface p-5">
      <Ciel meteo={p.meteo} className="ciel-anime pointer-events-none absolute -right-12 -top-12 h-52 w-52" />
      <div className="relative">
        <SelecteurPeriodeMeteo periode={p.periode} etablissementId={p.etablissementId} />

        <p className="mt-7 text-[4.5rem] font-bold leading-none tracking-tight">
          {p.noteMoyenneMois === null ? "–" : <NombreAnime valeur={p.noteMoyenneMois} />}
          <span className="ml-1 text-2xl font-medium text-encre-douce">/5</span>
        </p>
        <p className="mt-1.5 text-[13px] text-encre-douce">
          {p.noteMoyenneMois === null ? "Pas encore d'avis sur la période" : "Note moyenne"}
          {p.evolutionNote !== null && p.evolutionNote !== 0 && <span>, {signe(p.evolutionNote, 1)} vs {LIBELLES_PERIODE[p.periode].precedente}</span>}
        </p>

        <h2 id="meteo-titre" className="mt-5 text-2xl font-bold leading-tight tracking-tight">
          {m.libelle}
        </h2>
        <p className="mt-1 text-[15px] leading-snug text-encre-douce">{p.phrase ?? m.description}</p>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-fond px-3 py-2.5">
            <dd className="text-xl font-bold leading-none">
              {p.volumeMois}
              {p.evolutionVolume !== null && p.evolutionVolume !== 0 && (
                <span className="ml-1 text-xs font-medium text-encre-douce">{signe(p.evolutionVolume, 0)}</span>
              )}
            </dd>
            <dt className="mt-1.5 text-xs text-encre-douce">Avis reçus</dt>
          </div>
          <div className="rounded-2xl bg-fond px-3 py-2.5">
            <dd className="text-xl font-bold leading-none">{p.nbEnthousiastes}</dd>
            <dt className="mt-1.5 text-xs text-encre-douce">Enthousiastes</dt>
          </div>
          <div className="rounded-2xl bg-fond px-3 py-2.5">
            <dd className="text-xl font-bold leading-none">{p.repere.note === null ? "–" : formatNote.format(p.repere.note)}</dd>
            <dt className="mt-1.5 text-xs text-encre-douce">{p.repere.libelle}</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}
