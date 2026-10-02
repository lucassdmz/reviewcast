import type { ReactNode } from "react";

/** Conteneur d'écran : titre, contenu, marge pour la barre d'onglets. `large` passe en deux colonnes dès 1024 px. */
export function Ecran({ titre, children, large = false }: { titre: string; children: ReactNode; large?: boolean }) {
  return (
    <main className={`mx-auto w-full flex-1 px-4 pb-24 pt-6 ${large ? "max-w-lg lg:max-w-4xl" : "max-w-lg"}`}>
      <h1 className="mb-4 text-2xl font-bold">{titre}</h1>
      {children}
    </main>
  );
}
