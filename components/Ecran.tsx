import type { ReactNode } from "react";

/** Conteneur d'écran : titre, contenu, marge pour la barre d'onglets. */
export function Ecran({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-bold">{titre}</h1>
      {children}
    </main>
  );
}
