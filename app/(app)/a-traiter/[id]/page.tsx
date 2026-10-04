import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonAction } from "@/components/BoutonAction";
import { BoutonRetour } from "@/components/BoutonRetour";
import { Etoiles, formatDate } from "@/components/file/Etoiles";
import { FormulaireBrouillon } from "@/components/file/FormulaireBrouillon";
import { Gravite } from "@/components/file/Gravite";
import { NotesInternes } from "@/components/file/NotesInternes";
import { ficheAvis } from "@/lib/file/service";
import { avecSignature } from "@/lib/voix/signature";
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
    <main className="entree mx-auto w-full max-w-lg flex-1 space-y-3 px-4 pb-28 pt-4">
      <BoutonRetour href="/a-traiter" libelle="À traiter" />

      <header className="bloc">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold">{fiche.auteur}</h1>
          <Etoiles note={fiche.note} />
        </div>
        <p className="text-xs text-encre-douce">
          {formatDate.format(fiche.dateCreation)} · {fiche.etablissement} · {LIBELLES_STATUT[fiche.statut]}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-snug">{fiche.texte ?? "Avis sans texte."}</p>
        {fiche.analyse && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {fiche.analyse.themes.map((t) => (
              <span key={t.libelle} className="rounded-full bg-fond px-2 py-0.5">
                {t.libelle}
              </span>
            ))}
            {fiche.analyse.gravite && <Gravite gravite={fiche.analyse.gravite} />}
            {fiche.analyse.horsSujet && <span className="rounded-full bg-soleil-doux px-2 py-0.5">Semble hors sujet : à signaler à Google</span>}
          </div>
        )}
      </header>

      <p className="bloc text-sm">{fiche.contexteTexte}</p>

      {erreur && (
        <p role="alert" className="rounded-2xl bg-soleil-doux px-4 py-2 text-sm">
          {erreur}
        </p>
      )}

      {fiche.reponseGoogle && (
        <section className="bloc">
          <h2 className="text-sm font-semibold text-encre-douce">Réponse publiée</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-snug">{fiche.reponseGoogle.texte}</p>
          {fiche.reponseGoogle.date && <p className="mt-1 text-xs text-encre-douce">Le {formatDate.format(fiche.reponseGoogle.date)}</p>}
        </section>
      )}

      {confirmer && fiche.brouillon ? (
        <section aria-labelledby="confirmation-titre" className="bloc-fort">
          <h2 id="confirmation-titre" className="font-semibold">
            Publier cette réponse sur Google ?
          </h2>
          <p className="mt-1 text-xs text-encre-douce">Elle sera visible publiquement sous l&apos;avis de {fiche.auteur}.</p>
          <p className="mt-3 whitespace-pre-line rounded-2xl bg-fond p-3 text-sm leading-snug">{avecSignature(fiche.brouillon.texte, fiche.signature)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={actionConfirmerPublication}>
              <input type="hidden" name="reviewId" value={fiche.id} />
              <input type="hidden" name="texte" value={fiche.brouillon.texte} />
              <BoutonAction enCours="Publication…" className="pressable rounded-full bg-encre px-4 py-2 text-sm font-semibold text-fond">
                Confirmer la publication
              </BoutonAction>
            </form>
            <Link href={`/a-traiter/${fiche.id}`} className="rounded-full bg-nuage font-medium px-4 py-2 text-sm hover:opacity-60">
              Revenir au brouillon
            </Link>
          </div>
        </section>
      ) : (
        dansLaFile && (
          <>
            <FormulaireBrouillon reviewId={fiche.id} texte={fiche.brouillon?.texte ?? ""} version={fiche.brouillon?.version ?? 0} signature={fiche.signature} motsEvites={fiche.motsEvitesPresents} />
            <form action={actionIgnorer} className="text-center">
              <input type="hidden" name="reviewId" value={fiche.id} />
              <BoutonAction className="text-sm text-encre-douce underline underline-offset-4">Marquer comme traité sans répondre</BoutonAction>
            </form>
          </>
        )
      )}

      {fiche.statut === "IGNORE" && (
        <form action={actionRouvrir} className="text-center">
          <input type="hidden" name="reviewId" value={fiche.id} />
          <BoutonAction className="text-sm underline underline-offset-4">Remettre dans la file</BoutonAction>
        </form>
      )}

      <NotesInternes reviewId={fiche.id} notes={fiche.notes} />
    </main>
  );
}
