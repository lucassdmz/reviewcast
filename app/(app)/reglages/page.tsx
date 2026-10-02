import { Ecran } from "@/components/Ecran";
import { auth, signOut } from "@/lib/auth/config";

export default async function ReglagesPage() {
  const session = await auth();
  return (
    <Ecran titre="Réglages">
      <section className="rounded-2xl bg-surface p-6">
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
            className="rounded-xl border border-nuage px-4 py-2 text-sm font-medium hover:bg-nuage"
          >
            Se déconnecter
          </button>
        </form>
      </section>
    </Ecran>
  );
}
