import { Bandeau } from "@/components/accueil/Bandeau";
import { EnteteEtablissement } from "@/components/accueil/EnteteEtablissement";
import { Pile } from "@/components/accueil/Pile";
import { salutation } from "@/lib/accueil/phrase";
import { preparerRituel } from "@/lib/accueil/service";
import { lireChoixEtablissement } from "@/lib/etablissements/service";

export const dynamic = "force-dynamic";

const formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" });

/**
 * L'accueil : l'établissement affiché, le bandeau (clients contents, note), puis la pile du matin,
 * une carte à la fois : un sourire, la cliente à reconquérir, les mercis
 * prêts, le levier pour faire monter la note.
 */
export default async function AccueilPage() {
  const maintenant = new Date();
  const { actif, etablissements } = await lireChoixEtablissement();
  const locationId = actif?.id ?? null;
  const { entete, cartes } = await preparerRituel(locationId, locationId ?? etablissements[0]?.id ?? null, maintenant);

  return (
    <main className="entree mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-28 pt-4">
      <EnteteEtablissement etablissements={etablissements} actif={actif} />
      <Bandeau entete={entete} salutation={salutation(Number(formatHeure.format(maintenant)), entete.prenom)} />
      <Pile cartes={cartes} />
    </main>
  );
}
