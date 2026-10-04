"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const onglets: { href: string; libelle: string; icone: ReactNode }[] = [
  {
    href: "/",
    libelle: "Météo",
    icone: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </>
    ),
  },
  {
    href: "/a-traiter",
    libelle: "À traiter",
    icone: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7Z" />,
  },
  {
    href: "/tendances",
    libelle: "Tendances",
    icone: <path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L19 8" />,
  },
  {
    href: "/reglages",
    libelle: "Réglages",
    icone: (
      <>
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
  },
];

/** Barre d'onglets flottante : quatre destinations, l'onglet actif dans une pastille d'encre. */
export function BarreOnglets() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex max-w-md gap-1 rounded-full bg-surface p-1.5 shadow-[0_8px_28px_-10px_rgb(0_0_0/0.28)] ring-1 ring-nuage">
        {onglets.map((onglet) => {
          const actif = onglet.href === "/" ? pathname === "/" : pathname.startsWith(onglet.href);
          return (
            <li key={onglet.href} className="flex-1">
              <Link
                href={onglet.href}
                prefetch
                aria-current={actif ? "page" : undefined}
                className={`pressable flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium ${
                  actif ? "bg-encre text-fond" : "text-encre-douce"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {onglet.icone}
                </svg>
                {onglet.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
