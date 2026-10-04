"use client";

import { useState } from "react";
import type { SyntheseTendances } from "@/lib/analytics/synthese";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Synthèse IA de la période, exportable : copie du texte dans le presse-papiers
 * et impression (PDF via le navigateur, feuille de style d'impression).
 */
export function Synthese({ synthese, titre, regenerer }: { synthese: SyntheseTendances | null; titre: string; regenerer: React.ReactNode }) {
  const [copie, setCopie] = useState(false);
  const texte = synthese ? `${titre}\n\n${synthese.lignes.map((l) => `• ${l}`).join("\n")}` : "";

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  return (
    <section aria-labelledby="synthese-titre" className="bloc print:bg-white">
      <h2 id="synthese-titre" className="text-sm font-semibold">
        Synthèse de la période
      </h2>
      {synthese ? (
        <>
          <ul className="mt-2 space-y-1 text-sm leading-snug">
            {synthese.lignes.map((l, i) => (
              <li key={i}>• {l}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-encre-douce">Générée le {formatDate.format(synthese.generee)}.</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-encre-douce">Pas assez d&apos;avis sur la période pour une synthèse.</p>
      )}
      <div className="no-print mt-3 flex flex-wrap gap-2 text-sm">
        {synthese && (
          <>
            <button type="button" onClick={copier} className="rounded-full bg-nuage font-medium px-3 py-1.5 hover:opacity-60">
              {copie ? "Copié" : "Copier le texte"}
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-full bg-nuage font-medium px-3 py-1.5 hover:opacity-60">
              Exporter en PDF
            </button>
          </>
        )}
        {regenerer}
      </div>
    </section>
  );
}
