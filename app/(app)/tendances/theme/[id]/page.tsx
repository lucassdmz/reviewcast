import Link from "next/link";
import { notFound } from "next/navigation";
import { Ecran } from "@/components/Ecran";
import { Etoiles, formatDate } from "@/components/file/Etoiles";
import { TexteSurligne } from "@/components/tendances/TexteSurligne";
import { lireParametres } from "@/lib/analytics/requete";
import { avisParTheme } from "@/lib/analytics/tendances";

export const dynamic = "force-dynamic";

export default async function ThemePage({ params, searchParams }: PageProps<"/tendances/theme/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const { periode, locationId, requete } = lireParametres(query);
  const resultat = await avisParTheme(id, locationId, periode);
  if (!resultat) notFound();

  return (
    <Ecran titre={`Thème : ${resultat.libelle}`}>
      <p className="mb-3 text-sm">
        <Link href={`/tendances?${requete}`} className="text-accent underline-offset-2 hover:underline">
          ‹ Tendances
        </Link>
        <span className="ml-2 text-encre-douce">{periode.libelle}</span>
      </p>
      {resultat.avis.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-sm text-encre-douce">Aucun avis sur ce thème pour la période.</p>
      ) : (
        <ul className="space-y-3">
          {resultat.avis.map((a) => (
            <li key={a.id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/a-traiter/${a.id}`} className="font-semibold underline-offset-2 hover:underline">
                  {a.auteur}
                </Link>
                <Etoiles note={a.note} />
              </div>
              <p className="text-xs text-encre-douce">
                {formatDate.format(a.dateCreation)} · {a.etablissement}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-snug">
                {a.texte ? <TexteSurligne texte={a.texte} passage={a.passage} /> : "Avis sans texte."}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Ecran>
  );
}
