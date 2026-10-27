"use client";

import { useEffect } from "react";
import { actionsEnAttente, messageHorsLigne } from "@/lib/pwa/attente";
import { ECRANS_HORS_LIGNE } from "@/lib/pwa/strategie";
import { useHorsLigne, useNombreEnAttente } from "./reseau";

/** Enregistre le service worker et lui demande de garder à jour les trois écrans lisibles hors ligne. */
function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let annule = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (annule || !navigator.onLine) return;
        const autres = ECRANS_HORS_LIGNE.filter((c) => c !== window.location.pathname);
        registration.active?.postMessage({ type: "precharger", chemins: autres });
      })
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, []);
}

/**
 * Hors ligne, un lien interne ouvre la page en entier : le service worker la
 * sert depuis le cache. Sans cela, Next attendrait le retour du réseau.
 * Si une action attend le réseau, on laisse faire Next : recharger la perdrait.
 */
function useLiensHorsLigne(horsLigne: boolean) {
  useEffect(() => {
    if (!horsLigne) return;
    function surClic(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (actionsEnAttente.nombre() > 0) return;
      const lien = (event.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement) || lien.target || lien.hasAttribute("download")) return;
      const url = new URL(lien.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.href);
    }
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, [horsLigne]);
}

/** Bandeau discret en haut de l'écran tant que le réseau manque. */
export function HorsLigne() {
  const horsLigne = useHorsLigne();
  const enAttente = useNombreEnAttente();
  useServiceWorker();
  useLiensHorsLigne(horsLigne);
  if (!horsLigne) return null;
  return (
    <p role="status" className="sticky top-0 z-20 bg-nuage px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-[14px] font-medium text-encre">
      {messageHorsLigne(enAttente)}
    </p>
  );
}
