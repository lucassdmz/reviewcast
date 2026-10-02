import Link from "next/link";
import type { AvisDeLaFile } from "@/lib/file/service";
import { LIBELLES_GRAVITE } from "@/lib/file/contexte";
import { Etoiles, formatDate } from "./Etoiles";

/** Un avis de la file, présenté comme une tâche en ton neutre. */
export function CarteAvis({ avis }: { avis: AvisDeLaFile }) {
  return (
    <li>
      <Link href={`/a-traiter/${avis.id}`} className="block rounded-2xl bg-surface p-4 hover:bg-nuage">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">{avis.auteur}</p>
          <Etoiles note={avis.note} />
        </div>
        <p className="text-xs text-encre-douce">
          {formatDate.format(avis.dateCreation)} · {avis.etablissement}
        </p>
        <p className="mt-2 text-sm leading-snug">{avis.extrait}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {avis.statut === "BROUILLON_PRET" && <span className="rounded-full bg-ciel px-2 py-0.5">Brouillon prêt</span>}
          {avis.gravite && <span className="rounded-full bg-nuage px-2 py-0.5">Gravité {LIBELLES_GRAVITE[avis.gravite]}</span>}
          <span className="text-encre-douce">{avis.contexte}</span>
        </div>
      </Link>
    </li>
  );
}
