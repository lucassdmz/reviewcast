import Link from "next/link";
import { CarteAvis } from "@/components/file/CarteAvis";
import { Ecran } from "@/components/Ecran";
import { partagerFile } from "@/lib/file/recence";
import { contexteDeLaFile, listerFile } from "@/lib/file/service";

export const dynamic = "force-dynamic";

export default async function ATraiterPage({ searchParams }: PageProps<"/a-traiter">) {
  const params = await searchParams;
  const [tous, contexte] = await Promise.all([listerFile(), contexteDeLaFile()]);
  const { recents: file, rattrapage } = partagerFile(tous, new Date());
  const message = params.publie
    ? "Réponse publiée. L'avis a quitté la file."
    : params.traite
      ? "Avis marqué comme traité."
      : null;

  return (
    <Ecran titre={file.length === 0 ? "Rien à traiter" : file.length === 1 ? "1 avis à traiter" : `${file.length} avis à traiter`}>
      {contexte && <p className="-mt-3 mb-4 px-1 text-[15px] text-encre-douce">{contexte}</p>}
      {message && (
        <p role="status" className="mb-3 rounded-2xl bg-soleil-doux px-4 py-2 text-sm">
          {message}
        </p>
      )}
      {file.length === 0 ? (
        <p className="bloc text-sm text-encre-douce">
          {rattrapage.length === 0
            ? "Tout est à jour. Les avis qui méritent une réponse apparaîtront ici."
            : "Rien de récent à traiter. Vous êtes à jour sur les dernières semaines."}
        </p>
      ) : (
        <ul className="space-y-3">
          {file.map((avis) => (
            <CarteAvis key={avis.id} avis={avis} />
          ))}
        </ul>
      )}
      {rattrapage.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer list-none rounded-3xl bg-surface px-[1.125rem] py-4 [&::-webkit-details-marker]:hidden">
            <span className="block font-bold">Rattrapage</span>
            <span className="block text-sm text-encre-douce">
              Des avis plus anciens sont restés sans réponse. Rien ne presse : vous pouvez y revenir quand vous avez un moment.
            </span>
          </summary>
          <ul className="mt-3 space-y-3">
            {rattrapage.map((avis) => (
              <CarteAvis key={avis.id} avis={avis} />
            ))}
          </ul>
        </details>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/a-traiter/historique" className="underline underline-offset-4 hover:opacity-60">
          Voir les réponses publiées
        </Link>
      </p>
    </Ecran>
  );
}
