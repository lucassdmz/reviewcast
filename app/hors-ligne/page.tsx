import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hors ligne — Éclaircie" };

/**
 * Servie par le service worker quand un écran n'a jamais été chargé et que
 * le réseau manque. Statique : aucune donnée, aucune session.
 */
export default function HorsLignePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <span aria-hidden="true" className="block h-20 w-20 rounded-full bg-nuage" />
      <h1 className="mt-6 text-[2rem] font-bold leading-tight tracking-tight">Pas de réseau pour le moment</h1>
      <p className="mt-2 text-[17px] leading-snug text-encre-douce">
        Cet écran n&apos;a pas encore été chargé sur ce téléphone. L&apos;accueil, la file À traiter et les tendances restent lisibles hors ligne une fois ouverts.
      </p>
      {/* Un lien simple plutôt qu'un bouton : le code de cette page peut ne pas être en cache. Il recharge l'écran demandé. */}
      <a href="" className="pressable bouton-principal mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-[15px]">
        Réessayer
      </a>
    </main>
  );
}
