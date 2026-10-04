import type { PointMensuel } from "@/lib/analytics/agregation";

const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const formatMoisLong = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const L = 320;
const H = 110;
const MX = 22;
const MH = 10;
const MB = 22;

/** Note moyenne mensuelle sur la période. Une seule série, trous pour les mois sans avis. */
export function CourbeMensuelle({ points }: { points: PointMensuel[] }) {
  if (points.length < 2 || points.every((p) => p.noteMoyenne === null)) return null;
  const pas = (L - 2 * MX) / (points.length - 1);
  const y = (n: number) => MH + ((5 - n) / 4) * (H - MH - MB);
  const coords = points.map((p, i) => ({ ...p, x: MX + i * pas, y: p.noteMoyenne === null ? null : y(p.noteMoyenne) }));

  const segments: string[] = [];
  let courant: string[] = [];
  for (const c of coords) {
    if (c.y === null) {
      if (courant.length > 1) segments.push(courant.join(" "));
      courant = [];
    } else courant.push(`${courant.length ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`);
  }
  if (courant.length > 1) segments.push(courant.join(" "));
  const dernier = [...coords].reverse().find((c) => c.y !== null);
  const pasEtiquette = Math.ceil(points.length / 6);

  return (
    <section aria-labelledby="courbe-mensuelle-titre" className="bloc">
      <h2 id="courbe-mensuelle-titre" className="font-bold">
        Note moyenne par mois
      </h2>
      <svg viewBox={`0 0 ${L} ${H}`} className="mt-2 h-28 w-full" role="img" aria-describedby="courbe-mensuelle-tableau">
        {[3, 4, 5].map((n) => (
          <g key={n}>
            <line x1={MX} x2={L - MX} y1={y(n)} y2={y(n)} stroke="var(--nuage)" strokeWidth="1" strokeDasharray={n === 4 ? "3 3" : undefined} />
            <text x={MX - 8} y={y(n) + 3} fontSize="9" textAnchor="end" fill="var(--encre-douce)">
              {n}
            </text>
          </g>
        ))}
        {segments.map((d) => {
          const xs = [...d.matchAll(/[ML]([\d.]+),/g)].map((m) => m[1]);
          return <path key={`aire-${d}`} d={`${d} L${xs[xs.length - 1]},${H - MB} L${xs[0]},${H - MB} Z`} fill="var(--soleil-doux)" opacity="0.75" />;
        })}
        {segments.map((d) => (
          <path key={d} d={d} pathLength={1} className="trace" fill="none" stroke="var(--encre)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {coords.map((c, i) => (
          <g key={c.mois.toISOString()}>
            {c.y !== null && (
              <circle className="point" cx={c.x} cy={c.y} r={c === dernier ? 5.5 : 3.5} fill={c === dernier ? "var(--soleil)" : "var(--surface)"} stroke="var(--encre)" strokeWidth="2">
                <title>{`${formatMoisLong.format(c.mois)} : ${formatNote.format(c.noteMoyenne ?? 0)} ★ (${c.volume} avis)`}</title>
              </circle>
            )}
            {i % pasEtiquette === 0 && (
              <text x={c.x} y={H - 6} fontSize="9" textAnchor="middle" fill="var(--encre-douce)">
                {formatMois.format(c.mois)}
              </text>
            )}
          </g>
        ))}
        {dernier && dernier.y !== null && (
          <text x={dernier.x} y={dernier.y < 26 ? dernier.y + 20 : dernier.y - 11} fontSize="13" fontWeight="700" textAnchor={dernier.x > L - 40 ? "end" : "middle"} fill="var(--encre)">
            {formatNote.format(dernier.noteMoyenne ?? 0)}
          </text>
        )}
      </svg>
      <table id="courbe-mensuelle-tableau" className="sr-only">
        <caption>Note moyenne par mois</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.mois.toISOString()}>
              <th scope="row">{formatMoisLong.format(p.mois)}</th>
              <td>{p.noteMoyenne === null ? "aucun avis" : `${formatNote.format(p.noteMoyenne)} sur 5, ${p.volume} avis`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
