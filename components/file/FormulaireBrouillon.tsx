"use client";

import { useActionState } from "react";
import { actionEnregistrerBrouillon, actionPreparerPublication, actionRegenerer, type EtatAction } from "@/app/(app)/a-traiter/actions";
import { CONSIGNES_RAPIDES } from "@/lib/file/validation";

const initial: EtatAction = {};

/**
 * Brouillon éditable : enregistrer, régénérer avec une consigne, ou passer à
 * l'écran de confirmation. Aucune publication ne part d'ici.
 */
export function FormulaireBrouillon({
  reviewId,
  texte,
  version,
  signature,
  motsEvites,
}: {
  reviewId: string;
  texte: string;
  version: number;
  signature: string | null;
  motsEvites: string[];
}) {
  const [etatEnregistrer, enregistrer, enregistrement] = useActionState(actionEnregistrerBrouillon, initial);
  const [etatRegenerer, regenerer, regeneration] = useActionState(actionRegenerer, initial);
  const occupe = enregistrement || regeneration;
  const erreur = etatEnregistrer.erreur ?? etatRegenerer.erreur;

  return (
    <section aria-labelledby="brouillon-titre" className="bloc">
      <div className="flex items-baseline justify-between">
        <h2 id="brouillon-titre" className="text-sm font-semibold text-encre-douce">
          Brouillon de réponse
        </h2>
        <span className="text-xs text-encre-douce">version {version}</span>
      </div>

      <form id="form-brouillon" action={enregistrer} className="mt-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <label htmlFor="texte-brouillon" className="sr-only">
          Texte de la réponse
        </label>
        <textarea
          id="texte-brouillon"
          name="texte"
          key={`${version}-${texte.length}`}
          defaultValue={texte}
          rows={7}
          disabled={occupe}
          className="w-full rounded-2xl border border-nuage bg-fond p-3 text-sm leading-snug focus:border-encre focus:outline-none"
        />
        <p className="mt-1.5 px-1 text-[13px] text-encre-douce">
          {signature ? (
            <>
              Signé automatiquement : <span className="font-medium text-encre">{signature}</span>
            </>
          ) : (
            "Sans signature. Vous pouvez en ajouter une dans Réglages."
          )}
        </p>
      </form>

      {motsEvites.length > 0 && (
        <p className="mt-2 rounded-2xl bg-soleil-doux px-3 py-2 text-sm">
          Ce brouillon contient {motsEvites.length > 1 ? "des mots que vous évitez" : "un mot que vous évitez"} : {motsEvites.map((m) => `« ${m} »`).join(", ")}.
        </p>
      )}

      {erreur && (
        <p role="alert" className="mt-2 rounded-2xl bg-soleil-doux px-3 py-2 text-sm">
          {erreur}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" form="form-brouillon" disabled={occupe} className="rounded-full bg-nuage font-medium px-3 py-2 text-sm font-medium hover:opacity-60 disabled:opacity-50">
          {enregistrement ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="submit"
          form="form-brouillon"
          formAction={actionPreparerPublication}
          disabled={occupe}
          className="rounded-full bg-encre px-3 py-2 text-sm font-semibold text-fond hover:opacity-90 disabled:opacity-50"
        >
          Relire et publier
        </button>
      </div>

      <form action={regenerer} className="mt-4 border-t border-nuage pt-3">
        <input type="hidden" name="reviewId" value={reviewId} />
        <p className="text-xs font-semibold text-encre-douce">Régénérer avec une consigne</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONSIGNES_RAPIDES.map((c) => (
            <button
              key={c.libelle}
              type="submit"
              name="consigne"
              value={c.consigne}
              disabled={occupe}
              className="rounded-full bg-fond px-3 py-1 text-xs hover:opacity-90 disabled:opacity-50"
            >
              {c.libelle}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <label htmlFor="consigne-libre" className="sr-only">
            Consigne libre
          </label>
          <input
            id="consigne-libre"
            name="consigne"
            placeholder="Ou une consigne libre…"
            maxLength={300}
            disabled={occupe}
            className="min-w-0 flex-1 rounded-2xl border border-nuage bg-fond px-3 py-2 text-sm focus:border-encre focus:outline-none"
          />
          <button type="submit" disabled={occupe} className="rounded-full bg-nuage font-medium px-3 py-2 text-sm hover:opacity-60 disabled:opacity-50">
            {regeneration ? "Rédaction…" : "Régénérer"}
          </button>
        </div>
      </form>
    </section>
  );
}
