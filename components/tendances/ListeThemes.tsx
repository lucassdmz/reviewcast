import Link from "next/link";
import type { ThemeClasse } from "@/lib/analytics/agregation";

function evolution(e: number | null): string {
  if (e === null) return "nouveau";
  if (e === 0) return "stable";
  return e > 0 ? `+${e}` : `−${Math.abs(e)}`;
}

/**
 * Une des deux listes : « Ce qui plaît » ou « Ce qui revient comme problème ».
 * Chaque thème porte une barre proportionnelle au nombre d'avis : verte pour ce
 * qui plaît, grise pour les points à travailler (jamais de rouge).
 */
export function ListeThemes({ titre, themes, requete, teinte }: { titre: string; themes: ThemeClasse[]; requete: string; teinte: "ciel" | "nuage" }) {
  const max = Math.max(...themes.map((t) => t.nombre), 1);
  const positif = teinte === "ciel";
  return (
    <section aria-labelledby={`liste-${teinte}`} className="bloc">
      <h2 id={`liste-${teinte}`} className="flex items-center gap-2 font-bold">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${positif ? "bg-matcha" : "bg-ciel-fonce"}`} />
        {titre}
      </h2>
      {themes.length === 0 ? (
        <p className="mt-2 text-sm text-encre-douce">Rien de marquant sur la période.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {themes.map((t) => (
            <li key={t.themeId}>
              <div className="flex items-baseline justify-between gap-2 text-[15px]">
                <Link href={`/tendances/theme/${t.themeId}?${requete}`} prefetch={false} className="pressable min-w-0 flex-1 truncate first-letter:uppercase">
                  {t.libelle}
                </Link>
                <span className="whitespace-nowrap text-sm font-bold tabular-nums">{t.nombre === 1 ? "1 avis" : `${t.nombre} avis`}</span>
                <span className="w-16 whitespace-nowrap text-right text-xs text-encre-douce">
                  {t.evolution === null ? <span className="rounded-full bg-fond px-2 py-0.5">nouveau</span> : evolution(t.evolution)}
                </span>
              </div>
              <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${positif ? "bg-matcha-doux" : "bg-fond"}`} role="presentation">
                <div className={`barre h-full rounded-full ${positif ? "bg-matcha" : "bg-ciel-fonce"}`} style={{ width: `${Math.max(6, (t.nombre / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
