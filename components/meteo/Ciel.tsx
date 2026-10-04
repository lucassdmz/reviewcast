import type { Meteo } from "@/lib/db/generated/enums";

function Nuage({ x, y, echelle = 1 }: { x: number; y: number; echelle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${echelle})`} fill="var(--nuage-forme)">
      <circle cx="34" cy="44" r="26" />
      <circle cx="72" cy="32" r="34" />
      <circle cx="112" cy="46" r="24" />
      <rect x="10" y="40" width="126" height="30" rx="15" />
    </g>
  );
}

/**
 * Le ciel du mois, en aplats : un grand disque solaire, plus ou moins couvert.
 * Décoratif, le libellé de la météo porte le sens.
 */
export function Ciel({ meteo, className }: { meteo: Meteo; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
      {meteo === "GRAND_SOLEIL" && <circle cx="100" cy="100" r="92" fill="var(--soleil)" />}
      {meteo === "SOLEIL_VOILE" && (
        <>
          <circle cx="112" cy="88" r="80" fill="var(--soleil)" />
          <Nuage x={4} y={112} echelle={1.05} />
        </>
      )}
      {meteo === "NUAGEUX" && (
        <>
          <circle cx="128" cy="76" r="60" fill="var(--soleil)" opacity="0.55" />
          <Nuage x={40} y={52} echelle={0.8} />
          <Nuage x={2} y={104} echelle={1.2} />
        </>
      )}
      {meteo === "PLUIE_LEGERE" && (
        <>
          <Nuage x={10} y={40} echelle={1.25} />
          <g stroke="var(--pluie)" strokeWidth="5" strokeLinecap="round">
            <line x1="58" y1="146" x2="50" y2="168" />
            <line x1="96" y1="146" x2="88" y2="168" />
            <line x1="134" y1="146" x2="126" y2="168" />
          </g>
        </>
      )}
    </svg>
  );
}
