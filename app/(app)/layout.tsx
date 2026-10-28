import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BarreOnglets } from "@/components/BarreOnglets";
import { HorsLigne } from "@/components/pwa/HorsLigne";
import { BulleRetours } from "@/components/retours/BulleRetours";
import { auth } from "@/lib/auth/config";
import { lireChoixEtablissement } from "@/lib/etablissements/service";
import { retoursActifs } from "@/lib/retours/service";

/** Toutes les pages de l'application exigent une session valide en base. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const { etablissements, actif } = await lireChoixEtablissement();
  return (
    <>
      <HorsLigne />
      {children}
      <BarreOnglets etablissements={etablissements} actif={actif} />
      {retoursActifs() && (
        <Suspense fallback={null}>
          <BulleRetours />
        </Suspense>
      )}
    </>
  );
}
