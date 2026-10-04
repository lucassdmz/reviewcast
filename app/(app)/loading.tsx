/**
 * Affiché dès qu'on touche un onglet ou une carte, pendant que l'écran suivant
 * se prépare : la navigation répond tout de suite, sans écran figé.
 */
export default function Chargement() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-8" aria-busy="true">
      <p className="sr-only" role="status">
        Chargement…
      </p>
      <div className="h-9 w-44 animate-pulse rounded-full bg-nuage" />
      <div className="mt-6 space-y-3">
        <div className="bloc">
          <div className="h-4 w-28 animate-pulse rounded-full bg-nuage" />
          <div className="mt-4 h-12 w-36 animate-pulse rounded-2xl bg-nuage" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-nuage" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-nuage" />
        </div>
        <div className="bloc">
          <div className="h-4 w-40 animate-pulse rounded-full bg-nuage" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-nuage" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-nuage" />
        </div>
        <div className="bloc">
          <div className="h-4 w-32 animate-pulse rounded-full bg-nuage" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-nuage" />
        </div>
      </div>
    </main>
  );
}
