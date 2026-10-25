import { ListeConversations } from "@/components/accueil/Conversations";
import { Ecran } from "@/components/Ecran";
import { listerFlux } from "@/lib/accueil/flux";
import { idEtablissementActif } from "@/lib/etablissements/service";

export const dynamic = "force-dynamic";

/** Tous les avis, une ligne par client, comme une liste de conversations. */
export default async function AvisPage({ searchParams }: PageProps<"/avis">) {
  const params = await searchParams;
  const posts = await listerFlux(await idEtablissementActif(), new Date(), 200);
  const message = params.publie ? "Réponse publiée sur Google." : params.traite ? "Avis marqué comme traité." : null;
  return (
    <Ecran titre="Tous les avis" retour={{ href: "/", libelle: "Accueil" }}>
      {message && (
        <p role="status" className="mb-3 rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          {message}
        </p>
      )}
      {posts.length === 0 ? (
        <p className="text-[15px] text-encre-douce">Aucun avis pour le moment.</p>
      ) : (
        <ListeConversations posts={posts} />
      )}
    </Ecran>
  );
}
