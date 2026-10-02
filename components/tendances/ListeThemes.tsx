import Link from "next/link";
import type { ThemeClasse } from "@/lib/analytics/agregation";

function evolution(e: number | null): string {
  if (e === null) return "nouveau";
  if (e === 0) return "stable";
  return e > 0 ? `+${e}` : `−${Math.abs(e)}`;
}

/** Une des deux listes : « Ce qui plaît » ou « Ce qui revient comme problème ». */
export function ListeThemes({ titre, themes, requete, teinte }: { titre: string; themes: ThemeClasse[]; requete: string; teinte: "ciel" | "nuage" }) {
  return (
    <section aria-labelledby={`liste-${teinte}`} className={`rounded-2xl p-4 ${teinte === "ciel" ? "bg-ciel" : "bg-surface"}`}>
      <h2 id={`liste-${teinte}`} className="text-sm font-semibold">
        {titre}
      </h2>
      {themes.length === 0 ? (
        <p className="mt-2 text-sm text-encre-douce">Rien de marquant sur la période.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {themes.map((t) => (
            <li key={t.themeId} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/tendances/theme/${t.themeId}?${requete}`} className="min-w-0 flex-1 truncate underline-offset-2 hover:underline">
                {t.libelle}
              </Link>
              <span className="whitespace-nowrap font-semibold">{t.nombre === 1 ? "1 avis" : `${t.nombre} avis`}</span>
              <span className="w-14 whitespace-nowrap text-right text-xs text-encre-douce">{evolution(t.evolution)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
