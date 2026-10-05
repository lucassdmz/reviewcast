"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { actionChoisirEtablissement } from "@/app/(app)/actions";
import type { Etablissement } from "@/lib/etablissements/actif";
import { LogoEtablissement } from "./LogoEtablissement";

/** Durée d'appui, en millisecondes, à partir de laquelle la liste s'ouvre sans relâcher. */
const APPUI_LONG_MS = 350;

/** Onglets dont les pages de détail appartiennent à un établissement précis. */
const ONGLETS_A_DETAIL = ["/a-traiter", "/tendances"];

/**
 * Rond de la barre d'onglets : le logo de l'établissement affiché. Un tap ou
 * un appui long ouvre la liste des établissements, pour passer de l'un à
 * l'autre sans quitter l'écran en cours.
 */
export function ChoixEtablissement({ etablissements, actif }: { etablissements: Etablissement[]; actif: Etablissement | null }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vientDOuvrir = useRef(false);
  const [enCours, demarrer] = useTransition();
  const [choisi, setChoisi] = useState<string | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  if (etablissements.length === 0) return null;
  const plusieurs = etablissements.length > 1;

  const ouvrir = (appuiLong = false) => {
    const d = dialogue.current;
    if (!d || d.open) return;
    d.showModal();
    if (!appuiLong) return;
    // Le doigt est encore posé : son relâchement ne doit pas compter comme un tap sur le voile.
    vientDOuvrir.current = true;
    setTimeout(() => (vientDOuvrir.current = false), 500);
    if ("vibrate" in navigator) navigator.vibrate(10);
  };
  const fermer = () => dialogue.current?.close();
  const annulerAppui = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  };

  const choisir = (id: string | null) => {
    if (id === (actif?.id ?? null)) return fermer();
    setChoisi(id);
    demarrer(async () => {
      await actionChoisirEtablissement(id);
      fermer();
      setChoisi(undefined);
      // Une fiche d'avis ou un thème ouvert appartient à l'établissement quitté : retour à l'onglet.
      const onglet = ONGLETS_A_DETAIL.find((o) => pathname.startsWith(`${o}/`));
      if (onglet) router.replace(onglet);
    });
  };

  const ligne = (id: string | null, visuel: React.ReactNode, titre: string, detail: string | null) => {
    const estActif = (actif?.id ?? null) === id;
    const attente = enCours && choisi === id;
    return (
      <li key={id ?? "tous"}>
        <button
          type="button"
          onClick={() => choisir(id)}
          disabled={enCours}
          aria-current={estActif ? "true" : undefined}
          className={`pressable flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${estActif ? "bg-fond" : ""}`}
        >
          {visuel}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold leading-tight">{titre}</span>
            {detail && <span className="mt-0.5 block truncate text-[15px] text-encre-douce">{detail}</span>}
          </span>
          {attente ? (
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-nuage border-t-encre" aria-label="Changement en cours" />
          ) : (
            estActif && (
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )
          )}
        </button>
      </li>
    );
  };

  /** Vue d'ensemble : un rond d'encre avec quatre points, pour ne privilégier aucun logo. */
  const ensemble = (classe: string) => (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-encre text-fond ${classe}`}>
      <svg viewBox="0 0 24 24" className="h-[46%] w-[46%]" fill="currentColor">
        <circle cx="7" cy="7" r="3.2" />
        <circle cx="17" cy="7" r="3.2" />
        <circle cx="7" cy="17" r="3.2" />
        <circle cx="17" cy="17" r="3.2" />
      </svg>
    </span>
  );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${actif ? actif.nom : "Tous les établissements"}. Changer d'établissement`}
        onClick={() => ouvrir()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          annulerAppui();
          minuterie.current = setTimeout(() => ouvrir(true), APPUI_LONG_MS);
        }}
        onPointerUp={annulerAppui}
        onPointerLeave={annulerAppui}
        onPointerCancel={annulerAppui}
        onContextMenu={(e) => e.preventDefault()}
        className="pressable grid h-[52px] w-full select-none place-items-center rounded-full [-webkit-touch-callout:none]"
      >
        {actif ? <LogoEtablissement etablissement={actif} className="h-10 w-10 [--taille:2.5rem]" /> : ensemble("h-10 w-10")}
      </button>

      <dialog
        ref={dialogue}
        aria-labelledby="choix-etablissement-titre"
        className="feuille"
        onClick={(e) => {
          // Un tap sur le voile ferme la feuille, sauf le relâchement de l'appui long qui vient de l'ouvrir.
          if (e.target === e.currentTarget && !vientDOuvrir.current) fermer();
        }}
      >
        <div className="px-3 pb-3 pt-2.5">
          <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded-full bg-nuage" />
          <h2 id="choix-etablissement-titre" className="px-3 pb-2 text-xl font-bold tracking-tight">
            {plusieurs ? "Vos établissements" : "Votre établissement"}
          </h2>
          <ul className="space-y-1">
            {plusieurs && ligne(null, ensemble("h-12 w-12"), "Tous les établissements", "La vue d'ensemble")}
            {etablissements.map((e) => ligne(e.id, <LogoEtablissement etablissement={e} className="h-12 w-12 [--taille:3rem]" />, e.nom, e.adresse))}
          </ul>
          {!plusieurs && (
            <p className="px-3 pb-1 pt-3 text-[15px] leading-snug text-encre-douce">
              Si vous avez d&apos;autres établissements, ils apparaîtront ici dès que leur fiche Google sera connectée.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
