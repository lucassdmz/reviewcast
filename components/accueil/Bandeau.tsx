import Link from "next/link";
import type { Entete } from "@/lib/accueil/service";

/**
 * Le haut de l'accueil : un bandeau vert matcha qui dit d'abord combien de
 * clients sont contents, en très grand, et la note Google dans une pastille
 * jaune posée dans le coin. La pastille mène à Tendances.
 */
export function Bandeau({ entete, salutation }: { entete: Entete; salutation: string }) {
  const { contents, volume, periode, note } = entete;
  return (
    <header className="sticker relative overflow-hidden rounded-[1.75rem] bg-matcha-vif px-5 pb-5 pt-5 text-sur-vif">
      <p className="text-base font-semibold">{salutation}</p>
      {volume > 0 ? (
        <h1 className="mt-2 flex items-end gap-3">
          <span className="saute titre-display text-[96px] font-extrabold leading-[0.84] tracking-[-0.06em]">{contents}</span>
          <span className="pb-1.5 leading-tight">
            <span className="titre-display block text-[22px] font-bold">
              {contents > 1 ? "clients contents" : "client content"}
            </span>
            <span className="mt-0.5 block text-[15px] font-medium">sur {volume} {periode}</span>
          </span>
        </h1>
      ) : (
        <h1 className="titre-display mt-3 max-w-[14rem] text-[26px] font-bold leading-tight">Pas encore d’avis {periode}</h1>
      )}
      {note && (
        <Link
          href="/tendances"
          prefetch
          aria-label={`Note Google ${note} sur 5, voir les tendances`}
          className="tampon pressable absolute right-3.5 top-3.5 flex items-center gap-1 rounded-full border-2 border-trait bg-soleil py-1.5 pl-3.5 pr-3 text-sur-vif shadow-[3px_3px_0_var(--trait)]"
        >
          <span className="titre-display text-2xl font-extrabold">{note}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill="currentColor" />
          </svg>
        </Link>
      )}
    </header>
  );
}
