import { ChoixEtablissement } from "@/components/etablissements/ChoixEtablissement";
import { LogoEtablissement, RondEnsemble } from "@/components/etablissements/LogoEtablissement";
import { presenterEtablissement, type Etablissement } from "@/lib/etablissements/actif";

/**
 * Le tout haut de l'accueil : le logo, le nom et l'adresse de l'établissement
 * affiché. Avec plusieurs établissements, un tap ouvre la liste pour changer.
 */
export function EnteteEtablissement({ etablissements, actif }: { etablissements: Etablissement[]; actif: Etablissement | null }) {
  if (etablissements.length === 0) return null;
  const { titre, detail } = presenterEtablissement(actif, etablissements.length);
  const contenu = (
    <>
      {actif ? <LogoEtablissement etablissement={actif} className="h-12 w-12 border-2 border-trait [--taille:3rem]" /> : <RondEnsemble className="h-12 w-12" />}
      <span className="min-w-0 flex-1">
        <span className="titre-display block truncate text-[19px] font-bold leading-tight">{titre}</span>
        {detail && <span className="mt-0.5 block truncate text-sm text-encre-douce">{detail}</span>}
      </span>
    </>
  );

  if (etablissements.length === 1) return <div className="flex items-center gap-3">{contenu}</div>;
  return (
    <ChoixEtablissement etablissements={etablissements} actif={actif}>
      {contenu}
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m7 10 5 5 5-5" />
      </svg>
    </ChoixEtablissement>
  );
}
