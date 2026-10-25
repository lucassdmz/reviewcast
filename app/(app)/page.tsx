import Link from "next/link";
import { CarteARelire, LigneARelire } from "@/components/accueil/ARelire";
import { BlocScore } from "@/components/accueil/BlocScore";
import { ListeConversations } from "@/components/accueil/Conversations";
import { listerFlux } from "@/lib/accueil/flux";
import { prochainPalier } from "@/lib/accueil/palier";
import { phraseAccueil, prenomDepuisSignature } from "@/lib/accueil/phrase";
import { prisma } from "@/lib/db/client";
import { lireChoixEtablissement } from "@/lib/etablissements/service";
import { choisirCompliment } from "@/lib/meteo/compliment";
import { JOURS_PERIODE } from "@/lib/meteo/periodes";
import { evolution, fenetreGlissante, fenetrePrecedente, statsPeriode } from "@/lib/meteo/agregation";
import { lireVoix } from "@/lib/voix/service";

export const dynamic = "force-dynamic";

const formatJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" });

/** Avis à relire montrés sur l'accueil : le premier déployé, les suivants sur une ligne. */
const A_RELIRE_VISIBLES = 3;
/** Dernières conversations sur l'accueil, le reste est derrière « Voir tout ». */
const CONVERSATIONS_VISIBLES = 5;

function Titre({ titre, lien, libelle }: { titre: string; lien?: string; libelle?: string }) {
  return (
    <div className="mt-7 flex items-baseline justify-between">
      <h2 className="text-[17px] font-bold">{titre}</h2>
      {lien && libelle && (
        <Link href={lien} prefetch={false} className="pressable text-[13px] font-bold text-encre-douce">
          {libelle} ›
        </Link>
      )}
    </div>
  );
}

/** L'accueil : la phrase, le score, ce qui attend une réponse, puis les dernières conversations. */
export default async function AccueilPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const maintenant = new Date();
  const { actif, etablissements } = await lireChoixEtablissement();
  const locationId = actif?.id ?? null;
  const periode = fenetreGlissante(maintenant, JOURS_PERIODE["3m"]);
  const avant = fenetrePrecedente(maintenant, JOURS_PERIODE["3m"]);
  const filtre = locationId ? { locationId } : {};

  const [avis, flux, voix, cinqEtoiles] = await Promise.all([
    prisma.review.findMany({
      where: { ...filtre, retireAt: null, dateCreation: { gte: avant.debut, lt: periode.fin } },
      select: { note: true, dateCreation: true },
    }),
    listerFlux(locationId, maintenant),
    lireVoix(locationId ?? etablissements[0]?.id ?? null),
    prisma.review.findMany({
      where: { ...filtre, retireAt: null, note: 5, dateCreation: { gte: periode.debut } },
      select: { auteur: true, note: true, texte: true, dateCreation: true, analysis: { select: { passagesCles: true } } },
    }),
  ]);
  const trimestre = statsPeriode(avis, periode);
  const precedent = statsPeriode(avis, avant);
  const palier = prochainPalier(avis.filter((a) => a.dateCreation >= periode.debut).map((a) => a.note));
  const aRelire = flux.filter((p) => p.aRelire);
  const conversations = flux.filter((p) => !p.aRelire).slice(0, CONVERSATIONS_VISIBLES);
  const phrase = phraseAccueil({
    prenom: prenomDepuisSignature(voix.signature),
    volume: trimestre.volume,
    nbContents: trimestre.nbEnthousiastes,
    aRelire: aRelire.length,
    heure: Number(formatHeure.format(maintenant)),
  });
  // Le compliment tourne chaque jour, pas à chaque ouverture : le même toute la journée.
  const jourDeLAnnee = Math.floor((maintenant.getTime() - Date.UTC(maintenant.getUTCFullYear(), 0, 1)) / 86_400_000);
  const compliment = choisirCompliment(
    cinqEtoiles.map((a) => ({ auteur: a.auteur, note: a.note, texte: a.texte, dateCreation: a.dateCreation, passagesCles: a.analysis?.passagesCles ?? [] })),
    (jourDeLAnnee % 10) / 10,
  );
  const message = params.publie
    ? "Réponse publiée."
    : params.remercie
      ? "Remerciement publié. Merci pour eux !"
      : typeof params.erreur === "string"
        ? params.erreur
        : null;
  const jour = formatJour.format(maintenant);

  return (
    <main className="entree mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-8">
      <p className="intitule">
        {jour.charAt(0).toLocaleUpperCase("fr") + jour.slice(1)}
        {actif && ` · ${actif.nom}`}
      </p>
      <h1 className="mt-5 text-[25px] font-bold leading-tight tracking-tight">
        {phrase.ouverture} <span className="text-matcha">{phrase.contents}</span>
        {phrase.suite}
      </h1>
      {message && (
        <p role="status" className="mt-4 rounded-2xl bg-soleil-doux px-4 py-2 text-sm">
          {message}
        </p>
      )}
      <div className="mt-5">
        <BlocScore note={trimestre.noteMoyenne} evolution={evolution(trimestre.noteMoyenne, precedent.noteMoyenne)} palier={palier} />
      </div>

      {aRelire.length > 0 ? (
        <>
          <Titre titre="À relire" lien="/avis" libelle={`${aRelire.length} ${aRelire.length > 1 ? "avis" : "avis"}`} />
          <ul className="mt-2.5 space-y-2">
            {aRelire.slice(0, A_RELIRE_VISIBLES).map((post, i) => (i === 0 ? <CarteARelire key={post.id} post={post} /> : <LigneARelire key={post.id} post={post} />))}
          </ul>
          {aRelire.length > A_RELIRE_VISIBLES && (
            <Link href="/avis" prefetch={false} className="pressable mt-2 block px-4 text-[13px] font-bold text-encre-douce">
              Et {aRelire.length - A_RELIRE_VISIBLES} autre{aRelire.length - A_RELIRE_VISIBLES > 1 ? "s" : ""}, moins urgent{aRelire.length - A_RELIRE_VISIBLES > 1 ? "s" : ""} ›
            </Link>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 flex items-start gap-3.5 rounded-3xl bg-soleil-doux p-[1.125rem]">
            <span aria-hidden="true" className="mt-0.5 block h-9 w-9 shrink-0 rounded-full bg-soleil" />
            <p className="text-[15px] leading-snug">
              <span className="intitule block text-[#8a6d1f]">Tout est à jour</span>
              Rien n’attend votre réponse. Les prochains avis arriveront ici.
            </p>
          </div>
          {compliment && (
            <section aria-labelledby="compliment-titre" className="mt-3 rounded-3xl bg-surface p-[1.125rem]">
              <h2 id="compliment-titre" className="intitule">
                Le compliment du moment
              </h2>
              <p className="mt-2 text-[21px] font-bold leading-tight tracking-tight">« {compliment.texte} »</p>
              <p className="mt-1.5 text-sm text-encre-douce">{compliment.auteur}, 5 étoiles</p>
            </section>
          )}
        </>
      )}

      <Titre titre="Derniers avis" lien="/avis" libelle="Voir tout" />
      {conversations.length === 0 ? (
        <p className="mt-3 text-[15px] leading-snug text-encre-douce">
          {actif ? `Les avis de ${actif.nom}` : "Vos avis"} apparaîtront ici dès que la fiche Google sera connectée.
        </p>
      ) : (
        <div className="mt-1">
          <ListeConversations posts={conversations} />
        </div>
      )}
    </main>
  );
}
