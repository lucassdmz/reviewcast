"use client";

import { useCallback, useEffect, useState } from "react";
import { demanderSynthese, type DemandeSynthese, type ResultatDemande, type SyntheseTendances } from "@/lib/analytics/synthese-contrat";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

type Attente = "repos" | "redaction" | "indisponible" | "hors_ligne";

/**
 * Synthèse IA de la période, exportable : copie du texte dans le presse-papiers
 * et impression (PDF via le navigateur, feuille de style d'impression). Le reste
 * de l'écran est déjà affiché : si elle n'est pas prête, elle se rédige ici, et
 * une ancienne version reste lisible en attendant.
 */
export function Synthese({
  initiale,
  aRediger,
  demande,
  titre,
}: {
  initiale: SyntheseTendances | null;
  aRediger: boolean;
  demande: DemandeSynthese;
  titre: string;
}) {
  const [synthese, setSynthese] = useState(initiale);
  const [attente, setAttente] = useState<Attente>(aRediger ? "redaction" : "repos");
  const [copie, setCopie] = useState(false);
  const [vide, setVide] = useState(!initiale && !aRediger);
  const texte = synthese ? `${titre}\n\n${synthese.lignes.map((l) => `• ${l}`).join("\n")}` : "";

  const appliquer = useCallback((r: ResultatDemande) => {
    if (r.synthese) setSynthese(r.synthese);
    setVide(r.etat === "vide");
    setAttente(r.etat === "hors_ligne" ? "hors_ligne" : r.etat === "indisponible" ? "indisponible" : "repos");
  }, []);

  const demander = useCallback(
    (forcer: boolean) => {
      void demanderSynthese({ ...demande, forcer }).then((r) => appliquer(r));
    },
    [demande, appliquer],
  );

  // La demande n'est jamais annulée : si l'on quitte l'écran, le texte payé est tout de même enregistré.
  useEffect(() => {
    if (!aRediger) return;
    void demanderSynthese({ ...demande, forcer: false }).then((r) => appliquer(r));
  }, [aRediger, demande, appliquer]);

  useEffect(() => {
    if (attente !== "hors_ligne") return;
    function reprendre() {
      setAttente("redaction");
      demander(false);
    }
    window.addEventListener("online", reprendre);
    return () => window.removeEventListener("online", reprendre);
  }, [attente, demander]);

  function relancer(forcer: boolean) {
    setAttente("redaction");
    demander(forcer);
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  const enRedaction = attente === "redaction";

  return (
    <section aria-labelledby="synthese-titre" aria-busy={enRedaction} className="bloc print:bg-white">
      <h2 id="synthese-titre" className="text-sm font-semibold">
        Synthèse de la période
      </h2>
      {synthese ? (
        <>
          <ul className={`mt-2 space-y-1 text-sm leading-snug transition-opacity ${enRedaction ? "opacity-60" : ""}`}>
            {synthese.lignes.map((l, i) => (
              <li key={i}>• {l}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-encre-douce">
            {enRedaction ? <span role="status">Mise à jour avec vos derniers chiffres…</span> : `Générée le ${formatDate.format(new Date(synthese.generee))}.`}
          </p>
        </>
      ) : enRedaction ? (
        <div className="mt-2" data-testid="synthese-en-attente">
          <p role="status" className="text-sm text-encre-douce">
            La synthèse se rédige, vos chiffres sont déjà à jour.
          </p>
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-3.5 w-full animate-pulse rounded-full bg-nuage" />
            <div className="h-3.5 w-5/6 animate-pulse rounded-full bg-nuage" />
            <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-nuage" />
          </div>
        </div>
      ) : vide ? (
        <p className="mt-2 text-sm text-encre-douce">Pas assez d&apos;avis sur la période pour une synthèse.</p>
      ) : null}
      {attente === "hors_ligne" && <p className="mt-2 text-sm text-encre-douce">Vous êtes hors ligne : la synthèse se rédigera au retour de la connexion.</p>}
      {attente === "indisponible" && <p className="mt-2 text-sm text-encre-douce">La synthèse n&apos;a pas pu être rédigée pour le moment. Vos chiffres, eux, sont à jour.</p>}
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
        {!vide && !enRedaction && attente !== "hors_ligne" && (
          <button type="button" onClick={() => relancer(attente === "repos")} className="pressable rounded-full bg-nuage px-3 py-1.5 font-medium">
            {attente === "indisponible" ? "Réessayer" : "Régénérer"}
          </button>
        )}
      </div>
    </section>
  );
}
