import { redirect } from "next/navigation";
import { Marque } from "@/components/marque/Marque";
import { Ciel } from "@/components/meteo/Ciel";
import { auth, signIn } from "@/lib/auth/config";

const messagesErreur: Record<string, string> = {
  AccessDenied: "Cette adresse Google n'est pas autorisée à accéder à l'application.",
  Configuration: "La connexion n'est pas configurée. Vérifiez le fichier .env.",
  OAuthCallbackError: "La connexion avec Google n'a pas abouti. Vous pouvez réessayer.",
};

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const session = await auth();
  if (session?.user) redirect("/");

  const params = await searchParams;
  const erreur = typeof params.error === "string" ? params.error : undefined;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/";
  const message = erreur ? (messagesErreur[erreur] ?? "Une erreur est survenue. Vous pouvez réessayer.") : null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <Ciel meteo="SOLEIL_VOILE" className="h-28 w-28" />
      <h1 className="mt-6">
        <span className="sr-only">Éclaircie</span>
        <Marque taille="grande" />
      </h1>
      <p className="mt-2 text-encre-douce">
        La météo de vos avis Google. Connectez-vous avec le compte Google qui gère votre fiche.
      </p>
      {message && (
        <p role="alert" className="mt-6 rounded-2xl bg-soleil-doux px-4 py-3 text-sm">
          {message}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl });
        }}
        className="mt-8"
      >
        <button
          type="submit"
          className="w-full rounded-full bg-encre px-4 py-3.5 text-base font-bold text-fond active:opacity-80"
        >
          Se connecter avec Google
        </button>
      </form>
    </main>
  );
}
