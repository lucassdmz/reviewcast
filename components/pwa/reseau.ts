"use client";

import { useOffline } from "next/offline";
import { useEffect, useSyncExternalStore } from "react";
import { actionsEnAttente } from "@/lib/pwa/attente";

function abonnerNavigateur(ecouteur: () => void) {
  window.addEventListener("online", ecouteur);
  window.addEventListener("offline", ecouteur);
  return () => {
    window.removeEventListener("online", ecouteur);
    window.removeEventListener("offline", ecouteur);
  };
}

/**
 * Vrai sans connexion. Next le détecte quand une requête échoue ; le
 * navigateur, dès l'ouverture d'une page servie par le service worker.
 */
export function useHorsLigne(): boolean {
  const detecte = useOffline();
  const navigateurHorsLigne = useSyncExternalStore(
    abonnerNavigateur,
    () => !navigator.onLine,
    () => false,
  );
  return detecte || navigateurHorsLigne;
}

export function useNombreEnAttente(): number {
  return useSyncExternalStore(actionsEnAttente.abonner, actionsEnAttente.nombre, () => 0);
}

/**
 * À appeler dans un formulaire : tant que son action est en cours sans
 * réseau, elle compte comme en attente. Renvoie vrai dans ce cas, pour
 * afficher « En attente du réseau ».
 */
export function useAttenteReseau(enCours: boolean): boolean {
  const horsLigne = useHorsLigne();
  const enAttente = enCours && horsLigne;
  useEffect(() => (enAttente ? actionsEnAttente.ajouter() : undefined), [enAttente]);
  return enAttente;
}
