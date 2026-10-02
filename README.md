# Éclaircie — la météo de vos avis Google

PWA qui remet les avis Google en perspective : le climat global d'abord, les quelques avis à traiter ensuite. Référence fonctionnelle : [docs/cdc.md](docs/cdc.md).

## Démarrage

```bash
cp .env.example .env        # puis renseignez les valeurs
docker compose up -d        # Postgres local
npm install
npm run db:migrate          # crée les tables
npm run dev                 # http://localhost:3000
```

Pour la connexion Google : créez des identifiants OAuth « application web » dans Google Cloud, avec `http://localhost:3000/api/auth/callback/google` comme URI de redirection, et mettez votre adresse dans `ALLOWED_EMAILS`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur local |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm run test` | tests unitaires (Vitest) |
| `npm run e2e` | parcours Playwright (`npx playwright install chromium` la première fois) |
| `npm run db:migrate` | crée une migration depuis le schéma et l'applique (dev) |
| `npm run db:deploy` | applique les migrations existantes (prod, CI) |
| `npm run db:studio` | explorateur de données Prisma |

## Arborescence

- `app/` : routes Next.js (écrans et API). Les écrans sous `app/(app)/` exigent une session.
- `components/` : composants d'interface, sans logique métier.
- `lib/` : logique métier. `db/` (schéma Prisma, migrations), `auth/`, `crypto/`, `audit/` ; `ai/`, `google/`, `meteo/`, `analytics/` arrivent dans les lots suivants.
- `jobs/` : tâches planifiées.
- `tests/` : `unit/` (Vitest), `e2e/` (Playwright), `fixtures/`.
- `docs/` : cahier des charges et ligne de conduite.
