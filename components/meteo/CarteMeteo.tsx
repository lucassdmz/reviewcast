import type { Meteo } from "@/lib/db/generated/enums";
import { METEO_LIBELLES } from "@/lib/meteo/calcul";

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

/** Météo du mois : icône, note en chiffre héros, volume, évolution, phrase de synthèse. */
export function CarteMeteo(p: CarteMeteoProps) {
  const m = METEO_LIBELLES[p.meteo];
  return (
    <section aria-labelledby="meteo-titre" className="rounded-3xl bg-ciel p-4">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="text-5xl leading-none">
          {m.icone}
        </span>
        <div>
          <h2 id="meteo-titre" className="text-lg font-bold">
            {m.libelle}
          </h2>
          <p className="text-sm text-encre-douce">{m.description}</p>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-4">
        <div className="w-[52%] shrink-0">
          <p className="text-4xl font-semibold leading-none">
            {p.noteMoyenneMois === null ? "–" : formatNote.format(p.noteMoyenneMois)}
            <span className="ml-1 text-xl text-encre-douce" aria-hidden="true">
              ★
            </span>
          </p>
          <p className="mt-1 text-xs text-encre-douce">
            {p.noteMoyenneMois === null ? "Pas encore d'avis ce mois-ci" : "Note moyenne du mois"}
            {p.evolutionNote !== null && p.evolutionNote !== 0 && (
              <span className="block">{signe(p.evolutionNote, 1)} vs mois dernier</span>
            )}
          </p>
        </div>
        <dl className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="whitespace-nowrap text-encre-douce">Avis reçus</dt>
            <dd className="whitespace-nowrap font-semibold">
              {p.volumeMois}
              {p.evolutionVolume !== null && p.evolutionVolume !== 0 && (
                <span className="ml-1 font-normal text-encre-douce">({signe(p.evolutionVolume, 0)})</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="whitespace-nowrap text-encre-douce">Enthousiastes</dt>
            <dd className="font-semibold">{p.nbEnthousiastes}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="whitespace-nowrap text-encre-douce">12 mois</dt>
            <dd className="whitespace-nowrap font-semibold">{p.noteMoyenne12Mois === null ? "–" : `${formatNote.format(p.noteMoyenne12Mois)} ★`}</dd>
          </div>
        </dl>
      </div>

      {p.phrase && <p className="mt-3 text-sm leading-snug">{p.phrase}</p>}
    </section>
  );
}
