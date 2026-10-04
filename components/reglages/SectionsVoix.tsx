import type { ReactNode } from "react";
import {
  actionAjouterRegle,
  actionEnregistrerApprentissage,
  actionEnregistrerSignature,
  actionEnregistrerSujets,
  actionEnregistrerTon,
  actionRetirerCorrection,
  actionRetirerRegle,
} from "@/app/(app)/reglages/actions";
import { BoutonAction } from "@/components/BoutonAction";
import { NB_CORRECTIONS_UTILISEES } from "@/lib/voix/apprentissage";
import {
  EMOJIS_PROPOSES,
  LIBELLES_LONGUEUR,
  LIBELLES_PERSONNE,
  LIBELLES_REGISTRE,
  LONGUEURS,
  NB_EMOJIS_MAX,
  NB_REGLES_MAX,
  PERSONNES,
  REGISTRES,
  type Voix,
} from "@/lib/voix/reglages";
import type { CorrectionRetenue, SujetSansRegle } from "@/lib/voix/service";
import { avecSignature } from "@/lib/voix/signature";
import { SelecteurEmojis } from "./SelecteurEmojis";

/**
 * Les réglages de la voix (section 12 du cdc), un écran par sujet : chaque
 * écran tient sur un téléphone, porte une seule question et son propre bouton
 * d'enregistrement. Formulaires serveur, sans logique métier.
 */

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

const CHAMP = "mt-3 w-full rounded-2xl border border-nuage bg-fond px-3.5 py-3 text-base leading-snug focus:border-encre focus:outline-none";
const AIDE = "mt-1 text-[15px] leading-snug text-encre-douce";
const OPTION =
  "pressable flex cursor-pointer items-center gap-3 rounded-2xl bg-fond px-4 py-3.5 has-checked:bg-encre has-checked:text-fond has-focus-visible:ring-2 has-focus-visible:ring-encre";

/** Une question et sa réponse, dans une carte. */
function Carte({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <div className="bloc">
      <h2 className="text-lg font-bold leading-tight">{titre}</h2>
      {aide && <p className={AIDE}>{aide}</p>}
      {children}
    </div>
  );
}

/** Liste de choix exclusifs, un par ligne : le choix actif passe en noir. */
function Choix<T extends string>({ nom, valeur, options }: { nom: string; valeur: T; options: { valeur: T; titre: string; detail: string }[] }) {
  return (
    <div className="mt-3 space-y-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.valeur} className={OPTION}>
          <input type="radio" name={nom} value={o.valeur} defaultChecked={valeur === o.valeur} className="sr-only" />
          <span className="min-w-0">
            <span className="block font-bold leading-tight">{o.titre}</span>
            <span className="block text-sm leading-snug opacity-75">{o.detail}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Enregistrer() {
  return (
    <BoutonAction enCours="Enregistrement…" className="pressable w-full rounded-full bg-encre px-4 py-3.5 text-base font-bold text-fond">
      Enregistrer
    </BoutonAction>
  );
}

export function FormulaireSignature({ locationId, etablissement, voix }: { locationId: string; etablissement: string; voix: Voix }) {
  return (
    <form action={actionEnregistrerSignature} className="space-y-3">
      <input type="hidden" name="locationId" value={locationId} />
      <Carte titre="Votre signature" aide="Elle est ajoutée à la fin de chaque réponse. Laissez vide pour ne pas signer.">
        <label htmlFor="signature" className="sr-only">
          Signature
        </label>
        <input id="signature" name="signature" type="text" maxLength={80} defaultValue={voix.signature ?? ""} placeholder={`Valentine, ${etablissement}`} className={CHAMP} />
        <p className="mt-4 text-sm text-encre-douce">Aujourd&apos;hui, une réponse se termine ainsi :</p>
        <p className="mt-1.5 whitespace-pre-line rounded-2xl bg-soleil-doux px-3.5 py-3 text-[15px] leading-snug">
          {avecSignature("Merci pour votre visite, au plaisir de vous revoir très vite.", voix.signature)}
        </p>
      </Carte>
      <Carte titre="Pour poursuivre l'échange" aide="L'e-mail ou le téléphone à donner à un client. Sans coordonnées, la réponse l'invite à repasser au comptoir.">
        <label htmlFor="contact" className="sr-only">
          Coordonnées
        </label>
        <input id="contact" name="contact" type="text" maxLength={120} defaultValue={voix.contact ?? ""} placeholder="bonjour@moncafe.fr" className={CHAMP} />
      </Carte>
      <Enregistrer />
    </form>
  );
}

export function FormulaireTon({ locationId, voix }: { locationId: string; voix: Voix }) {
  return (
    <form action={actionEnregistrerTon} className="space-y-3">
      <input type="hidden" name="locationId" value={locationId} />
      <Carte titre="Qui parle ?">
        <Choix nom="personne" valeur={voix.personne} options={PERSONNES.map((p) => ({ valeur: p, titre: LIBELLES_PERSONNE[p].titre, detail: LIBELLES_PERSONNE[p].exemple }))} />
      </Carte>
      <Carte titre="Sur quel ton ?">
        <Choix nom="registre" valeur={voix.registre} options={REGISTRES.map((r) => ({ valeur: r, titre: LIBELLES_REGISTRE[r].titre, detail: LIBELLES_REGISTRE[r].description }))} />
      </Carte>
      <Carte titre="Quelle longueur ?">
        <Choix nom="longueur" valeur={voix.longueur} options={LONGUEURS.map((l) => ({ valeur: l, titre: LIBELLES_LONGUEUR[l].titre, detail: LIBELLES_LONGUEUR[l].description }))} />
      </Carte>
      <div className="bloc">
        <SelecteurEmojis propositions={EMOJIS_PROPOSES} initiaux={voix.emojis} max={NB_EMOJIS_MAX} />
      </div>
      <Enregistrer />
    </form>
  );
}

export function FormulaireSujets({ locationId, voix, suggestions }: { locationId: string; voix: Voix; suggestions: SujetSansRegle[] }) {
  return (
    <form action={actionEnregistrerSujets} className="space-y-3">
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="nbRegles" value={voix.regles.length} />
      {voix.regles.map((r, i) => (
        <details key={`${i}-${r.sujet}`} className="bloc group" open={!r.dire && !r.nePasDire}>
          <summary className="pressable flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-tight">{r.sujet}</span>
              <span className="mt-0.5 block truncate text-sm text-encre-douce group-open:hidden">{r.dire || "À remplir"}</span>
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-encre-douce transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </summary>
          <input type="hidden" name={`regle-${i}-themes`} value={r.themes.join(",")} />
          <input type="hidden" name={`regle-${i}-sujet`} value={r.sujet} />
          <label htmlFor={`regle-${i}-dire`} className="mt-4 block font-bold">
            Ce que je veux dire
          </label>
          <textarea id={`regle-${i}-dire`} name={`regle-${i}-dire`} rows={4} maxLength={400} defaultValue={r.dire} className={`${CHAMP} mt-2`} />
          <label htmlFor={`regle-${i}-nePasDire`} className="mt-4 block font-bold">
            Ce que je ne veux pas dire
          </label>
          <textarea id={`regle-${i}-nePasDire`} name={`regle-${i}-nePasDire`} rows={3} maxLength={400} defaultValue={r.nePasDire} className={`${CHAMP} mt-2`} />
          <BoutonAction formAction={actionRetirerRegle.bind(null, i)} className="pressable cible mt-1 text-sm text-encre-douce underline underline-offset-4">
            Retirer ce sujet
          </BoutonAction>
        </details>
      ))}

      {suggestions.length > 0 && voix.regles.length < NB_REGLES_MAX && (
        <Carte titre="Sujets à ajouter" aide="Ils reviennent dans vos avis et n'ont pas encore de règle.">
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <BoutonAction key={s.theme} formAction={actionAjouterRegle.bind(null, s.theme)} className="pressable rounded-full bg-nuage px-3.5 py-2 text-sm font-medium">
                + {s.theme} ({s.nombre} avis)
              </BoutonAction>
            ))}
          </div>
        </Carte>
      )}

      <Carte titre="Mots à éviter" aide="Les mots ou tournures que vous ne voulez jamais lire dans vos réponses, séparés par des virgules.">
        <label htmlFor="motsEvites" className="sr-only">
          Mots à éviter
        </label>
        <textarea id="motsEvites" name="motsEvites" rows={2} defaultValue={voix.motsEvites.join(", ")} placeholder="la direction, malheureusement" className={CHAMP} />
      </Carte>
      <Enregistrer />
    </form>
  );
}

export function FormulaireApprentissage({ locationId, voix, corrections }: { locationId: string; voix: Voix; corrections: CorrectionRetenue[] }) {
  return (
    <form action={actionEnregistrerApprentissage} className="space-y-3">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="bloc">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-lg font-bold leading-tight">Apprendre de mes corrections</span>
          <input type="checkbox" name="apprendreCorrections" defaultChecked={voix.apprendreCorrections} className="peer sr-only" />
          <span
            aria-hidden="true"
            className="relative h-8 w-14 shrink-0 rounded-full bg-ciel-fonce transition-colors after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-surface after:transition-transform peer-checked:bg-matcha peer-checked:after:translate-x-6 peer-focus-visible:ring-2 peer-focus-visible:ring-encre"
          />
        </label>
        <p className="mt-3 text-[15px] leading-snug text-encre-douce">
          Quand vous réécrivez un brouillon avant de le publier, Éclaircie retient votre version et s&apos;en inspire pour les suivants. Plus vous
          corrigez, plus les brouillons vous ressemblent.
        </p>
        <p className="mt-2 text-sm leading-snug text-encre-douce">
          Les {NB_CORRECTIONS_UTILISEES} dernières corrections sont utilisées. Elles ne sont envoyées qu&apos;au fournisseur IA choisi.
        </p>
      </div>
      <Enregistrer />

      <div className="pt-4">
        <h2 className="px-1 text-lg font-bold">Corrections retenues</h2>
        {corrections.length === 0 ? (
          <p className="mt-1 px-1 text-[15px] leading-snug text-encre-douce">
            Aucune pour l&apos;instant. La prochaine fois que vous réécrirez un brouillon avant de le publier, votre version apparaîtra ici.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {corrections.map((c) => (
              <li key={c.id} className="bloc">
                <p className="text-sm text-encre-douce">
                  Réponse à {c.auteurAvis}, le {formatDate.format(c.date)}
                </p>
                <p className="mt-2 line-clamp-5 whitespace-pre-line text-[15px] leading-snug">{c.texte}</p>
                <BoutonAction formAction={actionRetirerCorrection.bind(null, c.id)} className="pressable cible mt-1 text-sm underline underline-offset-4">
                  Ne plus s&apos;en inspirer
                </BoutonAction>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
