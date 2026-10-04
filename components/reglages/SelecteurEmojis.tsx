"use client";

import { useState } from "react";

/**
 * Choix des emojis que l'IA a le droit d'utiliser. Le tableau s'ouvre, on
 * touche ceux qu'on autorise, dans la limite de `max`. Aucun emoji choisi :
 * les réponses n'en contiennent pas. Les choix partent avec le formulaire
 * dans des champs cachés nommés `emojis`.
 */
export function SelecteurEmojis({ propositions, initiaux, max }: { propositions: readonly string[]; initiaux: string[]; max: number }) {
  const [choisis, setChoisis] = useState<string[]>(initiaux.filter((e) => propositions.includes(e)).slice(0, max));
  const [ouvert, setOuvert] = useState(false);
  const plein = choisis.length >= max;

  const basculer = (emoji: string) =>
    setChoisis((actuels) => (actuels.includes(emoji) ? actuels.filter((e) => e !== emoji) : actuels.length >= max ? actuels : [...actuels, emoji]));

  return (
    <div>
      {choisis.map((e) => (
        <input key={e} type="hidden" name="emojis" value={e} />
      ))}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">Emojis autorisés</p>
          {choisis.length === 0 ? (
            <p className="mt-0.5 text-sm text-encre-douce">Aucun : vos réponses n&apos;en contiennent pas.</p>
          ) : (
            <p className="mt-1 text-2xl leading-none tracking-widest" aria-label={`${choisis.length} emojis autorisés`}>
              {choisis.join("")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="tableau-emojis"
          className="pressable shrink-0 rounded-full bg-nuage px-4 py-2 text-sm font-medium"
        >
          {ouvert ? "Fermer" : choisis.length === 0 ? "Choisir" : "Modifier"}
        </button>
      </div>

      {ouvert && (
        <div id="tableau-emojis" className="mt-3 rounded-2xl bg-fond p-3">
          <p className="text-sm text-encre-douce">
            Touchez ceux que vous autorisez. {choisis.length} sur {max}
            {plein ? " : retirez-en un pour en choisir un autre." : "."}
          </p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {propositions.map((e) => {
              const actif = choisis.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => basculer(e)}
                  aria-pressed={actif}
                  aria-label={`Emoji ${e}`}
                  disabled={!actif && plein}
                  className={`pressable flex aspect-square items-center justify-center rounded-2xl text-2xl ${
                    actif ? "bg-surface shadow-[inset_0_0_0_2px_var(--encre)]" : "bg-surface disabled:opacity-35"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-encre-douce">L&apos;IA en utilise un seul par réponse, et jamais sur un avis difficile.</p>
        </div>
      )}
    </div>
  );
}
