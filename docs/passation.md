# Passation — Éclaircie (météo des avis Google)

Document de reprise rédigé le 18 octobre 2026, à la fin d'une session Claude Code cloud. Il permet de reprendre le projet en local, avec Claude Code ou à la main, sans perdre le contexte. Référence fonctionnelle : [cdc.md](cdc.md). Règles de travail : `CLAUDE.md` à la racine.

## 1. Où en est le projet

Cinq lots sur sept sont livrés sur la branche `claude/fervent-bell-zgldfx`, poussée sur GitHub (`lucassdmz/reviewcast`). Rien n'est encore fusionné dans `main`. Tout fonctionne sans compte Google Business grâce à des avis de démonstration, un fournisseur IA simulé ou réel, et une publication simulée.

| Lot | Contenu | État |
| --- | --- | --- |
| 0. Socle | Next.js 16, TypeScript strict, Tailwind 4, Prisma 7 sur Postgres, Auth.js avec Google Sign-In, CI GitHub Actions | Livré |
| 1. Connexion Google | OAuth Business Profile, import des avis, synchronisation horaire | **Non commencé**, en attente de l'accès API Google |
| 2. Couche IA | Contrat `AiProvider`, implémentation Anthropic, fournisseur simulé, prompts, validation zod, 20 avis fictifs, compteur de tokens | Livré |
| 3. Home météo | Calcul météo, agrégations, phrase IA, compliment, mini-courbe, carte « à traiter » | Livré |
| 4. À traiter | File, fiche avis, brouillon, régénération, publication avec confirmation, notes internes, historique, remerciement en un geste | Livré (publication simulée) |
| 5. Tendances | Statistiques précalculées, périodes, thèmes, courbe, répartition, taux de réponse, synthèse IA exportable | Livré |
| 6. PWA et finitions | Manifest, service worker, hors ligne, push, Lighthouse | **Non commencé** |

Dernier commit : `ceed7e2 Étale les avis de démonstration sur 12 mois`. Historique complet lisible avec `git log --oneline`, un commit par fonctionnalité, en français.

## 2. Reprendre en local en dix minutes

```bash
git clone https://github.com/lucassdmz/reviewcast.git
cd reviewcast
git checkout claude/fervent-bell-zgldfx
cp .env.example .env            # puis renseignez les valeurs, voir section 3
docker compose up -d            # Postgres local sur le port 5432
npm install                     # génère aussi le client Prisma
npm run db:migrate              # crée les tables
npm run db:seed                 # établissement de démonstration + 20 avis analysés
npm run dev                     # http://localhost:3000
```

Pour vérifier que tout est sain : `npm run lint`, `npm run typecheck`, `npm run test` (90 tests unitaires), puis `npx playwright install chromium` une fois et `npm run e2e` (15 parcours). Les parcours Playwright supposent la base migrée et le seed chargé.

Sans Docker : n'importe quel Postgres 16 fait l'affaire, ajustez `DATABASE_URL`.

## 3. Variables d'environnement

Toutes sont documentées dans `.env.example`. Les valeurs minimales pour travailler en local sans aucun compte externe :

| Variable | Valeur locale | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | celle du docker-compose | base Postgres |
| `AUTH_SECRET` | `openssl rand -base64 32` | signature des cookies de session |
| `AUTH_URL` | `http://localhost:3000` | URL publique |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | identifiants OAuth Google Cloud, ou une valeur factice | Google Sign-In (voir section 6 pour s'en passer) |
| `ALLOWED_EMAILS` | votre adresse | liste blanche de connexion |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | chiffrement AES-256 des secrets en base |
| `ANTHROPIC_API_KEY` | votre clé, ou vide | IA réelle |
| `AI_PROVIDER` | `fake` pour travailler sans clé | fournisseur simulé |
| `PUBLICATION_GOOGLE` | `simulee` | la publication écrit en base au lieu d'appeler Google |

Les clés ne sont jamais exposées au front et jamais commitées.

## 4. Architecture en deux minutes

- `app/` : routes Next.js. `app/(app)/` contient les quatre écrans protégés par session (home, À traiter, Tendances, Réglages). `app/connexion` est public. Les actions serveur vivent dans `app/(app)/*/actions.ts` : elles vérifient la session, valident avec zod, puis délèguent à `lib/`.
- `components/` : composants d'interface sans logique métier, regroupés par écran (`meteo/`, `file/`, `tendances/`).
- `lib/` : toute la logique métier.
  - `db/` : schéma Prisma (`schema.prisma`), migrations, `seed.ts`, client avec adaptateur `pg`.
  - `auth/` : configuration Auth.js, liste blanche, détection du cookie pour le proxy.
  - `crypto/` : chiffrement des refresh tokens et clés IA.
  - `audit/` : journal des actions sensibles.
  - `ai/` : contrat `AiProvider`, schémas zod des sorties, prompts, validation avec nouvel essai, tarifs, fournisseurs (`anthropic`, `fake`, `unavailable`), fabrique, résolution de la configuration et de la ligne de conduite, service d'orchestration, compteur de tokens.
  - `meteo/` : calcul météo, agrégations pures, compliment, phrase IA, assemblage de la home.
  - `file/` : transitions de statut, bandeau de contexte, validation, service de la file.
  - `google/publication.ts` : interface `PublieurReponses`, publieur réel (`reviews.updateReply`) et publieur simulé.
  - `analytics/` : périodes, agrégations pures, recalcul des tables précalculées, lecture de Tendances, synthèse IA.
- `proxy.ts` : redirige vers la connexion sans cookie de session (remplace `middleware.ts` depuis Next 16).
- `tests/unit/` (Vitest), `tests/e2e/` (Playwright), `tests/integration/` (vrai modèle, ignoré sans clé), `tests/fixtures/` (20 avis et une ligne de conduite de test).
- `.github/workflows/ci.yml` : lint, types, tests, migrations sur un Postgres éphémère, contrôle de dérive du schéma, seed, build, parcours Playwright. Se déclenche sur `main` et sur les pull requests uniquement.

## 5. Décisions prises et pourquoi

- **Prisma plutôt que le client Supabase** : schéma versionné dans le dépôt, portable, aucun compte à créer. Prisma 7 exige `prisma.config.ts` et un adaptateur de pilote ; le client est généré dans `lib/db/generated/` (ignoré par git, régénéré à l'installation).
- **Auth.js plutôt que Supabase Auth** : le même compte Google servira à l'OAuth Business Profile au lot 1. Sessions en base, une seule session active.
- **Modèles IA** : analyse et phrase météo sur `claude-sonnet-5-5`, brouillons et synthèses sur `claude-opus-5-5`, surchargeables dans les réglages. Sorties structurées validées par zod, un nouvel essai puis erreur visible. Le texte d'un avis est isolé dans une balise `<avis>`, chevrons neutralisés, et le modèle est averti d'ignorer toute consigne qu'il contiendrait.
- **Statut `HORS_FILE`** ajouté aux quatre statuts du cdc pour les avis positifs qui n'entrent pas dans la file.
- **Polarité par occurrence** : chaque thème détecté sur un avis porte sa propre polarité, ce qui alimente « ce qui plaît » et « ce qui revient comme problème ».
- **Statistiques précalculées par jour** (`daily_stats`, `theme_stats`), reconstruites après chaque analyse et chaque publication. La page Tendances ne lit jamais les avis bruts.
- **Fournisseur simulé et publieur simulé** : rendent la démo et les tests indépendants de toute clé et de Google. Le mode démo complet est le prochain chantier (section 7).
- **Courbes en SVG léger**, sans Recharts, pour tenir le critère de chargement.
- `docs/ligne-de-conduite.md` n'a pas été touché, conformément au `CLAUDE.md`. La version de test est dans `tests/fixtures/ligne-de-conduite-test.md`.

## 6. Pièges connus

- **Google Sign-In exige des identifiants OAuth** dans Google Cloud (type application web, URI de redirection `http://localhost:3000/api/auth/callback/google`). Sans eux, impossible de se connecter par l'interface. Les parcours Playwright contournent le problème en ouvrant une session directement en base (`tests/e2e/helpers/session.ts`). Le mode démo prévu ajoutera un accès sans Google.
- **Le seed ne remet pas les statuts à zéro** : il met à jour les dates mais conserve les avis publiés pendant les tests. Pour repartir propre : supprimer et recréer la base, `npm run db:deploy`, `npm run db:seed`. `prisma migrate reset` demande une confirmation interactive.
- **Playwright et Chromium** : si la version installée ne correspond pas, `PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chromium` est lu par `playwright.config.ts`.
- **Le compteur de tokens** n'enregistre rien avec le fournisseur simulé.
- **`npm audit`** signale des alertes dans des dépendances internes du CLI Prisma (mysql2, deepmerge-ts), hors exécution. Prisma CLI est en devDependency.
- **Les avis fictifs sont datés par rapport au jour du seed**, étalés sur 12 mois. En début de mois, la home n'a qu'un ou deux avis « ce mois-ci ».
- **Vitest ne charge pas `.env`** : les modules qui importent le client Prisma ne sont pas testables en unitaire. Les fonctions pures sont volontairement séparées (`agregation.ts`, `calcul.ts`, `ligne-de-conduite.ts`).

## 7. Prochaines étapes, dans l'ordre recommandé

### 7.1 Mode démo (validé, non commencé)

1. Variable `MODE_DEMO` qui force la publication simulée et affiche « Démonstration : rien n'est publié sur Google » dans Réglages et sur l'écran de confirmation. L'IA reste réelle si `ANTHROPIC_API_KEY` est présente.
2. Bouton « Accéder à la démonstration » sur `/connexion`, actif seulement en mode démo, qui ouvre une session pour un utilisateur de démonstration sans Google.
3. Commande de remise à zéro de la démo (avis remis dans la file, réponses publiées pendant la répétition effacées, dates relatives).
4. Déploiement Vercel + Supabase gratuit, avec la liste des variables. Montrer sur téléphone.
5. Parcours Playwright complet en mode démo.

### 7.2 Lot 6 en version courte

Manifest, icônes 192 et 512, `display: standalone`, couleur de thème, score Lighthouse. Le hors ligne et les notifications push peuvent attendre.

### 7.3 Lot 1 quand Google aura accordé l'accès

Écran OAuth avec le scope `business.manage`, refresh token chiffré via `lib/crypto`, choix de la fiche, import initial, synchronisation horaire dans `jobs/`, détection des réponses publiées depuis Google, puis brancher `PublieurGoogle` avec un fournisseur de jeton. L'interface `PublieurReponses` et le champ `googleReviewId` (nom de ressource `accounts/…/locations/…/reviews/…`) sont déjà prévus. Le publieur réel refuse les identifiants qui ne sont pas des noms de ressource Google, ce qui protège les avis fictifs.

## 8. Démarches en cours côté Google (hors code)

- **Demande d'accès à l'API Fiche d'établissement** : en cours sur le formulaire Google, avec la fiche Keep Linking comme justificatif. Ce formulaire autorise le projet Google Cloud de l'éditeur, une seule fois. Il ne connecte aucune fiche à l'outil.
- **Numéro du projet Cloud** demandé par le formulaire : 12 chiffres, visible sur console.cloud.google.com, tableau de bord du projet, carte « Informations sur le projet ». Si aucun projet n'existe, en créer un nommé « Éclaircie » depuis le sélecteur de projet en haut de la console.
- **Plus tard, chaque client** (par exemple The Coffee Lyon Brotteaux) connectera sa fiche depuis l'app via l'écran OAuth, sans formulaire ni projet Cloud de son côté. Tant que l'écran de consentement est en mode test, ajouter l'adresse Google du gérant dans la liste des utilisateurs test.

## 9. Ce qui est attendu de vous

- La clé API Anthropic, pour des brouillons réels en démonstration.
- La ligne de conduite dans `docs/ligne-de-conduite.md` avec trois réponses de référence, en partant de `tests/fixtures/ligne-de-conduite-test.md`.
- Éventuellement une vingtaine d'avis réels de The Coffee (prénom affiché, note, date, texte) pour remplacer `tests/fixtures/reviews.json`. Le champ `jours_avant` donne la date relative. Je n'ai pas pu les récupérer depuis le cloud, Google étant inaccessible depuis cet environnement.
- Un compte Supabase et un compte Vercel pour la mise en ligne.
- La décision d'ouvrir une pull request de `claude/fervent-bell-zgldfx` vers `main` : la CI ne tourne que là.

## 10. Prompt de reprise pour Claude Code en local

À coller tel quel au début de la nouvelle session :

> Lis CLAUDE.md, docs/cdc.md et docs/passation.md. Les lots 0, 2, 3, 4 et 5 sont livrés sur la branche `claude/fervent-bell-zgldfx`. Vérifie que l'environnement local fonctionne (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e`), puis propose-moi en 5 lignes le plan du mode démo décrit en section 7.1 de la passation, et attends ma validation avant de commencer.
