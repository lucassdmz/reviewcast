"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decrireElement, elementSignificatif, resumerElement, type ElementDesigne } from "@/lib/retours/element";

export const ATTRIBUT_BULLE = "data-retours-bulle";
/** Hauteur occupée par le bandeau d'aide en haut de l'écran, en pixels. */
const HAUTEUR_BANDEAU = 150;

function dansLaBulle(el: Element): boolean {
  return el.closest(`[${ATTRIBUT_BULLE}]`) !== null;
}

function cadre(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, largeur: r.width, hauteur: r.height };
}

/**
 * Mode « montrer du doigt » : un voile transparent couvre l'écran, l'élément
 * sous le doigt (ou la souris) s'entoure de vert, un appui le retient, puis
 * le testeur valide. Rien de la page n'est déclenché pendant ce temps.
 */
export function Designateur({
  onChoisi,
  onAnnuler,
}: {
  onChoisi: (element: Element, description: ElementDesigne) => void;
  onAnnuler: () => void;
}) {
  const voile = useRef<HTMLDivElement>(null);
  const [vise, setVise] = useState<Element | null>(null);
  const [retenu, setRetenu] = useState(false);
  const [, redessiner] = useState(0);

  // Le doigt traverse le voile et le bandeau d'aide : seul compte ce qu'il y a dessous, dans la page.
  const sousLeDoigt = useCallback((x: number, y: number): Element | null => {
    const touche = document.elementsFromPoint(x, y).find((el) => el !== voile.current && !dansLaBulle(el));
    return touche ? elementSignificatif(touche) : null;
  }, []);

  // L'entourage suit la page si elle défile ou change de taille.
  useEffect(() => {
    const suivre = () => redessiner((n) => n + 1);
    window.addEventListener("scroll", suivre, { passive: true });
    window.addEventListener("resize", suivre);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onAnnuler();
    window.addEventListener("keydown", echap);
    return () => {
      window.removeEventListener("scroll", suivre);
      window.removeEventListener("resize", suivre);
      window.removeEventListener("keydown", echap);
    };
  }, [onAnnuler]);

  const zone = vise?.isConnected ? cadre(vise) : null;
  const description = vise && zone ? decrireElement(vise, zone) : null;
  // Le bandeau descend en bas de l'écran quand l'élément visé est en haut, pour ne pas le cacher.
  const enBas = zone !== null && zone.y < HAUTEUR_BANDEAU;

  return (
    <>
      <div
        ref={voile}
        data-testid="retours-voile"
        className="fixed inset-0 z-[70] cursor-crosshair"
        style={{ touchAction: "none" }}
        onPointerMove={(e) => {
          if (retenu && e.pointerType !== "mouse") return;
          if (!retenu) setVise(sousLeDoigt(e.clientX, e.clientY));
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          setVise(sousLeDoigt(e.clientX, e.clientY));
          setRetenu(false);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          const el = sousLeDoigt(e.clientX, e.clientY);
          if (el) {
            setVise(el);
            setRetenu(true);
          }
        }}
        onWheel={(e) => window.scrollBy(0, e.deltaY)}
      />
      {zone && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[71] rounded-xl transition-all duration-100"
          style={{
            left: zone.x - 4,
            top: zone.y - 4,
            width: zone.largeur + 8,
            height: zone.hauteur + 8,
            boxShadow: "0 0 0 3px var(--matcha-vif), 0 0 0 5px var(--trait)",
            background: "color-mix(in srgb, var(--matcha-vif) 14%, transparent)",
          }}
        />
      )}
      <div
        {...{ [ATTRIBUT_BULLE]: "" }}
        role="dialog"
        aria-label="Montrer un élément"
        className={`pointer-events-none fixed inset-x-3 z-[72] mx-auto max-w-md rounded-2xl bg-surface p-3 sticker ${
          enBas ? "bottom-[max(0.75rem,env(safe-area-inset-bottom))]" : "top-[max(0.75rem,env(safe-area-inset-top))]"
        }`}
      >
        <p className="text-sm font-semibold">
          {retenu && description ? "C’est bien celui-ci ?" : "Touchez l’élément qui pose problème"}
        </p>
        <p className="mt-0.5 min-h-5 text-sm text-encre-douce">
          {description ? resumerElement(description) : "Un bouton, une carte, un titre…"}
        </p>
        <div className="pointer-events-auto mt-2 flex gap-2">
          <button type="button" onClick={onAnnuler} className="pressable cible flex-1 justify-center rounded-full border-2 border-trait px-3 text-sm font-semibold">
            Annuler
          </button>
          <button
            type="button"
            disabled={!retenu || !vise || !description}
            onClick={() => vise && description && onChoisi(vise, description)}
            className="pressable cible flex-1 justify-center rounded-full bouton-principal px-3 text-sm disabled:opacity-40"
          >
            Valider
          </button>
        </div>
      </div>
    </>
  );
}
