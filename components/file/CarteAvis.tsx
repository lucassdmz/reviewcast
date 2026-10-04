import Link from "next/link";
import type { AvisDeLaFile } from "@/lib/file/service";
import { Etoiles, formatDate } from "./Etoiles";
import { Gravite } from "./Gravite";

/** Un avis de la file, présenté comme une tâche en ton neutre. */
export function CarteAvis({ avis }: { avis: AvisDeLaFile }) {
  return (
    <li>
      <Link href={`/a-traiter/${avis.id}`} className="block bloc pressable">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">{avis.auteur}</p>
          <Etoiles note={avis.note} />
        </div>
        <p className="text-xs text-encre-douce">
          {formatDate.format(avis.dateCreation)} · {avis.etablissement}
        </p>
        <p className="mt-2 text-sm leading-snug">{avis.extrait}</p>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-nuage pt-3">
          {avis.gravite ? <Gravite gravite={avis.gravite} /> : <span />}
          <span className="flex items-center gap-1 text-sm font-bold">
            {avis.statut === "BROUILLON_PRET" ? "Voir le brouillon" : "Ouvrir l'avis"}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </li>
  );
}
