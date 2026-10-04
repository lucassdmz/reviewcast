import type { Session } from "next-auth";
import { prisma } from "@/lib/db/client";

/**
 * Mode démonstration (`MODE_DEMO=1`) : l'application s'ouvre sans connexion,
 * pour être montrée depuis une simple adresse. La connexion Google reste en
 * place et reprend dès que la variable est retirée.
 *
 * Garde-fou : ce mode refuse de démarrer si la publication Google n'est pas
 * simulée, pour qu'un visiteur ne puisse jamais publier une vraie réponse.
 */
export function estModeDemo(): boolean {
  return process.env.MODE_DEMO === "1";
}

const EMAIL_DEMO = "demo@eclaircie.local";
let utilisateurDemo: { id: string; email: string; name: string } | null = null;

export async function sessionDemo(): Promise<Session> {
  if (process.env.PUBLICATION_GOOGLE !== "simulee") {
    throw new Error("Le mode démonstration exige PUBLICATION_GOOGLE=simulee.");
  }
  if (!utilisateurDemo) {
    const u = await prisma.user.upsert({
      where: { email: EMAIL_DEMO },
      update: {},
      create: { email: EMAIL_DEMO, name: "Démonstration" },
      select: { id: true },
    });
    utilisateurDemo = { id: u.id, email: EMAIL_DEMO, name: "Démonstration" };
  }
  return { user: utilisateurDemo, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
}
