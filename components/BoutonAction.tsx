"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Bouton d'envoi d'un formulaire serveur. Dès l'appui, il se grise, affiche un
 * indicateur et ne peut plus être touché une seconde fois : on sait que
 * l'action est partie, même si la réponse met un moment à revenir.
 */
export function BoutonAction({
  children,
  className,
  formAction,
  enCours,
}: {
  children: ReactNode;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  /** Libellé pendant l'envoi. Par défaut, le libellé d'origine reste affiché à côté de l'indicateur. */
  enCours?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:opacity-60`}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {pending && enCours ? enCours : children}
      </span>
    </button>
  );
}
