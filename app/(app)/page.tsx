import { CarteATraiter } from "@/components/meteo/CarteATraiter";
import { CarteMeteo } from "@/components/meteo/CarteMeteo";
import { CarteRemerciement } from "@/components/meteo/CarteRemerciement";
import { Compliment } from "@/components/meteo/Compliment";
import { MiniCourbe } from "@/components/meteo/MiniCourbe";
import { idEtablissementActif } from "@/lib/etablissements/service";
import { remerciementDuMoment } from "@/lib/file/service";
import { lirePeriodeMeteo } from "@/lib/meteo/periodes";
import { obtenirMeteoHome } from "@/lib/meteo/stats";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const locationId = await idEtablissementActif();
  const periode = lirePeriodeMeteo(
    typeof params.periode === "string" ? params.periode : null,
  );
  const [home, remerciement] = await Promise.all([
    obtenirMeteoHome(locationId, periode),
    remerciementDuMoment(locationId),
  ]);
  const sansAvis = home.volumeMois === 0 && home.noteMoyenne12Mois === null;
  const message = params.remercie
    ? "Remerciement publié. Merci pour eux !"
    : typeof params.erreur === "string"
      ? params.erreur
      : null;

  return (
    <main className="entree mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 pb-28 pt-3">
      <h1 className="sr-only">Météo de vos avis</h1>
      {message && (
        <p
          role="status"
          className="rounded-2xl bg-soleil-doux px-4 py-2 text-sm"
        >
          {message}
        </p>
      )}
      {sansAvis ? (
        <section className="bloc">
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            Pas encore d&apos;avis
          </h2>
          <p className="mt-1.5 text-[15px] leading-snug text-encre-douce">
            {home.etablissementActif
              ? `Les avis de ${home.etablissementActif.nom}`
              : "Vos avis"}{" "}
            apparaîtront ici dès que la fiche Google sera connectée.
          </p>
        </section>
      ) : (
        <CarteMeteo
          meteo={home.meteo}
          noteMoyenneMois={home.noteMoyenneMois}
          periode={home.periode}
          repere={home.repere}
          volumeMois={home.volumeMois}
          nbEnthousiastes={home.nbEnthousiastes}
          evolutionNote={home.evolutionNote}
          evolutionVolume={home.evolutionVolume}
          phrase={home.phrase}
        />
      )}
      <CarteATraiter nombre={home.aTraiter} />
      <Compliment compliment={home.compliment} />
      <MiniCourbe points={home.courbe} />
      <CarteRemerciement remerciement={remerciement} />
    </main>
  );
}
