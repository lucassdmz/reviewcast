import Link from "next/link";
import type { CSSProperties } from "react";
import type { ThemeClasse } from "@/lib/analytics/agregation";

/** Au delà, une pastille par avis ne se lit plus : la ligne passe en barre pleine. */
const PASTILLES_MAX = 12;

/** L'écart avec la période précédente, seulement quand il dit quelque chose : rien pour un thème nouveau ou stable. */
function evolution(e: number | null): string | null {
  if (e === null || e === 0) return null;
  return e > 0 ? `+${e}` : `−${Math.abs(e)}`;
}

/**
 * Une des deux listes : « Ce qui plaît » ou « Ce qui revient comme problème ».
 * Les volumes sont petits (quelques avis par thème) : chaque avis est une
 * pastille, qu'on compte d'un coup d'œil, plutôt qu'une barre presque pleine
 * partout. Vert matcha pour ce qui plaît, rose pour les points à travailler
 * (jamais de rouge). Les pastilles apparaissent l'une après l'autre.
 */
export function ListeThemes({ titre, themes, requete, teinte }: { titre: string; themes: ThemeClasse[]; requete: string; teinte: "ciel" | "nuage" }) {
  const max = Math.max(...themes.map((t) => t.nombre), 1);
  const positif = teinte === "ciel";
  const couleur = positif ? "bg-matcha-vif" : "bg-rose";
  const enPastilles = max <= PASTILLES_MAX;
  return (
    <section aria-labelledby={`liste-${teinte}`} className="bloc">
      <h2 id={`liste-${teinte}`} className="titre-display flex items-center gap-2 text-lg font-bold">
        <span aria-hidden="true" className={`h-3 w-3 rounded-full border-2 border-trait ${couleur}`} />
        {titre}
      </h2>
      {themes.length === 0 ? (
        <p className="mt-2 text-sm text-encre-douce">Rien de marquant sur la période.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {themes.map((t, ligne) => {
            const ev = evolution(t.evolution);
            return (
              <li key={t.themeId}>
                <Link href={`/tendances/theme/${t.themeId}?${requete}&sens=${positif ? "plait" : "probleme"}`} prefetch={false} className="pressable group block">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold first-letter:uppercase group-hover:underline">{t.libelle}</span>
                    {ev && <span className="whitespace-nowrap text-xs font-medium text-encre-douce">{ev}</span>}
                    <span className="titre-display w-7 text-right text-lg font-extrabold tabular-nums leading-none">{t.nombre}</span>
                  </span>
                  <span className="sr-only">{t.nombre === 1 ? "1 avis" : `${t.nombre} avis`}</span>
                  {enPastilles ? (
                    <span className="mt-2 flex gap-1" aria-hidden="true">
                      {Array.from({ length: t.nombre }, (_, i) => (
                        <span
                          key={i}
                          className={`pastille h-3.5 min-w-2 rounded-full border-2 border-trait ${couleur}`}
                          style={{ "--delai": `${ligne * 70 + i * 45}ms`, flex: "0 1 1.75rem" } as CSSProperties}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="mt-2 block" aria-hidden="true">
                      <span
                        className={`jauge block h-3.5 rounded-full border-2 border-trait ${couleur}`}
                        style={{ width: `${Math.max(8, (t.nombre / max) * 100)}%`, "--delai": `${ligne * 70}ms` } as CSSProperties}
                      />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
