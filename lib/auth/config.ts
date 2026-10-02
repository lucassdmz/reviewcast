import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { logAudit } from "@/lib/audit/log";
import { prisma } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { isAllowedEmail, parseAllowedEmails } from "./allowlist";

/**
 * Authentification par Google Sign-In (section 7 du cdc).
 * - Sessions stockées en base (table sessions), une seule session active en V1.
 * - Seules les adresses de ALLOWED_EMAILS peuvent se connecter.
 * - Les pages d'erreur et de connexion sont celles de l'application.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },
  providers: [
    Google({
      clientId: getEnv().AUTH_GOOGLE_ID,
      clientSecret: getEnv().AUTH_GOOGLE_SECRET,
      // Le même compte Google servira à l'OAuth Business Profile au lot 1.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    signIn({ user }) {
      const allowed = parseAllowedEmails(getEnv().ALLOWED_EMAILS);
      return isAllowedEmail(user.email, allowed);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      // Une seule session active : on ne garde que la plus récente.
      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { expires: "desc" },
        select: { id: true },
      });
      const toDelete = sessions.slice(1).map((s) => s.id);
      if (toDelete.length > 0) {
        await prisma.session.deleteMany({ where: { id: { in: toDelete } } });
      }
      await logAudit({ userId: user.id, action: "connexion" });
    },
    async signOut(message) {
      if ("session" in message && message.session && "userId" in message.session) {
        await logAudit({ userId: message.session.userId, action: "deconnexion" });
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
