import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarreOnglets } from "@/components/BarreOnglets";
import { auth } from "@/lib/auth/config";

/** Toutes les pages de l'application exigent une session valide en base. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  return (
    <>
      {children}
      <BarreOnglets />
    </>
  );
}
