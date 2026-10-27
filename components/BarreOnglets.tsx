"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChoixEtablissement } from "@/components/etablissements/ChoixEtablissement";
import type { Etablissement } from "@/lib/etablissements/actif";

const onglets: { href: string; libelle: string; icone: ReactNode }[] = [
  {
    href: "/",
    libelle: "Accueil",
    icone: <path d="M4 11.2 12 4l8 7.2V19a1.5 1.5 0 0 1-1.5 1.5H14v-5.5h-4v5.5H5.5A1.5 1.5 0 0 1 4 19v-7.8Z" />,
  },
  {
    href: "/a-traiter",
    libelle: "À traiter",
    icone: <path d="M4 13.5 6.6 5.6A1.5 1.5 0 0 1 8 4.5h8a1.5 1.5 0 0 1 1.4 1.1l2.6 7.9V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-4.5Zm0 0h4.5l1.5 2.5h4l1.5-2.5H20" />,
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

/**
 * Barre d'onglets flottante : quatre destinations, l'onglet actif dans une
 * pastille vert matcha, puis le rond de l'établissement affiché, tout à droite.
 */
export function BarreOnglets({ etablissements, actif }: { etablissements: Etablissement[]; actif: Etablissement | null }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex max-w-md items-center gap-0.5 verre rounded-full p-1.5">
        {onglets.map((onglet) => {
          const actif = onglet.href === "/" ? pathname === "/" : pathname.startsWith(onglet.href);
          return (
            <li key={onglet.href} className="flex-1">
              <Link
                href={onglet.href}
                prefetch
                aria-current={actif ? "page" : undefined}
                className={`pressable flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium ${
                  actif ? "bouton-principal" : "border-2 border-transparent text-encre-douce"
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
        {etablissements.length > 0 && (
          <li className="flex-1">
            <ChoixEtablissement etablissements={etablissements} actif={actif} />
          </li>
        )}
      </ul>
    </nav>
  );
}
