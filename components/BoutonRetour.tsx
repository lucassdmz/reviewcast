"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Retour à l'écran précédent, comme dans une application native : un chevron
 * rond en haut à gauche. S'il y a un historique, on y revient (la liste
 * retrouve sa position de défilement) ; sinon, par exemple à l'ouverture
 * depuis une notification, on va à `href`. Le geste de balayage du téléphone
 * continue de fonctionner à côté.
 */
export function BoutonRetour({ href, libelle }: { href: string; libelle: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-label={`Retour : ${libelle}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || window.history.length <= 1) return;
        e.preventDefault();
        router.back();
      }}
      className="pressable no-print -ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6" />
      </svg>
    </Link>
  );
}
