import { notFound, redirect } from "next/navigation";
import { Ecran } from "@/components/Ecran";
import { FormulaireApprentissage, FormulaireSignature, FormulaireSujets, FormulaireTon } from "@/components/reglages/SectionsVoix";
import { lireChoixEtablissement } from "@/lib/etablissements/service";
import { apercuVoix } from "@/lib/voix/apercu";
import { lireVoix, listerCorrections, sujetsSansRegle } from "@/lib/voix/service";

export const dynamic = "force-dynamic";

const TITRES = {
  signature: "Signature",
  ton: "Ton",
  sujets: "Sujets",
  apprentissage: "Apprentissage",
  apercu: "Aperçu",
} as const;

type Section = keyof typeof TITRES;

/** Un écran par réglage : la gérante ne voit qu'une question à la fois. */
export default async function SectionReglagesPage({ params, searchParams }: PageProps<"/reglages/[section]">) {
  const { section } = await params;
  if (!(section in TITRES)) notFound();
  const cle = section as Section;
  const query = await searchParams;

  const { actif: etablissement } = await lireChoixEtablissement();
  // Vue d'ensemble : la voix se règle pour un établissement, on revient le choisir.
  if (!etablissement) redirect("/reglages");
  const voix = await lireVoix(etablissement.id);

  const message =
    typeof query.erreur === "string"
      ? query.erreur
      : query.regle === "ajoutee"
        ? "Sujet ajouté. Dites ce que vous voulez y répondre, puis enregistrez."
        : query.regle === "retiree"
          ? "Sujet retiré."
          : query.retire
            ? "Correction retirée."
            : null;

  return (
    <Ecran titre={TITRES[cle]} retour={{ href: "/reglages", libelle: "Réglages" }}>
      {message && (
        <p role="status" className="mb-3 rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          {message}
        </p>
      )}
      {cle === "signature" && <FormulaireSignature locationId={etablissement.id} etablissement={etablissement.nom} voix={voix} />}
      {cle === "ton" && <FormulaireTon locationId={etablissement.id} voix={voix} />}
      {cle === "sujets" && <FormulaireSujets locationId={etablissement.id} voix={voix} suggestions={await sujetsSansRegle(etablissement.id, voix.regles)} />}
      {cle === "apprentissage" && <FormulaireApprentissage locationId={etablissement.id} voix={voix} corrections={await listerCorrections(etablissement.id)} />}
      {cle === "apercu" && <Apercu locationId={etablissement.id} />}
    </Ecran>
  );
}

async function Apercu({ locationId }: { locationId: string }) {
  const apercu = await apercuVoix(locationId);
  if (!apercu) {
    return <p className="bloc text-[15px] text-encre-douce">Aucun avis à traiter pour écrire un aperçu.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="bloc">
        <p className="text-sm text-encre-douce">
          L&apos;avis de {apercu.auteur} ({apercu.note} étoile{apercu.note > 1 ? "s" : ""})
        </p>
        <p className="mt-1.5 text-[15px] leading-snug">« {apercu.extrait} »</p>
      </div>
      <div className="rounded-3xl bg-soleil-doux p-[1.125rem]">
        <p className="text-sm text-encre-douce">La réponse écrite avec vos réglages</p>
        <p className="mt-1.5 whitespace-pre-line text-[15px] leading-snug">{apercu.reponse}</p>
      </div>
      <p className="px-1 text-sm leading-snug text-encre-douce">Cet aperçu n&apos;est pas enregistré et ne remplace pas le brouillon de cet avis.</p>
    </div>
  );
}
