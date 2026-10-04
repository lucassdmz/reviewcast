import Link from "next/link";
import type { EtablissementResume } from "@/lib/meteo/stats";

/** Pastilles : tous les établissements par défaut, un établissement en un tap. */
export function SelecteurEtablissement({ etablissements, actif }: { etablissements: EtablissementResume[]; actif: EtablissementResume | null }) {
  if (etablissements.length < 2) return null;
  const options = [{ id: null as string | null, nom: "Tous" }, ...etablissements];
  return (
    <nav aria-label="Établissement" className="-mx-4 mb-3 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {options.map((o) => {
          const estActif = (actif?.id ?? null) === o.id;
          return (
            <li key={o.id ?? "tous"}>
              <Link
                href={o.id ? `/?etablissement=${o.id}` : "/"}
                aria-current={estActif ? "true" : undefined}
                className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                  estActif ? "border border-encre bg-encre font-semibold text-fond" : "bg-surface text-encre-douce"
                }`}
              >
                {o.nom}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
