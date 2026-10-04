import Link from "next/link";
import { Ecran } from "@/components/Ecran";
import { consommationDuMois } from "@/lib/ai/ledger";
import { MODELES_PAR_DEFAUT } from "@/lib/ai/pricing";
import { auth, signOut } from "@/lib/auth/config";
import { estModeDemo } from "@/lib/auth/demo";
import { prisma } from "@/lib/db/client";
import { LIBELLES_LONGUEUR, LIBELLES_PERSONNE, LIBELLES_REGISTRE, type Voix } from "@/lib/voix/reglages";
import { lireVoix, listerCorrections } from "@/lib/voix/service";

const formatNombre = new Intl.NumberFormat("fr-FR");
const formatDollars = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const dynamic = "force-dynamic";

function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${n} ${n > 1 ? motPluriel : mot}`;
}

/** Ce que chaque ligne du menu affiche sous son titre : la valeur actuelle, en clair. */
function resumes(voix: Voix, nbCorrections: number): Record<"signature" | "ton" | "sujets" | "apprentissage", string> {
  const ton = [LIBELLES_PERSONNE[voix.personne].titre, LIBELLES_REGISTRE[voix.registre].titre.toLowerCase(), `réponses ${LIBELLES_LONGUEUR[voix.longueur].titre.toLowerCase()}s`];
  const sujets = voix.regles.filter((r) => r.dire || r.nePasDire).length;
  return {
    signature: voix.signature ?? "Aucune signature",
    ton: `${ton.join(", ")}${voix.emojis.length > 0 ? ` ${voix.emojis.join("")}` : ""}`,
    sujets: `${pluriel(sujets, "sujet réglé", "sujets réglés")}${voix.motsEvites.length > 0 ? `, ${pluriel(voix.motsEvites.length, "mot à éviter", "mots à éviter")}` : ""}`,
    apprentissage: voix.apprendreCorrections ? `Activé, ${pluriel(nbCorrections, "correction retenue", "corrections retenues")}` : "Désactivé",
  };
}

function Ligne({ href, titre, resume }: { href: string; titre: string; resume: string }) {
  return (
    <li>
      <Link href={href} className="pressable flex items-center gap-3 px-[1.125rem] py-4">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight">{titre}</span>
          <span className="mt-0.5 block truncate text-[15px] text-encre-douce">{resume}</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

export default async function ReglagesPage({ searchParams }: PageProps<"/reglages">) {
  const params = await searchParams;
  const [session, conso, etablissement] = await Promise.all([
    auth(),
    consommationDuMois(),
    prisma.location.findFirst({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  const [voix, corrections] = etablissement ? await Promise.all([lireVoix(etablissement.id), listerCorrections(etablissement.id)]) : [null, []];
  const r = voix ? resumes(voix, corrections.length) : null;

  return (
    <Ecran titre="Réglages">
      {params.enregistre && (
        <p role="status" className="mb-4 rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          Réglages enregistrés. Ils s&apos;appliquent aux prochains brouillons.
        </p>
      )}

      {etablissement && r && (
        <section aria-labelledby="voix-titre">
          <h2 id="voix-titre" className="px-1 text-xl font-bold tracking-tight">
            La voix de vos réponses
          </h2>
          <p className="mt-0.5 px-1 text-[15px] text-encre-douce">Pour {etablissement.nom}.</p>
          <ul className="mt-3 divide-y divide-nuage overflow-hidden rounded-3xl bg-surface">
            <Ligne href="/reglages/signature" titre="Signature" resume={r.signature} />
            <Ligne href="/reglages/ton" titre="Ton" resume={r.ton} />
            <Ligne href="/reglages/sujets" titre="Sujets" resume={r.sujets} />
            <Ligne href="/reglages/apprentissage" titre="Apprentissage" resume={r.apprentissage} />
          </ul>
          <ul className="mt-3 overflow-hidden rounded-3xl bg-surface">
            <Ligne href="/reglages/apercu" titre="Voir un aperçu" resume="Une réponse écrite avec vos réglages" />
          </ul>
        </section>
      )}

      <h2 className="mt-9 px-1 text-xl font-bold tracking-tight">Votre compte</h2>
      <section className="bloc mt-3">
        {estModeDemo() ? (
          <p className="text-[15px] leading-snug text-encre-douce">
            Mode démonstration : l&apos;application s&apos;ouvre sans connexion, et aucune réponse n&apos;est réellement publiée sur Google.
          </p>
        ) : (
          <>
            <p className="text-sm text-encre-douce">Connecté avec</p>
            <p>{session?.user?.email}</p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/connexion" });
              }}
              className="mt-4"
            >
              <button type="submit" className="pressable rounded-full bg-nuage px-4 py-2 text-sm font-medium">
                Se déconnecter
              </button>
            </form>
          </>
        )}
      </section>

      <details className="bloc mt-3 group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="font-bold">Intelligence artificielle</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
          Vos avis et vos brouillons ne sont envoyés qu&apos;au fournisseur IA choisi, jamais ailleurs. Le texte des avis est traité comme une
          donnée, jamais comme une instruction.
        </p>
      </details>
    </Ecran>
  );
}
