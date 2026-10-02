import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

/**
 * Client Prisma unique pour le processus. En développement, Next.js recharge
 * les modules à chaud : le client est conservé sur `globalThis` pour éviter
 * d'ouvrir une connexion à chaque rechargement.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquante : copiez .env.example vers .env");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
