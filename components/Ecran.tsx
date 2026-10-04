import type { ReactNode } from "react";
import { BoutonRetour } from "@/components/BoutonRetour";

/** Conteneur d'écran : grand titre, contenu, marge pour la barre d'onglets. `large` passe en deux colonnes dès 1024 px. */
export function Ecran({
  titre,
  children,
  large = false,
  retour,
}: {
  titre: string;
  children: ReactNode;
  large?: boolean;
  retour?: { href: string; libelle: string };
}) {
  return (
    <main className={`entree mx-auto w-full flex-1 px-4 pb-28 ${retour ? "pt-4" : "pt-8"} ${large ? "max-w-lg lg:max-w-4xl" : "max-w-lg"}`}>
      {retour && (
        <div className="mb-3">
          <BoutonRetour href={retour.href} libelle={retour.libelle} />
        </div>
      )}
      <h1 className="mb-5 px-1 text-[2rem] font-bold leading-tight tracking-tight">{titre}</h1>
      {children}
    </main>
  );
}
