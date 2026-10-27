"use client";

import { useEffect, useState, useTransition } from "react";
import {
  actionActiverNotifications,
  actionDesactiverNotifications,
  actionEssaiNotification,
  actionLireNotifications,
} from "@/app/(app)/reglages/notifications/actions";
import { cleEnOctets } from "@/lib/notifications/cle";
import type { ChoixNotifications } from "@/lib/notifications/messages";

type Etat = "chargement" | "indisponible" | "installer" | "bloquees" | "pret";

const AUCUNE: ChoixNotifications = { nouvelAvis: false, resumeHebdo: false };

const OPTIONS: { cle: keyof ChoixNotifications; titre: string; detail: string }[] = [
  { cle: "nouvelAvis", titre: "Avis à traiter", detail: "Quand un avis attend votre réponse, avec son brouillon prêt." },
  { cle: "resumeHebdo", titre: "Résumé du lundi", detail: "Votre semaine en une phrase, le lundi matin." },
];

/** Sur iPhone, les notifications n'existent que pour l'application ajoutée à l'écran d'accueil. */
function iPhoneHorsApplication(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installee = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  return ios && !installee;
}

async function enregistrement(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

/**
 * Deux interrupteurs, un par notification. Le premier activé demande
 * l'autorisation au téléphone ; tout désactiver retire l'abonnement.
 */
export function ReglageNotifications({ clePublique }: { clePublique: string | null }) {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [choix, setChoix] = useState<ChoixNotifications>(AUCUNE);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    let annule = false;
    (async () => {
      const reg = await enregistrement();
      let suivant: Etat = "pret";
      let lu: ChoixNotifications = AUCUNE;
      if (!clePublique) suivant = "indisponible";
      else if ("Notification" in window && iPhoneHorsApplication()) suivant = "installer";
      else if (!reg) suivant = "indisponible";
      else if (Notification.permission === "denied") suivant = "bloquees";
      else {
        const abonnement = await reg.pushManager.getSubscription();
        if (abonnement) lu = (await actionLireNotifications(abonnement.endpoint)) ?? AUCUNE;
      }
      if (annule) return;
      setChoix(lu);
      setEtat(suivant);
    })().catch(() => !annule && setEtat("indisponible"));
    return () => {
      annule = true;
    };
  }, [clePublique]);

  function changer(cle: keyof ChoixNotifications, valeur: boolean) {
    const nouveau = { ...choix, [cle]: valeur };
    setMessage(null);
    demarrer(async () => {
      const reg = await enregistrement();
      if (!reg || !clePublique) return setEtat("indisponible");
      let abonnement = await reg.pushManager.getSubscription();
      if (!nouveau.nouvelAvis && !nouveau.resumeHebdo) {
        if (abonnement) {
          await actionDesactiverNotifications(abonnement.endpoint);
          await abonnement.unsubscribe();
        }
        setChoix(AUCUNE);
        return;
      }
      if (!abonnement) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setEtat(permission === "denied" ? "bloquees" : "pret");
        try {
          abonnement = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(clePublique) });
        } catch {
          return setMessage("Le téléphone n'a pas pu activer les notifications. Vérifiez la connexion, puis réessayez.");
        }
      }
      const r = await actionActiverNotifications(abonnement.toJSON(), nouveau);
      if (r.erreur) setMessage(r.erreur);
      else setChoix(nouveau);
    });
  }

  function essayer() {
    setMessage(null);
    demarrer(async () => {
      const abonnement = await (await enregistrement())?.pushManager.getSubscription();
      if (!abonnement) return;
      const r = await actionEssaiNotification(abonnement.endpoint);
      setMessage(r.erreur ?? "Notification envoyée. Elle arrive dans quelques secondes.");
    });
  }

  if (etat === "chargement") return <p className="bloc text-[15px] text-encre-douce">Un instant…</p>;
  if (etat !== "pret") {
    const textes: Record<Exclude<Etat, "chargement" | "pret">, string> = {
      indisponible: "Les notifications ne sont pas disponibles ici. Elles le seront dans l'application installée, une fois configurées sur le serveur.",
      installer: "Sur iPhone, ajoutez d'abord Éclaircie à l'écran d'accueil : touchez Partager, puis « Sur l'écran d'accueil ». Ouvrez ensuite l'application et revenez ici.",
      bloquees: "Les notifications sont bloquées pour Éclaircie. Vous pouvez les autoriser dans les réglages du téléphone, puis revenir ici.",
    };
    return <p className="bloc text-[15px] leading-snug text-encre-douce">{textes[etat]}</p>;
  }

  const actives = choix.nouvelAvis || choix.resumeHebdo;
  return (
    <div className="space-y-3">
      <div className="bloc">
        <h2 className="text-lg font-bold leading-tight">Être prévenu</h2>
        <p className="mt-1 text-[15px] leading-snug text-encre-douce">Ce choix vaut pour cet appareil. Les notifications ne contiennent ni nom de client ni texte d&apos;avis.</p>
        <ul className="mt-3 space-y-2">
          {OPTIONS.map((o) => (
            <li key={o.cle}>
              <label className="pressable flex cursor-pointer items-center gap-3 rounded-2xl bg-fond px-4 py-3.5 has-focus-visible:ring-2 has-focus-visible:ring-encre">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-tight">{o.titre}</span>
                  <span className="block text-sm leading-snug text-encre-douce">{o.detail}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={choix[o.cle]}
                  disabled={enCours}
                  onChange={(e) => changer(o.cle, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-7 w-12 shrink-0 rounded-full bg-nuage transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:bg-matcha-vif peer-checked:after:translate-x-5 peer-disabled:opacity-60"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>
      {message && (
        <p role="status" className="rounded-2xl bg-soleil-doux px-4 py-2.5 text-[15px]">
          {message}
        </p>
      )}
      {actives && (
        <button type="button" onClick={essayer} disabled={enCours} className="pressable w-full rounded-full bg-nuage px-4 py-3 text-[15px] font-medium disabled:opacity-60">
          Envoyer une notification d&apos;essai
        </button>
      )}
    </div>
  );
}
