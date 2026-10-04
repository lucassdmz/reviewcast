import type { Meteo } from "@/lib/db/generated/enums";
import { FENETRE_METEO_JOURS } from "@/lib/meteo/agregation";
import { METEO_LIBELLES } from "@/lib/meteo/calcul";
import { NombreAnime } from "@/components/NombreAnime";
import { Ciel } from "./Ciel";

const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signe(valeur: number, decimales: number): string {
  const texte = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(Math.abs(valeur));
  return valeur > 0 ? `+${texte}` : valeur < 0 ? `−${texte}` : texte;
}

export interface CarteMeteoProps {
  meteo: Meteo;
  noteMoyenneMois: number | null;
  noteMoyenne12Mois: number | null;
  volumeMois: number;
  nbEnthousiastes: number;
  evolutionNote: number | null;
  evolutionVolume: number | null;
  phrase: string | null;
}

/** Météo des 40 derniers jours : le ciel en grand, la note en chiffre héros, la phrase de synthèse, trois repères. */
export function CarteMeteo(p: CarteMeteoProps) {
  const m = METEO_LIBELLES[p.meteo];
  return (
    <section aria-labelledby="meteo-titre" className="relative overflow-hidden rounded-[2rem] bg-surface p-5">
      <Ciel meteo={p.meteo} className="ciel-anime pointer-events-none absolute -right-12 -top-12 h-52 w-52" />
      <div className="relative">
        <p className="text-sm font-medium">{FENETRE_METEO_JOURS} derniers jours</p>

        <p className="mt-9 text-[4.5rem] font-bold leading-none tracking-tight">
          {p.noteMoyenneMois === null ? "–" : <NombreAnime valeur={p.noteMoyenneMois} />}
          <span className="ml-1 text-2xl font-medium text-encre-douce">/5</span>
        </p>
        <p className="mt-1.5 text-[13px] text-encre-douce">
          {p.noteMoyenneMois === null ? "Pas encore d'avis sur la période" : "Note moyenne"}
          {p.evolutionNote !== null && p.evolutionNote !== 0 && <span>, {signe(p.evolutionNote, 1)} vs les {FENETRE_METEO_JOURS} jours précédents</span>}
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
            <dd className="text-xl font-bold leading-none">{p.noteMoyenne12Mois === null ? "–" : formatNote.format(p.noteMoyenne12Mois)}</dd>
            <dt className="mt-1.5 text-xs text-encre-douce">Sur 12 mois</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}
