"use client";

import { useEffect } from "react";
import { CACHE_PAGES } from "@/lib/pwa/strategie";

/**
 * Sur l'écran de connexion : la session est finie, les pages gardées pour
 * la lecture hors ligne (avec les noms des clients) sont effacées.
 */
export function OubliHorsLigne() {
  useEffect(() => {
    if (!("caches" in window)) return;
    caches.delete(CACHE_PAGES).catch(() => undefined);
    navigator.serviceWorker?.controller?.postMessage({ type: "oublier" });
  }, []);
  return null;
}
