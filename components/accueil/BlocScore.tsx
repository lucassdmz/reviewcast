import Link from "next/link";
import { NombreAnime } from "@/components/NombreAnime";
import type { Palier } from "@/lib/accueil/palier";

const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signe(v: number): string {
  return `${v > 0 ? "+" : "−"}${formatNote.format(Math.abs(v))}`;
}

/** La note des trois derniers mois et son prochain palier. Mène à Tendances. */
export function BlocScore({ note, evolution, palier }: { note: number | null; evolution: number | null; palier: Palier | null }) {
  return (
    <Link href="/tendances" prefetch className="pressable flex items-center gap-4 rounded-3xl bg-surface px-[1.125rem] py-4">
      <span className="text-[44px] font-light leading-none tracking-[-0.04em]">{note === null ? "–" : <NombreAnime valeur={note} />}</span>
      <span className="min-w-0 flex-1">
        <span className="intitule block">
          Note sur 3 mois
          {evolution !== null && evolution !== 0 && ` · ${signe(evolution)}`}
        </span>
        {palier && palier.avisCinqEtoiles > 0 && (
          <>
            <span className="mt-1 block text-sm leading-snug">
              Encore {palier.avisCinqEtoiles} avis à 5 étoiles pour passer à {formatNote.format(palier.cible)}
            </span>
            <span aria-hidden="true" className="mt-2 flex gap-1">
              {Array.from({ length: Math.min(palier.avisCinqEtoiles, 8) }, (_, i) => (
                <span key={i} className="h-1.5 w-8 rounded-full bg-nuage" />
              ))}
            </span>
          </>
        )}
        {palier && palier.avisCinqEtoiles === 0 && <span className="mt-1 block text-sm leading-snug">Palier {formatNote.format(palier.cible)} atteint.</span>}
      </span>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
