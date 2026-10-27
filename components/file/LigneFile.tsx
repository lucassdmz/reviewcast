import Link from "next/link";
import { Avatar } from "@/components/accueil/Avatar";
import { Etoiles, formatDate } from "@/components/file/Etoiles";
import type { AvisDeLaFile } from "@/lib/file/service";

/** Une ligne de la file : qui, combien d'étoiles, quand, et ce qui attend (brouillon prêt ou avis à lire). */
export function LigneFile({ avis, avecEtablissement }: { avis: AvisDeLaFile; avecEtablissement: boolean }) {
  const pret = avis.statut === "BROUILLON_PRET";
  return (
    <li className="border-t border-nuage first:border-t-0">
      <Link href={`/a-traiter/${avis.id}`} prefetch={false} className="pressable flex items-center gap-3 px-[1.125rem] py-3.5">
        <Avatar auteur={avis.auteur} note={avis.note} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] font-bold">{avis.auteur}</span>
            <Etoiles note={avis.note} />
          </span>
          <span className="block truncate text-[13px] text-encre-douce">
            {formatDate.format(avis.dateCreation)}
            {avecEtablissement ? ` · ${avis.etablissement}` : ""}
          </span>
          <span className="mt-0.5 block truncate text-[14px]">{avis.resume ?? avis.extrait}</span>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${pret ? "bg-matcha-doux text-matcha" : "bg-nuage text-encre-douce"}`}>
            {pret ? "Brouillon prêt à relire" : "À lire"}
          </span>
        </span>
      </Link>
    </li>
  );
}
