"use client";

import { useEffect, useRef } from "react";

/**
 * Affiche un nombre déjà calculé et le fait monter jusqu'à sa valeur à
 * l'arrivée sur l'écran. Le rendu serveur porte la valeur finale : sans
 * JavaScript ou avec les animations réduites, rien ne bouge.
 */
export function NombreAnime({ valeur, decimales = 1, duree = 450 }: { valeur: number; decimales?: number; duree?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    const debut = performance.now();
    let id = 0;
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      const adouci = 1 - Math.pow(1 - p, 3);
      el.textContent = f.format(valeur * adouci);
      if (p < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(id);
      el.textContent = f.format(valeur);
    };
  }, [valeur, decimales, duree]);

  return (
    <span ref={ref} className="tabular-nums">
      {format.format(valeur)}
    </span>
  );
}
