import { Ecran } from "@/components/Ecran";
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
      <div className="space-y-3">
        <SelecteurEtablissement etablissements={t.etablissements} actif={t.etablissement} />
        <SelecteurPeriode periode={periode} locationId={locationId} />

        <section aria-label="Résumé de la période" className="rounded-2xl bg-ciel p-4">
          <p className="text-xs text-encre-douce">{periode.libelle}</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p>
              <span className="text-3xl font-semibold">{t.repartition.noteMoyenne === null ? "–" : formatNote.format(t.repartition.noteMoyenne)}</span>
              <span className="ml-1 text-encre-douce" aria-hidden="true">
                ★
              </span>
              {evolutionNote !== null && <span className="ml-2 text-xs text-encre-douce">{signe(Math.round(evolutionNote * 10) / 10)} vs période précédente</span>}
            </p>
            <p className="text-sm">
              <span className="font-semibold">{t.repartition.volume}</span> <span className="text-encre-douce">avis reçus</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold">{t.reactivite.tauxReponse === null ? "–" : `${t.reactivite.tauxReponse} %`}</span>{" "}
              <span className="text-encre-douce">de réponses aux avis à traiter</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold">{formaterDelai(t.reactivite.delaiMoyenHeures)}</span> <span className="text-encre-douce">de délai moyen</span>
            </p>
          </div>
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
              <button type="submit" className="rounded-xl border border-nuage bg-surface px-3 py-1.5 hover:bg-nuage">
                {synthese ? "Régénérer" : "Générer la synthèse"}
              </button>
            </form>
          }
        />
      </div>
    </Ecran>
  );
}
