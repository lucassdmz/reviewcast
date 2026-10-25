import { ListeConversations } from "@/components/accueil/Conversations";
import { Ecran } from "@/components/Ecran";
import { listerFlux } from "@/lib/accueil/flux";
import { idEtablissementActif } from "@/lib/etablissements/service";

export const dynamic = "force-dynamic";

/** Tous les avis, une ligne par client, comme une liste de conversations. */
export default async function AvisPage() {
  const posts = await listerFlux(await idEtablissementActif(), new Date(), 200);
  return (
    <Ecran titre="Tous les avis" retour={{ href: "/", libelle: "Accueil" }}>
      {posts.length === 0 ? (
        <p className="text-[15px] text-encre-douce">Aucun avis pour le moment.</p>
      ) : (
        <ListeConversations posts={posts} />
      )}
    </Ecran>
  );
}
