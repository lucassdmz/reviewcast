import { initiales, type Etablissement } from "@/lib/etablissements/actif";

/** Rond d'un établissement : son logo, ou ses initiales tant qu'il n'en a pas. `className` donne la taille. */
export function LogoEtablissement({ etablissement, className = "" }: { etablissement: Pick<Etablissement, "nom" | "logo">; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white font-bold text-[#16181a] ring-1 ring-nuage ${className}`}
    >
      {etablissement.logo ? (
        // Logo servi depuis la base, déjà à la bonne taille : l'optimisation d'image n'apporterait rien.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={etablissement.logo} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <span className="text-[length:calc(var(--taille,2.75rem)*0.36)] leading-none tracking-tight">{initiales(etablissement.nom)}</span>
      )}
    </span>
  );
}
