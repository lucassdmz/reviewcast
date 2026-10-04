import { BoutonAction } from "@/components/BoutonAction";
import { Ecran } from "@/components/Ecran";
import { NombreAnime } from "@/components/NombreAnime";
import { SelecteurEtablissement } from "@/components/meteo/SelecteurEtablissement";
import { CourbeMensuelle } from "@/components/tendances/CourbeMensuelle";
import { ListeThemes } from "@/components/tendances/ListeThemes";
import { RepartitionEtoiles } from "@/components/tendances/RepartitionEtoiles";
import { SelecteurPeriode } from "@/components/tendances/SelecteurPeriode";
import { Synthese } from "@/components/tendances/Synthese";
import { formaterDelai } from "@/lib/analytics/agregation";
import { lireParametres } from "@/lib/analytics/requete";
import { syntheseTendances } from "@/lib/analytics/synthese";
import { obtenirTendances } from "@/lib/analytics/tendances";
import { actionRegenererSynthese } from "./actions";

export const dynamic = "force-dynamic";

const formatNote = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function signe(v: number): string {
  return v > 0 ? `+${formatNote.format(v)}` : v < 0 ? `−${formatNote.format(Math.abs(v))}` : "stable";
}

export default async function TendancesPage({ searchParams }: PageProps<"/tendances">) {
  const params = await searchParams;
  const { periode, locationId, requete } = lireParametres(params);
  const t = await obtenirTendances(locationId, periode);
  const synthese = await syntheseTendances(t);
  const titreSynthese = `Synthèse ${t.etablissement?.nom ?? "tous établissements"} · ${periode.libelle}`;
  const evolutionNote = t.repartition.noteMoyenne !== null && t.precedente.noteMoyenne !== null ? t.repartition.noteMoyenne - t.precedente.noteMoyenne : null;

  return (
    <Ecran titre="Tendances" large>
      <div className="entree space-y-3">
        <SelecteurEtablissement etablissements={t.etablissements} actif={t.etablissement} />
        <SelecteurPeriode periode={periode} locationId={locationId} />

        <section aria-label="Résumé de la période" className="bloc">
          <p className="intitule">{periode.libelle}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-bold leading-none tracking-tight">
              {t.repartition.noteMoyenne === null ? "–" : <NombreAnime valeur={t.repartition.noteMoyenne} />}
            </span>
            <span className="text-2xl text-soleil" aria-hidden="true">
              ★
            </span>
            {evolutionNote !== null && <span className="ml-1 text-[13px] text-encre-douce">{signe(Math.round(evolutionNote * 10) / 10)} vs période précédente</span>}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-fond px-3 py-2.5">
              <dd className="text-xl font-bold leading-none tabular-nums">{t.repartition.volume}</dd>
              <dt className="mt-1.5 text-xs text-encre-douce">avis reçus</dt>
            </div>
            <div className="rounded-2xl bg-fond px-3 py-2.5">
              <dd className="text-xl font-bold leading-none tabular-nums">{t.reactivite.tauxReponse === null ? "–" : `${t.reactivite.tauxReponse} %`}</dd>
              <dt className="mt-1.5 text-xs text-encre-douce">de réponses aux avis à traiter</dt>
            </div>
            <div className="rounded-2xl bg-fond px-3 py-2.5">
              <dd className="text-xl font-bold leading-none tabular-nums">{formaterDelai(t.reactivite.delaiMoyenHeures)}</dd>
              <dt className="mt-1.5 text-xs text-encre-douce">de délai moyen</dt>
            </div>
          </dl>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <ListeThemes titre="Ce qui plaît" themes={t.positifs} requete={requete} teinte="ciel" />
          <ListeThemes titre="Ce qui revient comme problème" themes={t.negatifs} requete={requete} teinte="nuage" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <CourbeMensuelle points={t.courbe} />
          <RepartitionEtoiles repartition={t.repartition} />
        </div>

        <Synthese
          synthese={synthese}
          titre={titreSynthese}
          regenerer={
            <form action={actionRegenererSynthese}>
              <input type="hidden" name="periode" value={periode.selection} />
              {periode.selection === "perso" && (
                <>
                  <input type="hidden" name="debut" value={typeof params.debut === "string" ? params.debut : ""} />
                  <input type="hidden" name="fin" value={typeof params.fin === "string" ? params.fin : ""} />
                </>
              )}
              {locationId && <input type="hidden" name="etablissement" value={locationId} />}
              <BoutonAction enCours="Rédaction…" className="pressable rounded-full bg-nuage px-3 py-1.5 font-medium">
                {synthese ? "Régénérer" : "Générer la synthèse"}
              </BoutonAction>
            </form>
          }
        />
      </div>
    </Ecran>
  );
}
