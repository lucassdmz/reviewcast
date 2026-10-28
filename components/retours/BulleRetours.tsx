"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as EvenementPointeur } from "react";
import { actionEnvoyerRetour, actionListerRetours, actionRetirerRetour } from "@/app/(app)/retours/actions";
import { capturerEcran } from "@/lib/retours/capture";
import { reconnaitreEcran } from "@/lib/retours/ecrans";
import { resumerElement, type ElementDesigne } from "@/lib/retours/element";
import {
  estGlissement,
  lirePreferences,
  placerApresGlissement,
  type EtatBulle,
  type PreferencesBulle,
} from "@/lib/retours/preferences";
import type { RetourAffiche } from "@/lib/retours/service";
import type { ContexteRetour } from "@/lib/retours/validation";
import { ATTRIBUT_BULLE, Designateur } from "./Designateur";

const CLE_PREFERENCES = "eclaircie.retours.bulle";
const CLE_APPAREIL = "eclaircie.retours.appareil";
const CLE_BROUILLON = "eclaircie.retours.brouillon:";
const SUR_LE_SERVEUR = "\u0000serveur";

/* Le stockage du navigateur peut être absent (navigation privée, données effacées) : la bulle marche sans. */
function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle: string, valeur: string | null): void {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    // Rien à faire : la préférence vaudra pour cette visite seulement.
  }
}

/* Préférences de la bulle : lues dans le stockage du navigateur, partagées entre onglets. */
const auditeursPreferences = new Set<() => void>();
function abonnerPreferences(prevenir: () => void): () => void {
  auditeursPreferences.add(prevenir);
  window.addEventListener("storage", prevenir);
  return () => {
    auditeursPreferences.delete(prevenir);
    window.removeEventListener("storage", prevenir);
  };
}
function lirePreferencesBrutes(): string | null {
  return lire(CLE_PREFERENCES);
}

function identifiantAppareil(): string {
  const connu = lire(CLE_APPAREIL);
  if (connu) return connu;
  const nouveau = crypto.randomUUID();
  ecrire(CLE_APPAREIL, nouveau);
  return nouveau;
}

function contexteActuel(): ContexteRetour {
  const choisi = document.documentElement.dataset.theme;
  const sombre = choisi === "sombre" || (choisi === "systeme" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    largeur: window.innerWidth,
    hauteur: window.innerHeight,
    ratioPixels: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    defilement: Math.max(0, Math.round(window.scrollY)),
    theme: sombre ? "sombre" : "clair",
    navigateur: navigator.userAgent.slice(0, 400),
  };
}

function exclureBulle(n: Node): boolean {
  return n instanceof Element && n.hasAttribute(ATTRIBUT_BULLE);
}

const LIBELLES_STATUT: Record<RetourAffiche["statut"], { texte: string; classe: string }> = {
  ouvert: { texte: "Noté", classe: "bg-nuage text-encre" },
  traite: { texte: "Corrigé", classe: "bg-matcha-doux text-matcha" },
  ecarte: { texte: "Laissé de côté", classe: "bg-nuage text-encre-douce" },
};

type Envoi = { etape: "repos" } | { etape: "capture" } | { etape: "envoi" } | { etape: "envoye" } | { etape: "erreur"; message: string };

const Icone = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const BULLE = "M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H11l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z";
const CIBLE = "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z";

/**
 * Bulle de retours de la bêta, présente sur tous les écrans quand
 * `RETOURS_BETA=1` : le testeur écrit ce qui ne va pas, peut montrer
 * l'élément en cause, et la remarque part avec l'adresse de l'écran, une
 * capture et le contexte (taille, thème, version). Elle se réduit en
 * pastille, se range contre un bord et se glisse où elle gêne le moins.
 */
export function BulleRetours() {
  const pathname = usePathname();
  const parametres = useSearchParams().toString();
  const chemin = parametres ? `${pathname}?${parametres}` : pathname;
  const preferencesBrutes = useSyncExternalStore(abonnerPreferences, lirePreferencesBrutes, () => SUR_LE_SERVEUR);
  const prefs = lirePreferences(preferencesBrutes === SUR_LE_SERVEUR ? null : preferencesBrutes);

  // Ce qui appartient à un écran (brouillon, élément montré, état de l'envoi) repart de zéro à chaque changement d'écran.
  const [ecranSaisi, setEcranSaisi] = useState(chemin);
  const [texte, setTexte] = useState(() => lire(CLE_BROUILLON + chemin) ?? "");
  const [element, setElement] = useState<{ noeud: Element; description: ElementDesigne } | null>(null);
  const [envoi, setEnvoi] = useState<Envoi>({ etape: "repos" });
  if (ecranSaisi !== chemin) {
    setEcranSaisi(chemin);
    setTexte(lire(CLE_BROUILLON + chemin) ?? "");
    setElement(null);
    setEnvoi({ etape: "repos" });
  }

  const [designation, setDesignation] = useState(false);
  const [joindreCapture, setJoindreCapture] = useState(true);
  const [remarques, setRemarques] = useState<{ chemin: string; liste: RetourAffiche[] }>({ chemin, liste: [] });
  const [glisse, setGlisse] = useState<{ x: number; y: number } | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);

  const changer = (modif: Partial<PreferencesBulle>) => {
    ecrire(CLE_PREFERENCES, JSON.stringify({ ...prefs, ...modif }));
    for (const prevenir of auditeursPreferences) prevenir();
  };
  const passerA = (etat: EtatBulle) => changer({ etat });

  const recharger = useCallback(async (c: string) => {
    const liste = await actionListerRetours(c, identifiantAppareil());
    setRemarques({ chemin: c, liste });
  }, []);

  // Les remarques déjà laissées sur cet écran : la pastille en affiche le nombre.
  const monte = preferencesBrutes !== SUR_LE_SERVEUR;
  useEffect(() => {
    if (!monte) return;
    let actuel = true;
    actionListerRetours(chemin, identifiantAppareil()).then((liste) => actuel && setRemarques({ chemin, liste }));
    return () => {
      actuel = false;
    };
  }, [chemin, monte]);
  const retours = remarques.chemin === chemin ? remarques.liste : [];

  const saisir = (valeur: string) => {
    setTexte(valeur);
    ecrire(CLE_BROUILLON + chemin, valeur.trim() ? valeur : null);
    if (envoi.etape === "envoye" || envoi.etape === "erreur") setEnvoi({ etape: "repos" });
  };

  const envoyer = async () => {
    if (texte.trim().length < 2) {
      setEnvoi({ etape: "erreur", message: "Écrivez quelques mots." });
      return;
    }
    let description = element?.description ?? null;
    if (element?.noeud.isConnected) {
      const r = element.noeud.getBoundingClientRect();
      description = { ...element.description, rect: { x: Math.round(r.left), y: Math.round(r.top), largeur: Math.round(r.width), hauteur: Math.round(r.height) } };
    }
    let capture: Blob | null = null;
    if (joindreCapture) {
      setEnvoi({ etape: "capture" });
      capture = await capturerEcran(exclureBulle, description?.rect ?? null);
    }
    setEnvoi({ etape: "envoi" });
    const donnees = new FormData();
    donnees.set("donnees", JSON.stringify({ texte, chemin, appareil: identifiantAppareil(), element: description, contexte: contexteActuel() }));
    if (capture) donnees.set("capture", new File([capture], "capture.jpg", { type: "image/jpeg" }));
    try {
      const resultat = await actionEnvoyerRetour(donnees);
      if (!resultat.ok) {
        setEnvoi({ etape: "erreur", message: resultat.erreur });
        return;
      }
      setTexte("");
      ecrire(CLE_BROUILLON + chemin, null);
      setElement(null);
      setEnvoi({ etape: "envoye" });
      await recharger(chemin);
    } catch {
      setEnvoi({ etape: "erreur", message: "L’envoi n’a pas abouti. Votre texte est gardé : réessayez dans un instant." });
    }
  };

  const retirer = async (id: string) => {
    if (await actionRetirerRetour(id, identifiantAppareil())) await recharger(chemin);
  };

  /* Glisser la pastille ou la languette : relâchée près d'un bord, elle s'y range ; tirée hors du bord, elle revient. */
  const appuyer = (e: EvenementPointeur<HTMLButtonElement>) => {
    depart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const deplacer = (e: EvenementPointeur<HTMLButtonElement>) => {
    if (!depart.current) return;
    const ici = { x: e.clientX, y: e.clientY };
    if (glisse || estGlissement(depart.current, ici)) setGlisse(ici);
  };
  const relacher = (e: EvenementPointeur<HTMLButtonElement>) => {
    const etaitGlisse = glisse;
    depart.current = null;
    setGlisse(null);
    if (!etaitGlisse) {
      passerA("ouverte");
      return;
    }
    changer(placerApresGlissement({ x: e.clientX, y: e.clientY }, { largeur: window.innerWidth, hauteur: window.innerHeight }, prefs.etat));
  };
  const annulerGlissement = () => {
    depart.current = null;
    setGlisse(null);
  };

  if (!monte) return null;

  const ecran = reconnaitreEcran(chemin);
  const ouverts = retours.filter((r) => r.statut === "ouvert").length;
  const occupe = envoi.etape === "capture" || envoi.etape === "envoi";
  const bord = prefs.cote === "droite" ? { right: 0 } : { left: 0 };
  // La poignée reste dans la page pendant le glissement (invisible) : c'est elle qui reçoit le relâchement du doigt.
  const poignee = { onPointerDown: appuyer, onPointerMove: deplacer, onPointerUp: relacher, onPointerCancel: annulerGlissement };

  if (designation) {
    return (
      <Designateur
        onAnnuler={() => setDesignation(false)}
        onChoisi={(noeud, description) => {
          setElement({ noeud, description });
          setDesignation(false);
        }}
      />
    );
  }

  return (
    <div {...{ [ATTRIBUT_BULLE]: "" }}>
      {glisse && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[61] grid h-[52px] w-[52px] place-items-center rounded-full bg-soleil text-sur-vif sticker"
          style={{ left: glisse.x - 26, top: glisse.y - 26 }}
        >
          <Icone d={BULLE} />
        </div>
      )}

      {prefs.etat === "reduite" && (
        <button
          type="button"
          aria-label={ouverts > 0 ? `Remarques de bêta (${ouverts} sur cet écran)` : "Remarques de bêta"}
          className="pressable fixed z-[60] mx-2.5 grid h-[52px] w-[52px] place-items-center rounded-full bg-soleil text-sur-vif sticker"
          style={{ ...bord, top: `calc(${prefs.hauteur * 100}dvh - 26px)`, touchAction: "none", opacity: glisse ? 0 : 1 }}
          {...poignee}
        >
          <Icone d={BULLE} className="h-6 w-6" />
          {ouverts > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-trait bg-surface px-1 text-[11px] font-bold text-encre">
              {ouverts}
            </span>
          )}
        </button>
      )}

      {prefs.etat === "rangee" && (
        <button
          type="button"
          aria-label="Afficher les remarques de bêta"
          className={`fixed z-[60] flex h-16 w-4 items-center justify-center bg-soleil text-sur-vif ${
            prefs.cote === "droite" ? "rounded-l-xl border-y-2 border-l-2" : "rounded-r-xl border-y-2 border-r-2"
          } border-trait`}
          style={{ ...bord, top: `calc(${prefs.hauteur * 100}dvh - 32px)`, touchAction: "none", opacity: glisse ? 0 : 1 }}
          {...poignee}
        >
          <span aria-hidden="true" className="h-7 w-[3px] rounded-full bg-sur-vif/50" />
        </button>
      )}

      {prefs.etat === "ouverte" && (
        <section
          role="dialog"
          aria-label="Remarques de bêta"
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-3 flex max-h-[calc(100dvh-7.5rem)] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-y-auto overscroll-contain rounded-3xl bg-surface p-4 sticker"
          style={bord}
        >
          <header className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="titre-display text-lg font-bold leading-tight">Une remarque ?</h2>
              <p className="mt-0.5 text-[13px] text-encre-douce">
                Écran <span className="font-semibold text-encre">{ecran.libelle}</span>
              </p>
            </div>
            <button type="button" onClick={() => passerA("rangee")} aria-label="Ranger sur le côté" title="Ranger sur le côté" className="pressable grid h-10 w-10 place-items-center rounded-full bg-nuage">
              <Icone d={prefs.cote === "droite" ? "M9 6l6 6-6 6M19 5v14" : "M15 6l-6 6 6 6M5 5v14"} className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={() => passerA("reduite")} aria-label="Réduire" title="Réduire" className="pressable grid h-10 w-10 place-items-center rounded-full bg-nuage">
              <Icone d="M6 12h12" className="h-[18px] w-[18px]" />
            </button>
          </header>

          <label className="sr-only" htmlFor="retour-texte">
            Votre remarque
          </label>
          <textarea
            id="retour-texte"
            value={texte}
            onChange={(e) => saisir(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Ce qui gêne, ce qui manque, ce qui surprend… Tout est utile."
            className="mt-3 w-full resize-none rounded-2xl border-2 border-nuage bg-fond px-3 py-2.5 text-[15px] leading-snug outline-none focus:border-trait"
          />

          {element ? (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-matcha-doux px-3 py-2 text-[13px]">
              <Icone d={CIBLE} className="h-4 w-4 shrink-0 text-matcha" />
              <span className="min-w-0 flex-1">{resumerElement(element.description)}</span>
              <button type="button" onClick={() => setElement(null)} className="cible shrink-0 px-1 font-semibold underline underline-offset-2">
                Retirer
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setDesignation(true)} className="pressable cible mt-2 gap-2 self-start rounded-full border-2 border-trait px-3.5 text-sm font-semibold">
              <Icone d={CIBLE} className="h-4 w-4" />
              Montrer l’élément
            </button>
          )}

          <label className="mt-1 flex cible items-center gap-2.5 text-sm">
            <input type="checkbox" checked={joindreCapture} onChange={(e) => setJoindreCapture(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--matcha-vif)]" />
            Joindre une capture de l’écran
          </label>

          <button type="button" onClick={envoyer} disabled={occupe} aria-busy={occupe} className="pressable cible mt-1 w-full justify-center gap-2 rounded-full bouton-principal px-4 disabled:opacity-60">
            {occupe && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {envoi.etape === "capture" ? "Capture de l’écran…" : envoi.etape === "envoi" ? "Envoi…" : "Envoyer la remarque"}
          </button>

          <p role="status" className="min-h-0 text-center text-[13px]">
            {envoi.etape === "envoye" && <span className="mt-2 block font-semibold text-matcha">Merci, c’est noté.</span>}
            {envoi.etape === "erreur" && <span className="mt-2 block text-attention">{envoi.message}</span>}
          </p>

          {retours.length > 0 && (
            <div className="mt-4 border-t-2 border-nuage pt-3">
              <h3 className="intitule">Déjà noté sur cet écran</h3>
              <ul className="mt-2 space-y-2">
                {retours.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-fond px-3 py-2.5 text-[13px] leading-snug">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LIBELLES_STATUT[r.statut].classe}`}>{LIBELLES_STATUT[r.statut].texte}</span>
                      {!r.ici && <span className="text-[11px] text-encre-douce">sur une autre fiche</span>}
                      {r.mienne && r.statut === "ouvert" && (
                        <button type="button" onClick={() => retirer(r.id)} className="ml-auto text-[12px] font-semibold text-encre-douce underline underline-offset-2">
                          Retirer
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 whitespace-pre-line">{r.texte}</p>
                    {r.element && <p className="mt-1 text-[12px] text-encre-douce">Élément : {r.element}</p>}
                    {r.reponse && <p className="mt-1.5 rounded-xl bg-surface px-2.5 py-1.5 text-[12px]">{r.reponse}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
