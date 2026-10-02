import Link from "next/link";
import { Ecran } from "@/components/Ecran";
import { Etoiles, formatDate } from "@/components/file/Etoiles";
import { historiquePublies } from "@/lib/file/service";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const reponses = await historiquePublies();
  return (
    <Ecran titre="Réponses publiées">
      <p className="mb-3 text-sm">
        <Link href="/a-traiter" className="text-accent underline-offset-2 hover:underline">
          ‹ Retour à la file
        </Link>
      </p>
      {reponses.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-sm text-encre-douce">Aucune réponse publiée pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {reponses.map((r) => (
            <li key={r.id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{r.auteur}</p>
                <Etoiles note={r.note} />
              </div>
              <p className="text-xs text-encre-douce">
                {formatDate.format(r.dateCreation)} · {r.etablissement}
              </p>
              <p className="mt-2 text-sm text-encre-douce">{r.extrait}</p>
              <p className="mt-2 rounded-xl bg-ciel p-3 text-sm leading-snug">{r.reponse}</p>
              {r.dateReponse && <p className="mt-1 text-xs text-encre-douce">Publiée le {formatDate.format(r.dateReponse)}</p>}
            </li>
          ))}
        </ul>
      )}
    </Ecran>
  );
}
