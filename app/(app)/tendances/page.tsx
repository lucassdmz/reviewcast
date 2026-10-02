import { Ecran } from "@/components/Ecran";

export default function TendancesPage() {
  return (
    <Ecran titre="Tendances">
      <p className="rounded-2xl bg-surface p-6 text-sm text-encre-douce">
        Les tendances s&apos;afficheront dès que vos avis seront synchronisés.
      </p>
    </Ecran>
  );
}
