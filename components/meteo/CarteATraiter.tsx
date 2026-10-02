import Link from "next/link";

/** Carte discrète vers la file « À traiter », absente s'il n'y a rien à faire. */
export function CarteATraiter({ nombre }: { nombre: number }) {
  if (nombre === 0) return null;
  const libelle = nombre === 1 ? "1 avis à traiter" : `${nombre} avis à traiter`;
  return (
    <Link
      href="/a-traiter"
      className="flex items-center justify-between rounded-2xl border border-nuage bg-surface px-4 py-2 text-sm hover:bg-nuage"
    >
      <span>
        <span className="font-semibold">{libelle}</span>
        <span className="ml-2 text-encre-douce">Brouillons prêts.</span>
      </span>
      <span aria-hidden="true" className="text-encre-douce">
        ›
      </span>
    </Link>
  );
}
