import Link from "next/link";
import { notFound } from "next/navigation";
import { Etoiles, formatDate } from "@/components/file/Etoiles";
import { FormulaireBrouillon } from "@/components/file/FormulaireBrouillon";
import { NotesInternes } from "@/components/file/NotesInternes";
import { LIBELLES_GRAVITE } from "@/lib/file/contexte";
import { ficheAvis } from "@/lib/file/service";
import { LIBELLES_STATUT } from "@/lib/file/statuts";
import { actionConfirmerPublication, actionIgnorer, actionRouvrir } from "../actions";

export const dynamic = "force-dynamic";

export default async function FicheAvisPage({ params, searchParams }: PageProps<"/a-traiter/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const fiche = await ficheAvis(id);
  if (!fiche) notFound();

  const erreur = typeof query.erreur === "string" ? query.erreur : null;
  const confirmer = query.confirmer === "1" && fiche.brouillon && fiche.statut !== "PUBLIE";
  const dansLaFile = fiche.statut === "A_TRAITER" || fiche.statut === "BROUILLON_PRET";

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 pb-24 pt-4">
      <p className="text-sm">
        <Link href="/a-traiter" className="text-accent underline-offset-2 hover:underline">
          ‹ À traiter
        </Link>
      </p>

      <header className="rounded-2xl bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold">{fiche.auteur}</h1>
          <Etoiles note={fiche.note} />
        </div>
        <p className="text-xs text-encre-douce">
          {formatDate.format(fiche.dateCreation)} · {fiche.etablissement} · {LIBELLES_STATUT[fiche.statut]}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-snug">{fiche.texte ?? "Avis sans texte."}</p>
        {fiche.analyse && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {fiche.analyse.themes.map((t) => (
              <span key={t.libelle} className="rounded-full bg-nuage px-2 py-0.5">
                {t.libelle}
              </span>
            ))}
            {fiche.analyse.gravite && <span className="rounded-full bg-nuage px-2 py-0.5">Gravité {LIBELLES_GRAVITE[fiche.analyse.gravite]}</span>}
            {fiche.analyse.horsSujet && <span className="rounded-full bg-soleil-doux px-2 py-0.5">Semble hors sujet : à signaler à Google</span>}
          </div>
        )}
      </header>

      <p className="rounded-2xl bg-ciel px-4 py-3 text-sm">{fiche.contexteTexte}</p>

      {erreur && (
        <p role="alert" className="rounded-xl bg-soleil-doux px-4 py-2 text-sm">
          {erreur}
        </p>
      )}

      {fiche.reponseGoogle && (
        <section className="rounded-2xl bg-surface p-4">
          <h2 className="text-sm font-semibold text-encre-douce">Réponse publiée</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-snug">{fiche.reponseGoogle.texte}</p>
          {fiche.reponseGoogle.date && <p className="mt-1 text-xs text-encre-douce">Le {formatDate.format(fiche.reponseGoogle.date)}</p>}
        </section>
      )}

      {confirmer && fiche.brouillon ? (
        <section aria-labelledby="confirmation-titre" className="rounded-2xl border-2 border-accent bg-surface p-4">
          <h2 id="confirmation-titre" className="font-semibold">
            Publier cette réponse sur Google ?
          </h2>
          <p className="mt-1 text-xs text-encre-douce">Elle sera visible publiquement sous l&apos;avis de {fiche.auteur}.</p>
          <p className="mt-3 whitespace-pre-line rounded-xl bg-fond p-3 text-sm leading-snug">{fiche.brouillon.texte}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={actionConfirmerPublication}>
              <input type="hidden" name="reviewId" value={fiche.id} />
              <input type="hidden" name="texte" value={fiche.brouillon.texte} />
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Confirmer la publication
              </button>
            </form>
            <Link href={`/a-traiter/${fiche.id}`} className="rounded-xl border border-nuage px-4 py-2 text-sm hover:bg-nuage">
              Revenir au brouillon
            </Link>
          </div>
        </section>
      ) : (
        dansLaFile && (
          <>
            <FormulaireBrouillon reviewId={fiche.id} texte={fiche.brouillon?.texte ?? ""} version={fiche.brouillon?.version ?? 0} />
            <form action={actionIgnorer} className="text-center">
              <input type="hidden" name="reviewId" value={fiche.id} />
              <button type="submit" className="text-sm text-encre-douce underline-offset-2 hover:underline">
                Marquer comme traité sans répondre
              </button>
            </form>
          </>
        )
      )}

      {fiche.statut === "IGNORE" && (
        <form action={actionRouvrir} className="text-center">
          <input type="hidden" name="reviewId" value={fiche.id} />
          <button type="submit" className="text-sm text-accent underline-offset-2 hover:underline">
            Remettre dans la file
          </button>
        </form>
      )}

      <NotesInternes reviewId={fiche.id} notes={fiche.notes} />
    </main>
  );
}
