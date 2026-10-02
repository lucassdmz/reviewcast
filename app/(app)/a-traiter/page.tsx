import Link from "next/link";
import { CarteAvis } from "@/components/file/CarteAvis";
import { Ecran } from "@/components/Ecran";
import { listerFile } from "@/lib/file/service";

export const dynamic = "force-dynamic";

export default async function ATraiterPage({ searchParams }: PageProps<"/a-traiter">) {
  const params = await searchParams;
  const file = await listerFile();
  const message = params.publie
    ? "Réponse publiée. L'avis a quitté la file."
    : params.traite
      ? "Avis marqué comme traité."
      : null;

  return (
    <Ecran titre={file.length === 0 ? "Rien à traiter" : file.length === 1 ? "1 avis à traiter" : `${file.length} avis à traiter`}>
      {message && (
        <p role="status" className="mb-3 rounded-xl bg-soleil-doux px-4 py-2 text-sm">
          {message}
        </p>
      )}
      {file.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-sm text-encre-douce">
          Tout est à jour. Les avis qui méritent une réponse apparaîtront ici.
        </p>
      ) : (
        <ul className="space-y-3">
          {file.map((avis) => (
            <CarteAvis key={avis.id} avis={avis} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/a-traiter/historique" className="text-accent underline-offset-2 hover:underline">
          Voir les réponses publiées
        </Link>
      </p>
    </Ecran>
  );
}
