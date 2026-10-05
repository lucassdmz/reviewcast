import "dotenv/config";
import { defineConfig } from "prisma/config";

// Sans DATABASE_URL (ex. `npm install` avant la création du .env), seule la
// génération du client fonctionne ; les commandes de migration échoueront
// clairement à la connexion.
const url = process.env.DATABASE_URL ?? "postgresql://localhost:5432/eclaircie";

export default defineConfig({
  schema: "lib/db/schema.prisma",
  migrations: {
    path: "lib/db/migrations",
  },
  datasource: { url },
});
