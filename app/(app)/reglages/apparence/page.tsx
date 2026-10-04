import { cookies } from "next/headers";
import { BoutonAction } from "@/components/BoutonAction";
import { Ecran } from "@/components/Ecran";
import { COOKIE_THEME, LIBELLES_THEME, THEMES, lireTheme } from "@/lib/apparence";
import { actionChoisirApparence } from "../actions";

export const dynamic = "force-dynamic";

/** Apparence : claire, sombre, ou comme le téléphone. Le choix vaut pour cet appareil. */
export default async function ApparencePage() {
  const theme = lireTheme((await cookies()).get(COOKIE_THEME)?.value);
  return (
    <Ecran titre="Apparence" retour={{ href: "/reglages", libelle: "Réglages" }}>
      <form action={actionChoisirApparence} className="space-y-3">
        <div className="bloc">
          <h2 className="text-lg font-bold leading-tight">Quel affichage ?</h2>
          <p className="mt-1 text-[15px] leading-snug text-encre-douce">Ce choix vaut pour cet appareil.</p>
          <div className="mt-3 space-y-2" role="radiogroup">
            {THEMES.map((t) => (
              <label
                key={t}
                className="pressable flex cursor-pointer items-center gap-3 rounded-2xl bg-fond px-4 py-3.5 has-checked:bg-encre has-checked:text-fond has-focus-visible:ring-2 has-focus-visible:ring-encre"
              >
                <input type="radio" name="apparence" value={t} defaultChecked={theme === t} className="sr-only" />
                <span className="min-w-0">
                  <span className="block font-bold leading-tight">{LIBELLES_THEME[t].titre}</span>
                  <span className="block text-sm leading-snug opacity-75">{LIBELLES_THEME[t].detail}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <BoutonAction enCours="Enregistrement…" className="pressable w-full rounded-full bg-encre px-4 py-3.5 text-base font-bold text-fond">
          Enregistrer
        </BoutonAction>
      </form>
    </Ecran>
  );
}
