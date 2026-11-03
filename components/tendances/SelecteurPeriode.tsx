"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useOptimistic, useTransition, type FormEvent, type ReactNode } from "react";
import { useAttenteReseau } from "@/components/pwa/reseau";
import type { PeriodeTendances } from "@/lib/analytics/periodes";
import { hrefDates, hrefPeriode } from "@/lib/analytics/requete";

const CHOIX: { selection: "30j" | "90j" | "12m"; libelle: string }[] = [
  { selection: "30j", libelle: "30 jours" },
  { selection: "90j", libelle: "3 mois" },
  { selection: "12m", libelle: "12 mois" },
];

const NavigationPeriode = createContext<{ naviguer: (href: string, selection: string) => void; enCours: boolean; cible: string | null }>({
  naviguer: () => undefined,
  enCours: false,
  cible: null,
});

/**
 * Enveloppe l'écran : changer de période y répond à l'instant. Le sélecteur
 * reste net et le reste de l'écran s'estompe jusqu'à l'arrivée des chiffres.
 */
export function ZonePeriode({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [cible, viser] = useOptimistic<string | null>(null);

  function naviguer(href: string, selection: string) {
    demarrer(() => {
      viser(selection);
      router.push(href);
    });
  }

  return (
    <NavigationPeriode value={{ naviguer, enCours, cible }}>
      <div data-periode-en-cours={enCours ? "true" : undefined} aria-busy={enCours} className={`zone-periode ${className ?? ""}`}>
        {children}
      </div>
    </NavigationPeriode>
  );
}

/** Sélecteur de période : trois raccourcis et une plage personnalisée. */
export function SelecteurPeriode({ periode }: { periode: PeriodeTendances }) {
  const { naviguer, enCours, cible } = use(NavigationPeriode);
  const enAttente = useAttenteReseau(enCours);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const finIncluse = new Date(periode.fin.getTime() - 86_400_000);
  const selection = cible ?? periode.selection;

  function appliquer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const donnees = new FormData(event.currentTarget);
    naviguer(hrefDates(String(donnees.get("debut") ?? ""), String(donnees.get("fin") ?? "")), "perso");
  }

  return (
    <nav aria-label="Période" className="no-print space-y-2">
      <ul className="flex gap-1 rounded-full bg-nuage p-1">
        {CHOIX.map((c) => {
          const actif = selection === c.selection;
          const href = hrefPeriode(c.selection);
          return (
            <li key={c.selection} className="flex-1">
              <Link
                href={href}
                onNavigate={(event) => {
                  event.preventDefault();
                  naviguer(href, c.selection);
                }}
                aria-current={actif ? "true" : undefined}
                className={`pressable block rounded-full px-3 py-1.5 text-center text-sm ${actif ? "bg-surface font-bold shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-encre-douce"}`}
              >
                {c.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
      {enCours && (
        <p role="status" className="px-1 text-sm text-encre-douce">
          {enAttente ? "En attente du réseau…" : "Mise à jour des chiffres…"}
        </p>
      )}
      <details open={periode.selection === "perso"} className="px-1 text-sm">
        <summary className="pressable cible cursor-pointer list-none text-encre-douce underline underline-offset-4 [&::-webkit-details-marker]:hidden">Choisir des dates</summary>
        <form method="get" action="/tendances" onSubmit={appliquer} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="periode" value="perso" />
          <label htmlFor="debut" className="text-encre-douce">
            Du
          </label>
          <input id="debut" type="date" name="debut" defaultValue={iso(periode.debut)} className="rounded-2xl border border-nuage bg-surface px-2 py-1" />
          <label htmlFor="fin" className="text-encre-douce">
            au
          </label>
          <input id="fin" type="date" name="fin" defaultValue={iso(finIncluse)} className="rounded-2xl border border-nuage bg-surface px-2 py-1" />
          <button type="submit" disabled={enCours} className="pressable rounded-full bg-encre px-3.5 py-1 font-medium text-fond disabled:opacity-60">
            {enCours && cible === "perso" ? "Mise à jour…" : "Appliquer"}
          </button>
        </form>
      </details>
    </nav>
  );
}
