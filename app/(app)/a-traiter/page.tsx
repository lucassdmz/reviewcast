import Link from "next/link";
import { Ecran } from "@/components/Ecran";
import { LigneFile } from "@/components/file/LigneFile";
import { lireChoixEtablissement } from "@/lib/etablissements/service";
import { partagerFile } from "@/lib/file/recence";
import { contexteDeLaFile, listerFile } from "@/lib/file/service";

export const dynamic = "force-dynamic";

/**
 * L'écran À traiter : tous les avis qui attendent une réponse, en un onglet.
 * L'accueil n'en propose qu'un, le plus prioritaire ; ici la liste est complète.
 * Les avis de plus de 40 jours sont rangés à part, sans compteur.
 */
export default async function ATraiterPage({ searchParams }: PageProps<"/a-traiter">) {
  const params = await searchParams;
  const { actif } = await lireChoixEtablissement();
  const locationId = actif?.id ?? null;
  const [tous, contexte] = await Promise.all([listerFile(locationId), contexteDeLaFile(locationId)]);
  const { recents: file, rattrapage } = partagerFile(tous, new Date());
  const message = params.publie ? "Réponse publiée sur Google. L'avis a quitté la file." : params.traite ? "Avis marqué comme traité." : null;
  const titre = file.length === 0 ? "Rien à traiter" : file.length === 1 ? "1 avis à traiter" : `${file.length} avis à traiter`;

  return (
    <Ecran titre={titre}>
      {contexte && <p className="-mt-3 mb-4 px-1 text-[15px] text-encre-douce">{contexte}</p>}
      {message && (
        <p role="status" className="mb-3 rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          {message}
        </p>
      )}

      {file.length === 0 ? (
        <p className="bloc text-[15px] text-encre-douce">
          {rattrapage.length === 0
            ? "Tout est à jour. Les avis qui méritent une réponse apparaîtront ici."
            : "Rien de récent à traiter. Vous êtes à jour sur les dernières semaines."}
        </p>
      ) : (
        <ul aria-label="Avis à traiter" className="overflow-hidden rounded-3xl bg-surface">
          {file.map((avis) => (
            <LigneFile key={avis.id} avis={avis} avecEtablissement={locationId === null} />
          ))}
        </ul>
      )}

      {rattrapage.length > 0 && (
        <details className="group mt-6">
          <summary className="pressable cursor-pointer list-none rounded-3xl bg-surface px-[1.125rem] py-4 [&::-webkit-details-marker]:hidden">
            <span className="block font-bold">Plus anciens, sans réponse</span>
            <span className="block text-sm text-encre-douce">Rien ne presse : vous pouvez y revenir quand vous avez un moment.</span>
          </summary>
          <ul aria-label="Avis plus anciens sans réponse" className="mt-3 overflow-hidden rounded-3xl bg-surface">
            {rattrapage.map((avis) => (
              <LigneFile key={avis.id} avis={avis} avecEtablissement={locationId === null} />
            ))}
          </ul>
        </details>
      )}

      <ul className="mt-6 divide-y divide-nuage overflow-hidden rounded-3xl bg-surface">
        <li>
          <Link href="/a-traiter/historique" className="pressable block px-[1.125rem] py-4 font-bold">
            Réponses publiées
          </Link>
        </li>
        <li>
          <Link href="/avis" className="pressable block px-[1.125rem] py-4 font-bold">
            Tous les avis
          </Link>
        </li>
      </ul>
    </Ecran>
  );
}
