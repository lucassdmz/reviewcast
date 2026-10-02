import { Ecran } from "@/components/Ecran";
import { auth } from "@/lib/auth/config";

export default async function HomePage() {
  const session = await auth();
  const prenom = session?.user?.name?.split(" ")[0] ?? "";
  return (
    <Ecran titre={prenom ? `Bonjour ${prenom}` : "Bonjour"}>
      <section className="rounded-2xl bg-ciel p-6">
        <p className="text-5xl" aria-hidden="true">
          🌤️
        </p>
        <p className="mt-3 text-lg font-semibold">Votre météo arrive bientôt</p>
        <p className="mt-1 text-sm text-encre-douce">
          Connectez votre fiche Google dans Réglages pour voir le climat de vos avis.
        </p>
      </section>
    </Ecran>
  );
}
