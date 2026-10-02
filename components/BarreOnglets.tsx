"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const onglets = [
  { href: "/", libelle: "Météo", icone: "☀️" },
  { href: "/a-traiter", libelle: "À traiter", icone: "📝" },
  { href: "/tendances", libelle: "Tendances", icone: "📈" },
  { href: "/reglages", libelle: "Réglages", icone: "⚙️" },
] as const;

export function BarreOnglets() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 border-t border-nuage bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg justify-around">
        {onglets.map((onglet) => {
          const actif = onglet.href === "/" ? pathname === "/" : pathname.startsWith(onglet.href);
          return (
            <li key={onglet.href} className="flex-1">
              <Link
                href={onglet.href}
                aria-current={actif ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                  actif ? "text-accent font-semibold" : "text-encre-douce"
                }`}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {onglet.icone}
                </span>
                {onglet.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
