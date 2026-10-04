import type { Meteo } from "@/lib/db/generated/enums";

interface Bande {
  x: number;
  y: number;
  largeur: number;
}

const HAUTEUR_BANDE = 20;

/**
 * Nappe de brume à la japonaise (kasumi) : des bandes horizontales aux bouts
 * ronds, décalées en escalier, qui passent devant le soleil. Elles partent du
 * bord droit, coupé par la carte.
 */
function Brume({ bandes }: { bandes: Bande[] }) {
  return (
    <g fill="var(--nuage-forme)">
      {bandes.map((b) => (
        <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.largeur} height={HAUTEUR_BANDE} rx={HAUTEUR_BANDE / 2} />
      ))}
    </g>
  );
}

// La brume reste basse et légère : le soleil domine toujours, même les moins bons jours.
const VOILE: Bande[] = [{ x: 40, y: 150, largeur: 170 }];

const NUAGES: Bande[] = [
  { x: 96, y: 132, largeur: 120 },
  { x: 22, y: 150, largeur: 190 },
];

const COUVERT: Bande[] = [
  { x: 96, y: 124, largeur: 120 },
  { x: 22, y: 142, largeur: 190 },
  { x: 64, y: 160, largeur: 150 },
];

/**
 * Le ciel du moment, en aplats : un grand disque solaire que des nappes de
 * brume viennent plus ou moins couvrir. Décoratif, le libellé de la météo
 * porte le sens.
 */
export function Ciel({ meteo, className }: { meteo: Meteo; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
      {meteo === "GRAND_SOLEIL" && <circle cx="100" cy="100" r="92" fill="var(--soleil)" />}
      {meteo === "SOLEIL_VOILE" && (
        <>
          <circle cx="100" cy="100" r="92" fill="var(--soleil)" />
          <Brume bandes={VOILE} />
        </>
      )}
      {meteo === "NUAGEUX" && (
        <>
          <circle cx="100" cy="100" r="92" fill="var(--soleil)" />
          <Brume bandes={NUAGES} />
        </>
      )}
      {meteo === "PLUIE_LEGERE" && (
        <>
          <circle cx="100" cy="100" r="92" fill="var(--soleil)" opacity="0.8" />
          <Brume bandes={COUVERT} />
          <g stroke="var(--pluie)" strokeWidth="3" strokeLinecap="round" opacity="0.8">
            <line x1="84" y1="186" x2="80" y2="196" />
            <line x1="112" y1="186" x2="108" y2="196" />
          </g>
        </>
      )}
    </svg>
  );
}
