import type { PointCourbe } from "@/lib/meteo/agregation";

const formatSemaine = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const LARGEUR = 320;
const HAUTEUR = 76;
const MARGE_X = 10;
const MARGE_Y = 12;

/**
 * Mini-courbe de la note moyenne sur 8 semaines. Une seule série : pas de
 * légende, ligne fine, dernier point en accent avec sa valeur. Les semaines
 * sans avis laissent un trou. Un tableau masqué porte les valeurs.
 */
export function MiniCourbe({ points }: { points: PointCourbe[] }) {
  const avecNote = points.filter((p) => p.noteMoyenne !== null);
  if (avecNote.length === 0) return null;

  const pas = (LARGEUR - 2 * MARGE_X) / Math.max(1, points.length - 1);
  const y = (note: number) => MARGE_Y + ((5 - note) / 4) * (HAUTEUR - 2 * MARGE_Y);
  const coords = points.map((p, i) => ({ ...p, x: MARGE_X + i * pas, y: p.noteMoyenne === null ? null : y(p.noteMoyenne) }));

  const segments: string[] = [];
  let courant: string[] = [];
  for (const c of coords) {
    if (c.y === null) {
      if (courant.length > 1) segments.push(courant.join(" "));
      courant = [];
    } else {
      courant.push(`${courant.length ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`);
    }
  }
  if (courant.length > 1) segments.push(courant.join(" "));

  const dernier = [...coords].reverse().find((c) => c.y !== null);

  return (
    <section aria-labelledby="courbe-titre" className="bloc">
      <h2 id="courbe-titre" className="intitule">
        Note moyenne sur 8 semaines
      </h2>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="mt-2 h-auto w-full" role="img" aria-describedby="courbe-tableau">
        <line x1={MARGE_X} x2={LARGEUR - MARGE_X} y1={y(4)} y2={y(4)} stroke="var(--nuage)" strokeWidth="1" strokeDasharray="3 3" />
        {segments.map((d) => (
          <path key={d} d={d} pathLength={1} className="trace" fill="none" stroke="var(--encre)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {coords.map((c) =>
          c.y === null ? null : (
            <circle className="point" key={c.semaine.toISOString()} cx={c.x} cy={c.y} r={c === dernier ? 6 : 3.5} fill={c === dernier ? "var(--soleil)" : "var(--surface)"} stroke="var(--encre)" strokeWidth="2">
              <title>{`Semaine du ${formatSemaine.format(c.semaine)} : ${formatNote.format(c.noteMoyenne ?? 0)} ★ (${c.volume} avis)`}</title>
            </circle>
          ),
        )}
        {dernier && dernier.y !== null && (
          <text x={Math.min(dernier.x, LARGEUR - 36)} y={dernier.y < 24 ? dernier.y + 18 : dernier.y - 10} fontSize="13" fontWeight="700" fill="var(--encre)">
            {formatNote.format(dernier.noteMoyenne ?? 0)}
          </text>
        )}
      </svg>
      <table id="courbe-tableau" className="sr-only">
        <caption>Note moyenne par semaine</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.semaine.toISOString()}>
              <th scope="row">Semaine du {formatSemaine.format(p.semaine)}</th>
              <td>{p.noteMoyenne === null ? "aucun avis" : `${formatNote.format(p.noteMoyenne)} sur 5, ${p.volume} avis`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
