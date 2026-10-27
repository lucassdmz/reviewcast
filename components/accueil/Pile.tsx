"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { actionPublierDepuisPile, actionPublierMercis } from "@/app/(app)/a-traiter/actions";
import { useAttenteReseau } from "@/components/pwa/reseau";
import type { Carte, CarteLevier, CarteMercis, CarteReconquete, CarteSourire } from "@/lib/accueil/rituel";

/**
 * La pile du matin : une carte à la fois. Chaque geste (partager, publier,
 * valider) passe à la carte suivante ; « Plus tard » aussi, sans rien publier.
 * Une publication demande toujours deux appuis : le geste, puis sa confirmation.
 */

const ETOILE = "M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z";

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 rounded-[9px] bg-soleil-doux p-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Intitule({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-semibold text-matcha">
      <Icone>{icone}</Icone>
      {children}
    </p>
  );
}

function Etoiles({ note, taille = "h-4 w-4" }: { note: number; taille?: string }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${note} étoile${note > 1 ? "s" : ""} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={`${taille} ${n <= note ? "text-soleil" : "text-nuage"}`} aria-hidden="true">
          <path d={ETOILE} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

function Avatar({ initiales, teinte = "bg-encre text-fond" }: { initiales: string; teinte?: string }) {
  return (
    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-surface text-[13px] font-bold ${teinte}`}>
      {initiales}
    </span>
  );
}

const BOUTON = "pressable inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] bouton-principal disabled:opacity-60";
const BOUTON_TEXTE = "pressable inline-flex min-h-12 items-center px-3 text-[15px] font-semibold underline decoration-1 underline-offset-[3px]";

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex items-center gap-1 pt-2">{children}</div>;
}

function Erreur({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-soleil-doux px-3.5 py-2.5 text-sm leading-snug">
      {message}
    </p>
  );
}

function CarteSourireVue({ carte, suivant }: { carte: CarteSourire; suivant: (fait?: string) => void }) {
  const [copie, setCopie] = useState(false);
  async function partager() {
    const texte = `« ${carte.texte} »\n${carte.auteur}, 5 étoiles sur Google`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Un avis qui fait plaisir", text: texte });
        suivant("Le sourire est parti vers l’équipe");
        return;
      }
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => suivant("Le sourire est copié pour l’équipe"), 700);
    } catch {
      // Partage annulé : on reste sur la carte.
    }
  }
  return (
    <>
      <Intitule
        icone={
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
          </>
        }
      >
        Le sourire d’abord
      </Intitule>
      <Etoiles note={5} taille="h-[18px] w-[18px]" />
      <blockquote className="titre-display text-[22px] font-bold leading-[1.2]">« {carte.texte} »</blockquote>
      <div className="flex items-center gap-3">
        <Avatar initiales={carte.initiales} />
        <p className="min-w-0 leading-tight">
          <span className="block text-[15px] font-semibold">{carte.auteur}</span>
          <span className="block text-[13px] text-encre-douce">
            {carte.quand}
            {carte.cite.length > 0 && ` · cite ${carte.cite.join(" et ")}`}
          </span>
        </p>
      </div>
      <Actions>
        <button type="button" onClick={partager} className={BOUTON}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15.5 14.4c3 0 5.5 2.2 5.5 5.6" />
            <circle cx="17" cy="9" r="2.4" />
          </svg>
          {copie ? "Copié" : "Partager avec l’équipe"}
        </button>
        <button type="button" onClick={() => suivant()} className={BOUTON_TEXTE}>
          Suivant
        </button>
      </Actions>
    </>
  );
}

function CarteReconqueteVue({ carte, suivant }: { carte: CarteReconquete; suivant: (fait?: string) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const enAttente = useAttenteReseau(enCours);
  const fiche = `/a-traiter/${carte.reviewId}`;

  function publier() {
    if (!carte.brouillon) return;
    if (!confirmer) {
      setConfirmer(true);
      return;
    }
    demarrer(async () => {
      const r = await actionPublierDepuisPile(carte.reviewId, carte.brouillon ?? "");
      if (r.erreur) {
        setErreur(r.erreur);
        setConfirmer(false);
      } else suivant(`${carte.auteur} a sa réponse`);
    });
  }

  return (
    <>
      <Intitule
        icone={
          <>
            <path d="M4 12a8 8 0 1 0 2.3-5.7" />
            <path d="M4 4v5h5" />
          </>
        }
      >
        À reconquérir
      </Intitule>
      <div className="flex items-center gap-3">
        <Avatar initiales={carte.initiales} teinte="bg-rose text-encre" />
        <p className="min-w-0 leading-tight">
          <span className="block text-[15px] font-semibold">{carte.auteur}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-encre-douce">
            {carte.quand} <Etoiles note={carte.note} taille="h-3 w-3" />
          </span>
        </p>
      </div>
      <p className="text-[15px] leading-snug">
        <span className="font-semibold">En résumé :</span> {carte.resume}
      </p>
      {(carte.raisons.length > 0 || carte.effet) && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Pourquoi cet avis passe en premier">
          {carte.raisons.map((r) => (
            <li key={r} className="rounded-full bg-matcha-doux px-2.5 py-1 text-xs font-semibold text-matcha">
              {r}
            </li>
          ))}
          {carte.effet && (
            <li className="rounded-full border border-nuage px-2.5 py-1 text-xs font-semibold text-encre-douce">
              Note {carte.effet.avant} → {carte.effet.apres}
            </li>
          )}
        </ul>
      )}
      {carte.brouillon ? (
        <div className="rounded-2xl border border-dashed border-ciel-fonce bg-fond px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-encre-douce">Brouillon</p>
          <p className="mt-1 line-clamp-5 text-sm italic leading-snug">{carte.brouillon}</p>
          {carte.signature && <p className="mt-1.5 text-xs text-encre-douce">{carte.signature}</p>}
        </div>
      ) : (
        <p className="rounded-2xl bg-fond px-3.5 py-3 text-sm leading-snug text-encre-douce">Le brouillon se prépare. Vous pouvez déjà lire l’avis en entier.</p>
      )}
      <Erreur message={erreur} />
      <Actions>
        {carte.brouillon ? (
          <button type="button" onClick={publier} disabled={enCours} className={BOUTON}>
            {enCours ? (enAttente ? "En attente du réseau…" : "Publication…") : confirmer ? "Confirmer la publication" : "Publier la réponse"}
          </button>
        ) : (
          <Link href={fiche} prefetch={false} className={BOUTON}>
            Lire l’avis
          </Link>
        )}
        {confirmer && !enCours ? (
          <button type="button" onClick={() => setConfirmer(false)} className={BOUTON_TEXTE}>
            Annuler
          </button>
        ) : (
          <Link href={fiche} prefetch={false} className={BOUTON_TEXTE}>
            Modifier
          </Link>
        )}
      </Actions>
      {!confirmer && (
        <button type="button" onClick={() => suivant()} className="pressable -mt-2 self-center text-[13px] font-semibold text-encre-douce">
          Plus tard
        </button>
      )}
    </>
  );
}

function prenoms(mercis: CarteMercis["mercis"]): string {
  const noms = mercis.map((m) => m.auteur.split(/\s+/)[0]);
  return noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}

const TEINTES = ["bg-encre text-fond", "bg-matcha-vif text-sur-vif", "bg-soleil text-sur-vif", "bg-bleu text-encre"];

function CarteMercisVue({ carte, suivant }: { carte: CarteMercis; suivant: (fait?: string) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const enAttente = useAttenteReseau(enCours);
  const n = carte.mercis.length;

  function valider() {
    if (!confirmer) {
      setConfirmer(true);
      return;
    }
    demarrer(async () => {
      const r = await actionPublierMercis(carte.mercis.map((m) => ({ reviewId: m.reviewId, texte: m.texte })));
      if (r.erreur) {
        setErreur(`${r.publies} merci${r.publies > 1 ? "s" : ""} publié${r.publies > 1 ? "s" : ""}. ${r.erreur}`);
        setConfirmer(false);
      } else suivant(`${n} merci${n > 1 ? "s" : ""} publié${n > 1 ? "s" : ""}`);
    });
  }

  return (
    <>
      <Intitule icone={<path d="M20 12.5c0 4.4-3.6 7.5-8 7.5a9 9 0 0 1-3.3-.6L4 21l1.1-3.6A7.2 7.2 0 0 1 4 12.5C4 8.1 7.6 5 12 5s8 3.1 8 7.5z" />}>
        {n > 1 ? `${n} mercis prêts` : "Un merci prêt"}
      </Intitule>
      <div className="flex" aria-hidden="true">
        {carte.mercis.map((m, i) => (
          <span key={m.reviewId} className={i > 0 ? "-ml-2.5" : ""}>
            <Avatar initiales={m.initiales} teinte={TEINTES[i % TEINTES.length]} />
          </span>
        ))}
      </div>
      <p className="titre-display text-[21px] font-bold leading-tight">{prenoms(carte.mercis)} {n > 1 ? "ont" : "a"} pris le temps de dire merci.</p>
      <details className="group rounded-2xl bg-fond px-3.5 py-2.5">
        <summary className="cible cursor-pointer list-none text-sm font-semibold">
          Relire {n > 1 ? "les mercis" : "le merci"} <span aria-hidden="true" className="ml-1 transition-transform group-open:rotate-90">›</span>
        </summary>
        <ul className="max-h-48 space-y-3 overflow-y-auto pb-1">
          {carte.mercis.map((m) => (
            <li key={m.reviewId} className="text-sm leading-snug">
              <span className="font-semibold">{m.auteur}</span>
              {m.extrait && <span className="text-encre-douce"> · « {m.extrait} »</span>}
              <span className="mt-1 block italic">{m.texte}</span>
            </li>
          ))}
        </ul>
      </details>
      <Erreur message={erreur} />
      <Actions>
        <button type="button" onClick={valider} disabled={enCours} className={BOUTON}>
          {enCours ? (enAttente ? "En attente du réseau…" : "Publication…") : confirmer ? `Confirmer, publier ${n > 1 ? `les ${n}` : "le merci"}` : n > 1 ? `Valider les ${n} mercis` : "Valider le merci"}
        </button>
        <button type="button" onClick={() => (confirmer ? setConfirmer(false) : suivant())} disabled={enCours} className={BOUTON_TEXTE}>
          {confirmer ? "Annuler" : "Plus tard"}
        </button>
      </Actions>
    </>
  );
}

function CarteLevierVue({ carte, suivant }: { carte: CarteLevier; suivant: (fait?: string) => void }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const palier = carte.palier && carte.palier.avisCinqEtoiles > 0 ? carte.palier : null;
  const cible = palier ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1 }).format(palier.cible) : null;
  return (
    <>
      <Intitule
        icone={
          <>
            <path d="M4 18l6-6 4 4 6-8" />
            <path d="M15 8h5v5" />
          </>
        }
      >
        {cible ? `Pour passer à ${cible}` : "Pour faire monter la note"}
      </Intitule>
      {palier ? (
        <>
          <p className="flex items-baseline gap-2.5">
            <span className="titre-display text-[56px] font-extrabold leading-none text-matcha">{palier.avisCinqEtoiles}</span>
            <span className="text-[16px] font-semibold leading-tight">
              avis à 5 étoiles
              <br />
              et la fiche affiche {cible}
            </span>
          </p>
          <div className="flex flex-wrap gap-1 text-soleil" aria-hidden="true">
            {Array.from({ length: Math.min(palier.avisCinqEtoiles, 15) }, (_, i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-5 w-5">
                <path d={ETOILE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
        </>
      ) : (
        carte.noteActuelle && (
          <p className="titre-display text-[22px] font-bold leading-tight">Votre note est à {carte.noteActuelle}. Chaque nouvel avis la fait vivre.</p>
        )
      )}
      <p className="text-[15px] leading-snug text-encre-douce">Demandez un avis à chaque client, sans choisir : c’est la règle de Google, et c’est ce qui marche.</p>
      {carte.sujet && (
        <p className="rounded-2xl bg-fond px-3.5 py-3 text-sm leading-snug">
          <span className="font-semibold">Le sujet qui revient :</span> {carte.sujet.libelle}, {carte.sujet.nombre} avis en 10 jours.{" "}
          {carte.sujet.themeId && (
            <Link href={`/tendances/theme/${carte.sujet.themeId}`} prefetch={false} className="font-semibold text-matcha underline underline-offset-2">
              Les lire
            </Link>
          )}
        </p>
      )}
      <Actions>
        {carte.qrSvg ? (
          <button type="button" onClick={() => dialogue.current?.showModal()} className={BOUTON}>
            Afficher mon QR
          </button>
        ) : (
          <Link href="/reglages/avis" className={BOUTON}>
            Ajouter mon lien d’avis
          </Link>
        )}
        <button type="button" onClick={() => suivant()} className={BOUTON_TEXTE}>
          Terminer
        </button>
      </Actions>
      {carte.qrSvg && (
        <dialog ref={dialogue} aria-label="QR d’avis Google" className="feuille sticker bg-surface p-6 text-center">
          <p className="titre-display text-xl font-bold">Votre QR d’avis</p>
          <p className="mt-1 text-sm text-encre-douce">À poser au comptoir. Un scan ouvre votre fiche Google, prête à noter.</p>
          {/* SVG produit côté serveur par la bibliothèque qrcode, à partir d'un lien Google validé. */}
          <div className="mx-auto mt-4 w-56 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: carte.qrSvg }} />
          <form method="dialog" className="mt-5">
            <button type="submit" className={`${BOUTON} w-full`}>
              Fermer
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}

function Recompense({ faits, recommencer }: { faits: string[]; recommencer: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center" role="status">
      <svg viewBox="0 0 140 140" className="h-32 w-32" aria-hidden="true">
        <g className="rayons" stroke="var(--soleil)" strokeWidth="5" strokeLinecap="round">
          <path d="M70 8v16M70 116v16M8 70h16M116 70h16M26 26l11 11M103 103l11 11M26 114l11-11M103 37l11-11" />
        </g>
        <circle cx="70" cy="70" r="30" fill="var(--soleil)" stroke="var(--trait)" strokeWidth="3" />
      </svg>
      <p className="titre-display text-[34px] font-extrabold leading-none">Tout est fait.</p>
      <p className="titre-display text-xl font-semibold text-encre-douce">Belle journée au comptoir.</p>
      {faits.length > 0 && <p className="max-w-[18rem] text-sm leading-snug text-encre-douce">{faits.join(". ")}.</p>}
      <div className="mt-3 flex items-center gap-2">
        <Link href="/avis" className="pressable bouton-principal inline-flex min-h-12 items-center rounded-full px-5 text-[15px]">
          Voir tous les avis
        </Link>
        <button type="button" onClick={recommencer} className={BOUTON_TEXTE}>
          Revoir les cartes
        </button>
      </div>
    </div>
  );
}

export function Pile({ cartes: cartesAJour }: { cartes: Carte[] }) {
  // Une publication rafraîchit la page côté serveur : la pile reste celle du début du rituel,
  // sinon une carte jouée disparaîtrait et la suivante serait sautée. « Revoir les cartes » la recharge.
  const [cartes, setCartes] = useState(cartesAJour);
  const [etape, setEtape] = useState(0);
  const [faits, setFaits] = useState<string[]>([]);
  const fini = etape >= cartes.length;

  function suivant(fait?: string) {
    if (fait) setFaits((f) => [...f, fait]);
    setEtape((e) => e + 1);
  }

  function recommencer() {
    setCartes(cartesAJour);
    setEtape(0);
    setFaits([]);
  }

  if (cartes.length === 0) {
    return (
      <p className="bloc sticker text-[15px] leading-snug">
        Rien de nouveau ce matin.{" "}
        <Link href="/avis" className="font-semibold text-matcha underline underline-offset-2">
          Voir les avis
        </Link>
      </p>
    );
  }

  return (
    <section aria-label="Les gestes du matin">
      <div className="pile">
        {cartes.map((carte, i) => {
          const decalage = i - etape;
          const pos = decalage < 0 || fini ? "parti" : String(Math.min(decalage, 3));
          return (
            <article
              key={`${carte.type}-${i}`}
              data-pos={pos}
              aria-hidden={pos !== "0"}
              className="pile-carte sticker flex min-h-[27rem] flex-col gap-3.5 rounded-[1.75rem] bg-surface p-5"
            >
              {carte.type === "sourire" && <CarteSourireVue carte={carte} suivant={suivant} />}
              {carte.type === "reconquete" && <CarteReconqueteVue carte={carte} suivant={suivant} />}
              {carte.type === "mercis" && <CarteMercisVue carte={carte} suivant={suivant} />}
              {carte.type === "levier" && <CarteLevierVue carte={carte} suivant={suivant} />}
            </article>
          );
        })}
        {fini && <Recompense faits={faits} recommencer={recommencer} />}
      </div>
      {!fini && (
        <div className="-mt-5 flex items-center justify-center gap-1.5" aria-label={`Carte ${etape + 1} sur ${cartes.length}`} role="img">
          {cartes.map((c, i) => (
            <span
              key={`${c.type}-${i}`}
              className={`h-[7px] rounded-full border-[1.5px] border-encre transition-all duration-300 ${i === etape ? "w-[22px] bg-matcha-vif" : i < etape ? "w-[7px] bg-encre" : "w-[7px]"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
