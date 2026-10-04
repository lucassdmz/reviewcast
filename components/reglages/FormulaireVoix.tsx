import type { ReactNode } from "react";
import { actionAjouterRegle, actionEnregistrerVoix, actionRetirerCorrection, actionRetirerRegle } from "@/app/(app)/reglages/actions";
import { NB_CORRECTIONS_UTILISEES } from "@/lib/voix/apprentissage";
import type { ApercuVoix } from "@/lib/voix/apercu";
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

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

const CHOIX =
  "pressable flex-1 cursor-pointer rounded-2xl bg-fond px-3 py-2.5 text-center has-checked:bg-encre has-checked:text-fond has-focus-visible:ring-2 has-focus-visible:ring-encre";
const CHAMP = "mt-2 w-full rounded-2xl border border-nuage bg-fond px-3.5 py-3 text-[15px] leading-snug focus:border-encre focus:outline-none";
const AIDE = "mt-0.5 text-sm leading-snug text-encre-douce";

/** Une section de réglages : un titre et une phrase hors de la carte, puis la carte et ses lignes. */
function Section({ id, titre, intro, children }: { id: string; titre: string; intro: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titre`} id={id} className="scroll-mt-4">
      <h2 id={`${id}-titre`} className="px-1 text-xl font-bold tracking-tight">
        {titre}
      </h2>
      <p className="mt-0.5 px-1 text-sm leading-snug text-encre-douce">{intro}</p>
      <div className="bloc mt-3 divide-y divide-nuage [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">{children}</div>
    </section>
  );
}

/**
 * La voix de l'établissement (section 12 du cdc), rangée par importance :
 * la signature, le ton, les sujets, puis l'apprentissage. Un seul bouton
 * d'enregistrement, toujours visible. Formulaire serveur, sans logique métier.
 */
export function FormulaireVoix({
  locationId,
  etablissement,
  voix,
  corrections,
  suggestions,
  apercu,
  simule,
}: {
  locationId: string;
  etablissement: string;
  voix: Voix;
  corrections: CorrectionRetenue[];
  suggestions: SujetSansRegle[];
  apercu: ApercuVoix | null;
  simule: boolean;
}) {
  const exempleSignature = avecSignature("Merci pour votre visite, au plaisir de vous revoir très vite.", voix.signature);
  return (
    <div className="space-y-8">
      <form action={actionEnregistrerVoix} className="space-y-8">
        <input type="hidden" name="locationId" value={locationId} />
        <input type="hidden" name="nbRegles" value={voix.regles.length} />

        <Section id="signature-section" titre="Votre signature" intro="Ce que vos clients lisent à la fin de chaque réponse.">
          <div>
            <label htmlFor="signature" className="font-bold">
              Signature
            </label>
            <input id="signature" name="signature" type="text" maxLength={80} defaultValue={voix.signature ?? ""} placeholder={`Valentine, ${etablissement}`} className={CHAMP} />
            <p className="mt-2 text-xs text-encre-douce">Exemple de fin de réponse :</p>
            <p className="mt-1 whitespace-pre-line rounded-2xl bg-fond px-3.5 py-3 text-sm leading-snug text-encre-douce">{exempleSignature}</p>
          </div>
          <div>
            <label htmlFor="contact" className="font-bold">
              Pour poursuivre l&apos;échange
            </label>
            <p className={AIDE}>L&apos;e-mail ou le téléphone à proposer à un client. Sans coordonnées, la réponse l&apos;invite à repasser au comptoir.</p>
            <input id="contact" name="contact" type="text" maxLength={120} defaultValue={voix.contact ?? ""} placeholder="bonjour@moncafe.fr" className={CHAMP} />
          </div>
        </Section>

        <Section id="ton-section" titre="Votre ton" intro="La façon dont les réponses sont écrites.">
          <fieldset>
            <legend className="font-bold">Qui parle ?</legend>
            <div className="mt-2 flex gap-2">
              {PERSONNES.map((p) => (
                <label key={p} className={CHOIX}>
                  <input type="radio" name="personne" value={p} defaultChecked={voix.personne === p} className="sr-only" />
                  <span className="block font-bold">{LIBELLES_PERSONNE[p].titre}</span>
                  <span className="block text-xs opacity-75">{LIBELLES_PERSONNE[p].exemple}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-bold">Registre</legend>
            <div className="mt-2 space-y-2">
              {REGISTRES.map((r) => (
                <label
                  key={r}
                  className="pressable flex cursor-pointer items-baseline gap-2 rounded-2xl bg-fond px-3.5 py-3 has-checked:bg-encre has-checked:text-fond has-focus-visible:ring-2 has-focus-visible:ring-encre"
                >
                  <input type="radio" name="registre" value={r} defaultChecked={voix.registre === r} className="sr-only" />
                  <span className="w-24 shrink-0 font-bold">{LIBELLES_REGISTRE[r].titre}</span>
                  <span className="text-sm opacity-75">{LIBELLES_REGISTRE[r].description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-bold">Longueur</legend>
            <div className="mt-2 flex gap-2">
              {LONGUEURS.map((l) => (
                <label key={l} className={CHOIX}>
                  <input type="radio" name="longueur" value={l} defaultChecked={voix.longueur === l} className="sr-only" />
                  <span className="block font-bold">{LIBELLES_LONGUEUR[l].titre}</span>
                  <span className="block text-xs opacity-75">{LIBELLES_LONGUEUR[l].description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <SelecteurEmojis propositions={EMOJIS_PROPOSES} initiaux={voix.emojis} max={NB_EMOJIS_MAX} />
        </Section>

        <Section id="sujets" titre="Vos sujets" intro="Ce que vous voulez répondre quand un sujet revient. Les brouillons s'y tiennent.">
          <div>
            <div className="space-y-2">
              {voix.regles.map((r, i) => (
                <details key={`${i}-${r.sujet}`} className="group rounded-2xl bg-fond px-3.5 py-3" open={!r.dire && !r.nePasDire}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold [&::-webkit-details-marker]:hidden">
                    {r.sujet}
                    <span className="flex items-center gap-1 text-xs font-normal text-encre-douce">
                      {r.dire ? "Modifier" : "À remplir"}
                      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </summary>
                  <input type="hidden" name={`regle-${i}-themes`} value={r.themes.join(",")} />
                  <label htmlFor={`regle-${i}-sujet`} className="sr-only">
                    Nom du sujet
                  </label>
                  <input id={`regle-${i}-sujet`} name={`regle-${i}-sujet`} type="text" maxLength={60} defaultValue={r.sujet} className={`${CHAMP} bg-surface`} />
                  <label htmlFor={`regle-${i}-dire`} className="mt-3 block text-sm font-medium">
                    Ce que je veux dire
                  </label>
                  <textarea id={`regle-${i}-dire`} name={`regle-${i}-dire`} rows={3} maxLength={400} defaultValue={r.dire} className={`${CHAMP} mt-1 bg-surface`} />
                  <label htmlFor={`regle-${i}-nePasDire`} className="mt-3 block text-sm font-medium">
                    Ce que je ne veux pas dire
                  </label>
                  <textarea id={`regle-${i}-nePasDire`} name={`regle-${i}-nePasDire`} rows={2} maxLength={400} defaultValue={r.nePasDire} className={`${CHAMP} mt-1 bg-surface`} />
                  <button type="submit" formAction={actionRetirerRegle.bind(null, i)} className="pressable mt-2 text-sm text-encre-douce underline underline-offset-4">
                    Retirer ce sujet
                  </button>
                </details>
              ))}
            </div>
            {suggestions.length > 0 && voix.regles.length < NB_REGLES_MAX && (
              <div className="mt-4">
                <p className="text-sm text-encre-douce">Ces sujets reviennent dans vos avis et n&apos;ont pas encore de règle :</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s.theme} type="submit" formAction={actionAjouterRegle.bind(null, s.theme)} className="pressable rounded-full bg-nuage px-3 py-1.5 text-sm font-medium">
                      + {s.theme} ({s.nombre} avis)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="motsEvites" className="font-bold">
              Mots à éviter
            </label>
            <p className={AIDE}>Les mots ou tournures que vous ne voulez jamais lire dans vos réponses, séparés par des virgules.</p>
            <textarea id="motsEvites" name="motsEvites" rows={2} defaultValue={voix.motsEvites.join(", ")} placeholder="la direction, malheureusement, n'hésitez pas" className={CHAMP} />
          </div>
        </Section>

        <Section id="apprentissage" titre="Apprentissage" intro="Éclaircie s'améliore à partir de ce que vous écrivez vous-même.">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="apprendreCorrections" defaultChecked={voix.apprendreCorrections} className="peer sr-only" />
            <span
              aria-hidden="true"
              className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-ciel-fonce transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:transition-transform peer-checked:bg-matcha peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-encre"
            />
            <span className="min-w-0">
              <span className="block font-bold">Apprendre de mes corrections</span>
              <span className="mt-0.5 block text-sm leading-snug text-encre-douce">
                Quand vous réécrivez un brouillon avant de le publier, Éclaircie retient votre version et s&apos;en inspire pour les suivants. Plus vous
                corrigez, plus les brouillons vous ressemblent.
              </span>
              <span className="mt-1.5 block text-xs leading-snug text-encre-douce">
                Les {NB_CORRECTIONS_UTILISEES} dernières corrections sont utilisées. Elles ne sont envoyées qu&apos;au fournisseur IA choisi.
              </span>
            </span>
          </label>
          <div>
            <h3 className="font-bold">Corrections retenues</h3>
            {corrections.length === 0 ? (
              <p className={AIDE}>Aucune pour l&apos;instant. La prochaine fois que vous réécrirez un brouillon avant de le publier, votre version apparaîtra ici.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {corrections.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-fond p-3.5">
                    <p className="text-xs text-encre-douce">
                      Réponse à {c.auteurAvis}, le {formatDate.format(c.date)}
                    </p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm leading-snug">{c.texte}</p>
                    <button type="submit" formAction={actionRetirerCorrection.bind(null, c.id)} className="pressable mt-2 text-sm underline underline-offset-4">
                      Ne plus s&apos;en inspirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <div className="sticky bottom-24 z-10">
          <button type="submit" className="pressable w-full rounded-full bg-encre px-4 py-3.5 text-[15px] font-bold text-fond shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)]">
            Enregistrer et voir un aperçu
          </button>
        </div>
        {simule && (
          <p className="px-1 text-xs leading-snug text-encre-douce">
            Mode démonstration : la signature, « je » ou « nous », la longueur, les coordonnées, la règle du sujet concerné et l&apos;emoji des
            remerciements s&apos;appliquent tout de suite. Le registre, les mots à éviter et les corrections retenues prendront effet avec le vrai
            modèle.
          </p>
        )}
      </form>

      {apercu && (
        <section id="apercu" aria-labelledby="apercu-titre" className="scroll-mt-4">
          <h2 id="apercu-titre" className="px-1 text-xl font-bold tracking-tight">
            Aperçu avec vos réglages
          </h2>
          <p className="mt-0.5 px-1 text-sm leading-snug text-encre-douce">
            Sur l&apos;avis de {apercu.auteur} ({apercu.note} étoile{apercu.note > 1 ? "s" : ""}) : « {apercu.extrait} »
          </p>
          <p className="mt-3 whitespace-pre-line rounded-3xl bg-soleil-doux p-5 text-[15px] leading-snug">{apercu.reponse}</p>
          <p className="mt-2 px-1 text-xs text-encre-douce">Cet aperçu n&apos;est pas enregistré et ne remplace pas le brouillon de cet avis.</p>
        </section>
      )}
    </div>
  );
}
