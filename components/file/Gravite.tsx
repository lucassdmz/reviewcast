import type { Gravite as GraviteType } from "@/lib/db/generated/enums";
import { LIBELLES_GRAVITE } from "@/lib/file/contexte";

const NIVEAUX: Record<GraviteType, number> = { FAIBLE: 1, MOYENNE: 2, FORTE: 3 };

/**
 * Gravité estimée d'un avis : une information, pas un bouton. Trois points
 * dont un, deux ou trois sont pleins, suivis du libellé, en gris et sans fond
 * pour ne pas ressembler à une action. Jamais de rouge.
 */
export function Gravite({ gravite }: { gravite: GraviteType }) {
  const niveau = NIVEAUX[gravite];
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-encre-douce">
      <span aria-hidden="true" className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= niveau ? "bg-encre-douce" : "bg-ciel-fonce"}`} />
        ))}
      </span>
      Gravité {LIBELLES_GRAVITE[gravite]}
    </span>
  );
}
