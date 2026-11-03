"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { lireReponseSynchro } from "@/lib/google/synchro-reponse";

/**
 * À l'ouverture de l'application : demande au serveur de relire les fiches si
 * la dernière lecture a plus de 15 minutes, puis de poursuivre l'analyse des
 * avis en attente, tant que l'écran reste ouvert. Aucun appel à Google ici.
 */
export function SynchroOuverture() {
  const router = useRouter();
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        while (actif) {
          const reponse = await fetch("/api/google/synchro-ouverture", { method: "POST" });
          if (!actif || !reponse.ok) return;
          const r = lireReponseSynchro(await reponse.json());
          if (r.changements > 0) router.refresh();
          if (r.restants === 0 || r.changements === 0) return;
        }
      } catch {
        // Hors ligne ou serveur indisponible : le prochain passage reprendra.
      }
    })();
    return () => {
      actif = false;
    };
  }, [router]);
  return null;
}
