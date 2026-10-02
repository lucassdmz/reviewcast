import { Ecran } from "@/components/Ecran";

export default function ATraiterPage() {
  return (
    <Ecran titre="À traiter">
      <p className="rounded-2xl bg-surface p-6 text-sm text-encre-douce">
        Rien à traiter pour le moment. Les avis qui méritent une réponse apparaîtront ici.
      </p>
    </Ecran>
  );
}
