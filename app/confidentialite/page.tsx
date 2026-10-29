import type { Metadata } from "next";
import Link from "next/link";
import { Marque } from "@/components/marque/Marque";

export const metadata: Metadata = { title: "Confidentialité — Éclaircie" };

/**
 * Politique de confidentialité, publique (lien de l'écran d'autorisation
 * Google). Statique : aucune donnée, aucune session. Une version anglaise
 * suit, pour l'équipe Google qui examine l'application.
 */
const MISE_A_JOUR = "29 octobre 2026";
const CONTACT = "lucas@keeplinking.fr";

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[1.25rem] font-bold leading-tight tracking-tight">{titre}</h2>
      <div className="mt-2 space-y-3 text-[16px] leading-relaxed text-encre-douce">{children}</div>
    </section>
  );
}

function Liste({ elements }: { elements: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {elements.map((element, i) => (
        <li key={i}>{element}</li>
      ))}
    </ul>
  );
}

export default function ConfidentialitePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/connexion" aria-label="Éclaircie, retour à la connexion">
        <Marque />
      </Link>
      <h1 className="mt-6 text-[2rem] font-bold leading-tight tracking-tight">Politique de confidentialité</h1>
      <p className="mt-2 text-[15px] text-encre-douce">
        Dernière mise à jour : {MISE_A_JOUR}. <a href="#english" className="underline">English version below.</a>
      </p>

      <Section titre="Qui sommes-nous">
        <p>
          Éclaircie est éditée par Keep Linking, SAS immatriculée sous le numéro SIREN 892 803 727, 84 cours
          Vitton, 69006 Lyon, France. Keep Linking est responsable du traitement des données décrites ici. Pour toute question :{" "}
          <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
        </p>
      </Section>

      <Section titre="Ce que fait Éclaircie">
        <p>
          Éclaircie aide les commerçants à suivre les avis Google de leur établissement et à y répondre. Vous connectez vous-même
          le compte Google qui gère votre fiche. L&apos;application lit vos avis, vous en donne une vue d&apos;ensemble et vous
          propose des brouillons de réponse. Une réponse n&apos;est publiée sur Google qu&apos;après votre validation explicite,
          jamais automatiquement.
        </p>
      </Section>

      <Section titre="Les données que nous utilisons">
        <Liste
          elements={[
            <>
              <strong>Votre compte Google</strong> : nom, adresse e-mail et photo de profil, pour vous connecter.
            </>,
            <>
              <strong>Vos fiches d&apos;établissement</strong>, avec l&apos;autorisation « Gérer vos fiches d&apos;établissement »
              que vous accordez : la liste de vos établissements, leurs avis (nom affiché de l&apos;auteur, note, texte, date) et
              les réponses déjà publiées.
            </>,
            <>
              <strong>Ce que vous saisissez dans l&apos;application</strong> : brouillons, réponses, notes internes, réglages de
              ton et de signature.
            </>,
            <>
              <strong>Données techniques</strong> : un cookie de session pour rester connecté, et, si vous les activez,
              l&apos;adresse d&apos;abonnement aux notifications de votre appareil.
            </>,
          ]}
        />
        <p>Nous n&apos;utilisons ni publicité, ni outil de mesure d&apos;audience, ni cookie de suivi.</p>
      </Section>

      <Section titre="Comment nous les utilisons">
        <Liste
          elements={[
            "Afficher vos avis, leurs tendances et ceux qui attendent une réponse.",
            "Préparer des brouillons de réponse, que vous relisez, modifiez et validez.",
            "Publier sur Google les réponses que vous avez validées, et uniquement celles-là.",
            "Vous prévenir, si vous le souhaitez, quand un avis attend une réponse.",
          ]}
        />
        <p>
          Les données reçues des API Google ne servent qu&apos;à ces fonctions. Elles ne sont jamais vendues, jamais utilisées
          pour de la publicité et jamais utilisées pour entraîner un modèle d&apos;intelligence artificielle.
        </p>
      </Section>

      <Section titre="Avec qui nous les partageons">
        <p>Uniquement avec les prestataires nécessaires au service, qui agissent pour notre compte :</p>
        <Liste
          elements={[
            "Vercel (hébergement de l'application, serveurs à Paris).",
            "Supabase (base de données, serveurs à Paris).",
            "Anthropic (modèle d'intelligence artificielle qui analyse les avis et rédige les brouillons). Le texte d'un avis lui est transmis pour cette seule tâche ; selon ses conditions, il n'est pas utilisé pour entraîner ses modèles.",
            "Google, lorsque vous publiez une réponse.",
          ]}
        />
        <p>
          Certains de ces prestataires peuvent traiter des données hors de l&apos;Union européenne, avec les garanties prévues par
          le RGPD (clauses contractuelles types).
        </p>
      </Section>

      <Section titre="Utilisation limitée des données Google">
        <p>
          L&apos;utilisation et le transfert par Éclaircie des informations reçues des API Google respectent les{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline">
            règles relatives aux données utilisateur des services API Google
          </a>
          , y compris les exigences d&apos;utilisation limitée (Limited Use).
        </p>
      </Section>

      <Section titre="Sécurité et conservation">
        <p>
          Les autorisations Google et les clés techniques sont chiffrées en base et ne quittent jamais nos serveurs. Les échanges
          sont chiffrés (HTTPS). Vos données sont conservées tant que votre compte est actif ; les avis retirés de Google sont
          marqués comme tels pour garder vos statistiques. À la fermeture de votre compte, toutes vos données sont supprimées
          dans un délai de 30 jours.
        </p>
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger, les exporter ou en demander la suppression en écrivant à{" "}
          <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>. Vous pouvez retirer à tout moment l&apos;accès
          d&apos;Éclaircie à votre compte Google depuis{" "}
          <a href="https://myaccount.google.com/permissions" className="underline">la page des autorisations de votre compte Google</a>
          . Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr).
        </p>
      </Section>

      <div id="english" className="mt-14 border-t border-nuage pt-10">
        <h2 className="text-[1.6rem] font-bold leading-tight tracking-tight">Privacy policy (English)</h2>
        <p className="mt-2 text-[15px] text-encre-douce">Last updated: October 29, 2026.</p>

        <Section titre="Who we are">
          <p>
            Éclaircie is published by Keep Linking SAS (SIREN 892 803 727), 84 cours Vitton, 69006 Lyon, France, the data
            controller. Contact: <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
          </p>
        </Section>

        <Section titre="Data we access">
          <Liste
            elements={[
              "Your Google account name, email address and profile picture, to sign you in.",
              "With the business.manage scope you grant: your business locations, their reviews (reviewer display name, rating, text, date) and existing replies.",
              "What you enter in the app: drafts, replies, internal notes, tone and signature settings.",
              "A session cookie and, if you enable them, your device's push notification subscription.",
            ]}
          />
        </Section>

        <Section titre="How we use it">
          <p>
            To show your reviews and trends, draft replies for you to review, and post to Google only the replies you have
            explicitly approved. Nothing is ever posted automatically. Google user data is never sold, never used for
            advertising, and never used to train AI models.
          </p>
        </Section>

        <Section titre="Sharing">
          <p>
            Only with the processors that run the service: Vercel (hosting, Paris), Supabase (database, Paris), Anthropic (AI
            model that analyzes reviews and drafts replies; review text is sent for that task only and, under its terms, is not
            used for model training), and Google when you post a reply.
          </p>
        </Section>

        <Section titre="Limited Use">
          <p>
            Éclaircie&apos;s use and transfer of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section titre="Security, retention and your rights">
          <p>
            Google tokens are encrypted at rest and never leave our servers; all traffic uses HTTPS. Data is kept while your
            account is active and deleted within 30 days of closing it. You can access, correct, export or delete your data by
            emailing <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>, and revoke Éclaircie&apos;s access at
            any time from{" "}
            <a href="https://myaccount.google.com/permissions" className="underline">your Google account permissions</a>.
          </p>
        </Section>
      </div>
    </main>
  );
}
