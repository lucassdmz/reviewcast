import { redirect } from "next/navigation";
import { BoutonAction } from "@/components/BoutonAction";
import { Ecran } from "@/components/Ecran";
import { auth } from "@/lib/auth/config";
import { estModeDemo } from "@/lib/auth/demo";
import { listerFichesDisponibles, lireConnexion, messageConnexion, type FicheDisponible } from "@/lib/google/connexion";
import { etatDesFiches } from "@/lib/google/sync";
import { actionChoisirFiche } from "./actions";

export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function Bouton({ libelle }: { libelle: string }) {
  // Un vrai lien, pas de préchargement : il ouvre l'écran de consentement de Google.
  return (
    <a href="/api/google/connexion" className="bouton-principal mt-4 block text-center">
      {libelle}
    </a>
  );
}

/** Connexion de la fiche Google : lancer l'autorisation, choisir l'établissement, voir où en est la mise à jour. */
export default async function FicheGooglePage({ searchParams }: PageProps<"/reglages/fiche-google">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const query = await searchParams;
  const retour = { href: "/reglages", libelle: "Réglages" };

  if (estModeDemo()) {
    return (
      <Ecran titre="Fiche Google" retour={retour}>
        <p className="bloc text-[15px] leading-snug text-encre-douce">Mode démonstration : les avis sont fictifs et aucune fiche Google n&apos;est connectée.</p>
      </Ecran>
    );
  }

  const connexion = await lireConnexion(session.user.id);
  let erreur = messageConnexion(typeof query.erreur === "string" ? query.erreur : undefined);
  let fiches: FicheDisponible[] = [];
  if (connexion && !connexion.aReconnecterAt) {
    try {
      fiches = await listerFichesDisponibles(connexion.id);
    } catch (e) {
      console.error("Liste des fiches indisponible", e instanceof Error ? e.message : "erreur inconnue");
      erreur ??= messageConnexion("google-indisponible");
    }
  }
  const reconnexion = connexion ? (await lireConnexion(session.user.id))?.aReconnecterAt : null;
  const etats = connexion ? await etatDesFiches(session.user.id) : [];

  return (
    <Ecran titre="Fiche Google" retour={retour}>
      {erreur && (
        <p role="status" className="mb-4 rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          {erreur}
        </p>
      )}

      {!connexion && (
        <section className="bloc">
          <p className="text-[15px] leading-snug">Connectez votre fiche pour retrouver vos avis ici et y répondre depuis Éclaircie. Rien n&apos;est publié sur Google sans votre validation.</p>
          <Bouton libelle="Connecter ma fiche Google" />
        </section>
      )}

      {reconnexion && (
        <section className="bloc">
          <p className="text-[15px] leading-snug">Google ne reconnaît plus l&apos;accès à votre fiche. Vos avis restent ici, mais ils ne se mettent plus à jour tant que vous ne l&apos;avez pas reconnectée.</p>
          <Bouton libelle="Reconnecter ma fiche Google" />
        </section>
      )}

      {etats.length > 0 && (
        <section aria-labelledby="fiches-liees">
          <h2 id="fiches-liees" className="px-1 text-xl font-bold tracking-tight">
            Vos fiches connectées
          </h2>
          <ul className="mt-3 divide-y divide-nuage overflow-hidden rounded-3xl bg-surface">
            {etats.map((e) => (
              <li key={e.id} className="px-[1.125rem] py-4">
                <p className="text-[17px] font-bold leading-tight">{e.nom}</p>
                <p className="mt-0.5 text-[15px] text-encre-douce">{e.lastSyncAt ? `Mise à jour le ${formatDate.format(e.lastSyncAt)}` : "Première mise à jour à venir"}</p>
                {e.enAttente > 0 && <p className="mt-0.5 text-[15px] text-encre-douce">{e.enAttente > 1 ? `${e.enAttente} avis en cours de lecture` : "1 avis en cours de lecture"}</p>}
                {e.historiqueEnCours && <p className="mt-0.5 text-[15px] text-encre-douce">Vos avis sont déjà là. L&apos;analyse de votre historique peut prendre jusqu&apos;à 24 heures : les tendances se rempliront d&apos;elles-mêmes.</p>}
                <p className="mt-0.5 text-[15px] text-encre-douce">
                  {e.notificationsGoogle === "actives"
                    ? "Les nouveaux avis arrivent en temps réel."
                    : e.notificationsGoogle === "autre_sujet"
                      ? "Un autre outil reçoit déjà les alertes de ce compte : vos avis se mettent à jour à l'ouverture de l'application et une fois par jour."
                      : "Vos avis se mettent à jour à l'ouverture de l'application et une fois par jour."}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fiches.some((f) => !f.rattachee) && (
        <section aria-labelledby="choisir-fiche" className={etats.length > 0 ? "mt-9" : ""}>
          <h2 id="choisir-fiche" className="px-1 text-xl font-bold tracking-tight">
            Quel établissement voulez-vous suivre ?
          </h2>
          <ul className="mt-3 divide-y divide-nuage overflow-hidden rounded-3xl bg-surface">
            {fiches
              .filter((f) => !f.rattachee)
              .map((f) => (
                <li key={f.googleLocationId} className="flex items-center gap-3 px-[1.125rem] py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold leading-tight">{f.nom}</span>
                    {f.adresse && <span className="mt-0.5 block text-[15px] text-encre-douce">{f.adresse}</span>}
                  </span>
                  <form action={actionChoisirFiche}>
                    <input type="hidden" name="fiche" value={f.googleLocationId} />
                    <BoutonAction className="pressable shrink-0 rounded-full bg-nuage px-4 py-2 text-sm font-medium" enCours="Import en cours">
                      Choisir
                    </BoutonAction>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      )}

      {connexion && !reconnexion && !erreur && fiches.length === 0 && <p className="bloc text-[15px] leading-snug">Ce compte Google ne gère aucune fiche d&apos;établissement.</p>}
    </Ecran>
  );
}
