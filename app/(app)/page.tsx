import { CarteATraiter } from "@/components/meteo/CarteATraiter";
import { CarteMeteo } from "@/components/meteo/CarteMeteo";
import { Compliment } from "@/components/meteo/Compliment";
import { MiniCourbe } from "@/components/meteo/MiniCourbe";
import { SelecteurEtablissement } from "@/components/meteo/SelecteurEtablissement";
import { obtenirMeteoHome } from "@/lib/meteo/stats";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const locationId = typeof params.etablissement === "string" ? params.etablissement : null;
  const home = await obtenirMeteoHome(locationId);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 pb-16 pt-2">
      <h1 className="sr-only">Météo de vos avis</h1>
      <SelecteurEtablissement etablissements={home.etablissements} actif={home.etablissementActif} />
      <CarteMeteo
        meteo={home.meteo}
        noteMoyenneMois={home.noteMoyenneMois}
        noteMoyenne12Mois={home.noteMoyenne12Mois}
        volumeMois={home.volumeMois}
        nbEnthousiastes={home.nbEnthousiastes}
        evolutionNote={home.evolutionNote}
        evolutionVolume={home.evolutionVolume}
        phrase={home.phrase}
      />
      <Compliment compliment={home.compliment} />
      <MiniCourbe points={home.courbe} />
      <CarteATraiter nombre={home.aTraiter} />
      {home.volumeMois === 0 && home.noteMoyenne12Mois === null && (
        <p className="rounded-2xl bg-surface p-4 text-sm text-encre-douce">
          Connectez votre fiche Google dans Réglages pour voir le climat de vos avis.
        </p>
      )}
    </main>
  );
}
