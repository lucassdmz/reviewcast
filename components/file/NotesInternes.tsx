"use client";

import { useActionState } from "react";
import { actionAjouterNote, actionSupprimerNote, type EtatAction } from "@/app/(app)/a-traiter/actions";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Notes privées sur un avis (« client rappelé le 3/10 »). Jamais publiées. */
export function NotesInternes({ reviewId, notes }: { reviewId: string; notes: { id: string; texte: string; date: Date }[] }) {
  const [etat, ajouter, enCours] = useActionState(actionAjouterNote, {} as EtatAction);
  return (
    <section aria-labelledby="notes-titre" className="bloc">
      <h2 id="notes-titre" className="text-sm font-semibold text-encre-douce">
        Notes internes
      </h2>
      {notes.length > 0 && (
        <ul className="mt-2 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p>{n.texte}</p>
                <p className="text-xs text-encre-douce">{formatDate.format(n.date)}</p>
              </div>
              <form action={actionSupprimerNote}>
                <input type="hidden" name="reviewId" value={reviewId} />
                <input type="hidden" name="noteId" value={n.id} />
                <button type="submit" aria-label={`Supprimer la note : ${n.texte}`} className="text-xs text-encre-douce hover:underline">
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={ajouter} className="mt-3 flex gap-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <label htmlFor="note-interne" className="sr-only">
          Nouvelle note
        </label>
        <input
          id="note-interne"
          name="texte"
          key={notes.length}
          placeholder="Ajouter une note privée…"
          maxLength={2000}
          disabled={enCours}
          className="min-w-0 flex-1 rounded-2xl border border-nuage bg-fond px-3 py-2 text-sm focus:border-encre focus:outline-none"
        />
        <button type="submit" disabled={enCours} className="rounded-full bg-nuage font-medium px-3 py-2 text-sm hover:opacity-60 disabled:opacity-50">
          Ajouter
        </button>
      </form>
      {etat.erreur && (
        <p role="alert" className="mt-2 text-sm">
          {etat.erreur}
        </p>
      )}
    </section>
  );
}
