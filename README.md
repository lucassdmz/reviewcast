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
| `npm run db:seed` | charge un établissement de démonstration et 20 avis fictifs analysés, sans appel réseau |
| `npm run test:integration` | passe les 20 avis fictifs dans le vrai modèle (nécessite `ANTHROPIC_API_KEY`, environ 0,50 $) |

## Couche IA

Tout passe par `lib/ai/` : un contrat `AiProvider` (`analyzeReview`, `draftReply`, `thankYouNote`, `weatherSentence`, `summarize`), une implémentation Anthropic avec sorties structurées validées par zod et prompt système mis en cache, un fournisseur simulé pour les tests et la démo. OpenAI et Ollama sont déclarés mais pas encore disponibles.

- Les sorties sont demandées en JSON strict et validées par un schéma ; en cas d'échec, un nouvel essai, puis une erreur visible.
- Le texte d'un avis est isolé dans une balise `<avis>`, ses chevrons sont neutralisés et le modèle est averti d'ignorer toute consigne qu'il contiendrait.
- La ligne de conduite vient des réglages de l'établissement, sinon de `docs/ligne-de-conduite.md` (section « Exemples de réponses » séparée par `---`).
- Chaque appel enregistre ses tokens et un coût estimé, affichés dans Réglages.
- `AI_PROVIDER=fake` dans `.env` permet de travailler sans clé API.

## Home météo

`lib/meteo/` calcule tout ce que l'écran d'accueil affiche : météo du mois depuis les seuils des réglages (`calcul.ts`), agrégations pures sur les avis (`agregation.ts`), compliment du moment (`compliment.ts`), phrase de synthèse IA stockée dans `monthly_summaries` et régénérée quand le volume du mois change (`phrase.ts`), et l'assemblage côté base (`stats.ts`). Les composants de `components/meteo/` reçoivent ces données déjà calculées.

Les parcours Playwright protégés ouvrent une session directement en base (`tests/e2e/helpers/session.ts`) : ils supposent une base migrée et le seed de démonstration chargé.

## Arborescence

- `app/` : routes Next.js (écrans et API). Les écrans sous `app/(app)/` exigent une session.
- `components/` : composants d'interface, sans logique métier.
- `lib/` : logique métier. `db/` (schéma Prisma, migrations, seed), `auth/`, `crypto/`, `audit/`, `ai/` ; `google/`, `meteo/`, `analytics/` arrivent dans les lots suivants.
- `jobs/` : tâches planifiées.
- `tests/` : `unit/` (Vitest), `e2e/` (Playwright), `fixtures/`.
- `docs/` : cahier des charges et ligne de conduite.
