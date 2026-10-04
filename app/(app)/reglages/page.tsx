import { Ecran } from "@/components/Ecran";
import { consommationDuMois } from "@/lib/ai/ledger";
import { MODELES_PAR_DEFAUT } from "@/lib/ai/pricing";
import { FormulaireVoix } from "@/components/reglages/FormulaireVoix";
import { auth, signOut } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apercuVoix } from "@/lib/voix/apercu";
import { lireVoix, listerCorrections, sujetsSansRegle } from "@/lib/voix/service";

const formatNombre = new Intl.NumberFormat("fr-FR");
const formatDollars = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const dynamic = "force-dynamic";

export default async function ReglagesPage({ searchParams }: PageProps<"/reglages">) {
  const params = await searchParams;
  const [session, conso, etablissement] = await Promise.all([
    auth(),
    consommationDuMois(),
    prisma.location.findFirst({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  const [voix, corrections] = etablissement
    ? await Promise.all([lireVoix(etablissement.id), listerCorrections(etablissement.id)])
    : [null, []];
  const suggestions = etablissement && voix ? await sujetsSansRegle(etablissement.id, voix.regles) : [];
  // L'aperçu appelle l'IA : il n'est généré qu'après un enregistrement, pas à chaque visite.
  const apercu = etablissement && params.apercu ? await apercuVoix(etablissement.id) : null;
  const message = params.enregistre
    ? "Réglages enregistrés. Ils s'appliquent aux prochains brouillons."
    : params.regle === "ajoutee"
      ? "Sujet ajouté. Dites ce que vous voulez y répondre, puis enregistrez."
      : params.regle === "retiree"
        ? "Sujet retiré."
        : params.retire
      ? "Correction retirée."
      : typeof params.erreur === "string"
        ? params.erreur
        : null;
  return (
    <Ecran titre="Réglages">
      {message && (
        <p role="status" className="mb-3 rounded-2xl bg-soleil-doux px-4 py-2 text-sm">
          {message}
        </p>
      )}
      {etablissement && voix && (
        <div className="mb-4">
          <FormulaireVoix
            locationId={etablissement.id}
            etablissement={etablissement.nom}
            voix={voix}
            corrections={corrections}
            suggestions={suggestions}
            apercu={apercu}
            simule={process.env.AI_PROVIDER === "fake"}
          />
        </div>
      )}
      <section className="bloc">
        <h2 className="text-sm font-semibold text-encre-douce">Compte</h2>
        <p className="mt-1">{session?.user?.email}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/connexion" });
          }}
          className="mt-4"
        >
          <button
            type="submit"
            className="rounded-full bg-nuage font-medium px-4 py-2 text-sm font-medium hover:opacity-60"
          >
            Se déconnecter
          </button>
        </form>
      </section>

      <section className="mt-4 bloc">
        <h2 className="text-sm font-semibold text-encre-douce">Intelligence artificielle</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-encre-douce">Fournisseur</dt>
          <dd>Anthropic</dd>
          <dt className="text-encre-douce">Analyse des avis</dt>
          <dd>{MODELES_PAR_DEFAUT.analyse}</dd>
          <dt className="text-encre-douce">Rédaction</dt>
          <dd>{MODELES_PAR_DEFAUT.redaction}</dd>
          <dt className="text-encre-douce">Appels ce mois-ci</dt>
          <dd>{formatNombre.format(conso.appels)}</dd>
          <dt className="text-encre-douce">Tokens ce mois-ci</dt>
          <dd>{formatNombre.format(conso.tokens)}</dd>
          <dt className="text-encre-douce">Coût estimé</dt>
          <dd>{formatDollars.format(conso.coutEstime)}</dd>
        </dl>
        <p className="mt-4 text-xs text-encre-douce">
          Vos avis et vos brouillons ne sont envoyés qu&apos;au fournisseur IA choisi, jamais ailleurs. Le texte
          des avis est traité comme une donnée, jamais comme une instruction.
        </p>
      </section>
    </Ecran>
  );
}
