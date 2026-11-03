"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Demande la rédaction des mercis manquants une fois l'accueil affiché. Quand
 * ils sont prêts, leur carte rejoint la pile. Hors ligne, rien ne se passe : la
 * prochaine ouverture s'en charge.
 */
export function PreparationMercis() {
  const router = useRouter();
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const reponse = await fetch("/api/accueil/mercis", { method: "POST" });
        if (!reponse.ok) return;
        const { prepares } = (await reponse.json()) as { prepares?: unknown };
        if (actif && typeof prepares === "number" && prepares > 0) router.refresh();
      } catch {
        // Hors ligne ou serveur indisponible : la prochaine ouverture reprendra.
      }
    })();
    return () => {
      actif = false;
    };
  }, [router]);
  return null;
}
