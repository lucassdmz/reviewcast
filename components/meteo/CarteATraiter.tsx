import Link from "next/link";

/** Accès à la file « À traiter », absent s'il n'y a rien à faire. Ton neutre : une tâche, pas une alarme. */
export function CarteATraiter({ nombre }: { nombre: number }) {
  if (nombre === 0) return null;
  return (
    <Link href="/a-traiter" className="flex items-center gap-3.5 rounded-3xl bg-surface p-3.5 pr-5 pressable">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-encre text-lg font-bold text-fond">{nombre}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-tight">avis à traiter</span>
        <span className="block text-sm text-encre-douce">Brouillons de réponse prêts</span>
      </span>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
