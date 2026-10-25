# Passation — Éclaircie (météo des avis Google)

Document de reprise rédigé le 18 octobre 2026, à la fin d'une session Claude Code cloud. Il permet de reprendre le projet en local, avec Claude Code ou à la main, sans perdre le contexte. Référence fonctionnelle : [cdc.md](cdc.md), version 1.1. Règles de travail : `CLAUDE.md` à la racine. Idées et références : [backlog.md](backlog.md).

## 1. Où en est le projet

Le travail vit sur la branche `claude/fervent-bell-zgldfx`, poussée sur GitHub (`lucassdmz/reviewcast`). Rien n'est encore fusionné dans `main`. Deux sessions ont contribué : la session cloud (lots 0, 2, 3, 4, 5, commits du 2 octobre) puis une autre session (lot 7, mode démo, refonte mobile, commits du 3 au 5 octobre). Tout fonctionne sans compte Google Business grâce aux avis de démonstration, à un fournisseur IA simulé ou réel, et à une publication simulée.

| Lot | Contenu | État |
| --- | --- | --- |
| 0. Socle | Next.js 16, TypeScript strict, Tailwind 4, Prisma 7 sur Postgres, Auth.js avec Google Sign-In, CI GitHub Actions | Livré |
| 1. Connexion Google | OAuth Business Profile, import des avis, synchronisation horaire, publication réelle | **Non commencé**, en attente de l'accès API Google |
| 2. Couche IA | Contrat `AiProvider`, implémentation Anthropic, fournisseur simulé, prompts, validation zod, 20 avis fictifs, compteur de tokens | Livré |
| 3. Home météo | Météo glissante (30 jours, 3 mois, 12 mois), phrase IA, compliment, mini-courbe, carte « à traiter » | Livré |
| 4. À traiter | File des 40 derniers jours, rattrapage, fiche avis, brouillon, régénération, publication avec confirmation, notes internes, historique, remerciement en un geste | Livré (publication simulée) |
| 5. Tendances | Statistiques précalculées, périodes, thèmes cliquables, courbe, répartition, taux de réponse, synthèse IA exportable | Livré |
| 6. PWA et finitions | Manifest, icônes, apparence clair/sombre : faits. Service worker, hors ligne, notifications push, Lighthouse : **à faire** | Partiel |
| 7. Voix de l'établissement | Signature, je/nous, registre, longueur, emojis autorisés, aperçu, coordonnées, règles par sujet, mots à éviter, apprentissage des corrections | Livré (section 12 du cdc) |
| Mode démo | `MODE_DEMO=1` ouvre l'app sans connexion, publication forcément simulée, déploiement Vercel préparé | Livré |

Dernier commit de code : `10a4616 Gras allégé, page sans avis centrée, backlog des études sur la réponse aux avis`. Historique complet avec `git log --oneline`, un commit par fonctionnalité, en français.

État vérifié le 18 octobre sur cette branche : lint, typecheck, 128 tests unitaires et 15 parcours Playwright passent, à condition de partir d'une base vierge fraîchement seedée (voir section 6).

## 2. Reprendre en local en dix minutes

```bash
git clone https://github.com/lucassdmz/reviewcast.git
cd reviewcast
git checkout claude/fervent-bell-zgldfx
cp .env.example .env            # puis renseignez les valeurs, voir section 3
docker compose up -d            # Postgres local sur le port 5432
npm install                     # génère aussi le client Prisma
npm run db:migrate              # crée les tables (8 migrations)
npm run db:seed                 # établissement de démonstration + 20 avis analysés
npm run dev                     # http://localhost:3000
```

Pour vérifier que tout est sain : `npm run lint`, `npm run typecheck`, `npm run test`, puis `npx playwright install chromium` une fois et `npm run e2e`.

Sans Docker : n'importe quel Postgres 16 convient, ajustez `DATABASE_URL`. Une base partagée avec d'autres applications accepte `?schema=eclaircie` dans l'URL pour ranger les tables dans un schéma dédié.

## 3. Variables d'environnement

Toutes sont documentées dans `.env.example`. Valeurs minimales pour travailler en local sans aucun compte externe :

| Variable | Valeur locale | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | celle du docker-compose | base Postgres |
| `AUTH_SECRET` | `openssl rand -base64 32` | signature des cookies de session |
| `AUTH_URL` | `http://localhost:3000` | URL publique |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | identifiants OAuth Google Cloud, ou une valeur factice | Google Sign-In, inutile en mode démo |
| `ALLOWED_EMAILS` | votre adresse | liste blanche de connexion |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | chiffrement AES-256 des secrets en base |
| `ANTHROPIC_API_KEY` | votre clé, ou vide | IA réelle |
| `AI_PROVIDER` | `fake` pour travailler sans clé | fournisseur simulé |
| `PUBLICATION_GOOGLE` | `simulee` | la publication écrit en base au lieu d'appeler Google |
| `MODE_DEMO` | `1` pour ouvrir l'app sans connexion | exige `PUBLICATION_GOOGLE=simulee`, jamais avec de vraies fiches |

Pour une démonstration convaincante : `MODE_DEMO=1`, `PUBLICATION_GOOGLE=simulee`, `AI_PROVIDER` vide et une vraie `ANTHROPIC_API_KEY`. Les brouillons sont alors rédigés par Claude, rien ne part sur Google.

## 4. Architecture en deux minutes

- `app/` : routes Next.js. `app/(app)/` contient les écrans (home, À traiter, Tendances, Réglages avec un sous-écran par sujet). `app/connexion` est public, `app/manifest.ts` sert le manifest PWA, `app/logo/[id]` sert le logo d'un établissement. Les actions serveur vivent dans `app/(app)/**/actions.ts` : elles vérifient la session, valident avec zod, puis délèguent à `lib/`.
- `components/` : composants d'interface sans logique métier, regroupés par écran (`meteo/`, `file/`, `tendances/`, `reglages/`, `etablissements/`, `marque/`).
- `lib/` : toute la logique métier.
  - `db/` : schéma Prisma, migrations, `seed.ts`, client avec adaptateur `pg`.
  - `auth/` : configuration Auth.js, liste blanche, cookie pour le proxy, `demo.ts` pour le mode démonstration.
  - `crypto/`, `audit/` : chiffrement des secrets, journal des actions sensibles.
  - `ai/` : contrat `AiProvider`, schémas zod, prompts, salutation par prénom, validation avec nouvel essai, tarifs, fournisseurs (`anthropic`, `fake`, `unavailable`), fabrique, configuration et ligne de conduite, service d'orchestration, compteur de tokens.
  - `voix/` : lot 7, réglages de la voix, signature ajoutée hors modèle, aperçu, apprentissage des corrections.
  - `meteo/` : calcul météo, périodes glissantes, agrégations pures, compliment, phrase IA, assemblage de la home.
  - `file/` : transitions de statut, bandeau de contexte, récence (40 jours et rattrapage), validation, service de la file.
  - `google/publication.ts` : interface `PublieurReponses`, publieur réel (`reviews.updateReply`) et publieur simulé.
  - `analytics/` : périodes, agrégations pures, recalcul des tables précalculées, lecture de Tendances, synthèse IA.
  - `etablissements/` : établissement actif mémorisé sur l'appareil, choix depuis la barre d'onglets.
  - `apparence.ts` : clair par défaut, sombre ou réglage du téléphone.
- `proxy.ts` : redirige vers la connexion sans cookie de session, laisse passer en mode démo. Remplace `middleware.ts` depuis Next 16.
- `tests/unit/` (Vitest, 27 fichiers), `tests/e2e/` (Playwright, 4 parcours), `tests/integration/` (vrai modèle, ignoré sans clé), `tests/fixtures/` (20 avis et une ligne de conduite de test).
- `.github/workflows/ci.yml` : lint, types, tests, migrations sur un Postgres éphémère, contrôle de dérive du schéma, seed, build, parcours Playwright. Se déclenche sur `main` et sur les pull requests uniquement.
- `vercel.json` et `.vercelignore` : déploiement Vercel, région Paris.

## 5. Décisions prises et pourquoi

La section 11 du cdc consigne les décisions d'interface prises en construisant le MVP (météo glissante, file limitée à 40 jours, contexte en une phrase par écran, chevron de retour, choix de l'établissement dans la barre d'onglets). S'y ajoutent, côté technique :

- **Prisma plutôt que le client Supabase** : schéma versionné, portable, aucun compte à créer. Prisma 7 exige `prisma.config.ts` et un adaptateur ; le client est généré dans `lib/db/generated/` (ignoré par git, régénéré à l'installation).
- **Auth.js plutôt que Supabase Auth** : le même compte Google servira à l'OAuth Business Profile au lot 1. Sessions en base, une seule session active. En mode démo, `auth()` renvoie une session fictive sans passer par Google.
- **Modèles IA** : analyse et phrase météo sur `claude-sonnet-5-5`, brouillons et synthèses sur `claude-opus-5-5`, surchargeables dans les réglages. Sorties structurées validées par zod, un nouvel essai puis erreur visible. Le texte d'un avis est isolé dans une balise `<avis>`, chevrons neutralisés, le modèle averti d'ignorer toute consigne qu'il contiendrait.
- **La signature est ajoutée par l'application, pas par le modèle** : toujours exacte, modifiable sans régénérer.
- **Statut `HORS_FILE`** ajouté aux quatre statuts du cdc pour les avis positifs hors file.
- **Polarité par occurrence** : chaque thème détecté sur un avis porte sa propre polarité.
- **Statistiques précalculées par jour** (`daily_stats`, `theme_stats`), reconstruites après chaque analyse et chaque publication.
- **Fournisseur simulé et publieur simulé** rendent démo et tests indépendants de toute clé et de Google. Le simulé applique la personne, la longueur, les coordonnées et la règle du sujet ; le ton, les emojis, les mots à éviter et les corrections retenues n'agissent qu'avec le vrai modèle.
- **Courbes en SVG léger**, sans bibliothèque.

## 6. Pièges connus

- **Les parcours Playwright consomment la file** : ils publient et ignorent des avis. Sur une base déjà utilisée, le parcours « régénère avec une consigne » peut échouer faute de second avis dans la file. Repartir propre : supprimer et recréer la base, `npm run db:deploy`, `npm run db:seed`. `prisma migrate reset` demande une confirmation interactive. Le seed met à jour les dates mais ne remet pas les statuts.
- **Google Sign-In exige des identifiants OAuth** dans Google Cloud (type application web, URI de redirection `http://localhost:3000/api/auth/callback/google`). Sans eux, utilisez `MODE_DEMO=1`. Les parcours Playwright ouvrent une session directement en base (`tests/e2e/helpers/session.ts`).
- **Playwright et Chromium** : si la version installée ne correspond pas, `PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chromium` est lu par `playwright.config.ts`.
- **Vitest ne charge pas `.env`** : les modules qui importent le client Prisma ne sont pas testables en unitaire. Les fonctions pures sont volontairement séparées (`agregation.ts`, `calcul.ts`, `ligne-de-conduite.ts`, `recence.ts`, `signature.ts`).
- **Le compteur de tokens** n'enregistre rien avec le fournisseur simulé.
- **Les avis fictifs sont datés par rapport au jour du seed**, étalés sur 12 mois. Les avis négatifs de plus de 90 jours reçoivent une réponse historique.
- **`npm audit`** signale des alertes dans des dépendances internes du CLI Prisma (mysql2, deepmerge-ts), hors exécution. Prisma CLI est en devDependency.
- **Le remerciement de la home** génère un brouillon IA à la première ouverture s'il n'existe pas encore : avec le vrai modèle, cela coûte un appel.

## 7. Prochaines étapes, dans l'ordre recommandé

### 7.1 Mettre la démo en ligne

Vercel avec la base Supabase gratuite, variables de la section 3 avec `MODE_DEMO=1`. Avant la présentation, recréer la base et relancer le seed pour une file pleine. Répéter le scénario : météo, remercier un avis 5 étoiles, ouvrir un avis à traiter, régénérer plus court, publier, montrer les tendances, changer la voix dans Réglages et voir l'aperçu. Dire que la publication est simulée en attendant l'accès Google.

### 7.2 Finir le lot 6

Service worker, hors ligne en lecture, notifications push désactivables, score Lighthouse PWA et accessibilité ≥ 90. Manifest, icônes et apparence sont déjà faits.

### 7.3 Lot 1 quand Google aura accordé l'accès

Écran OAuth avec le scope `business.manage`, refresh token chiffré via `lib/crypto` dans `google_connections`, choix de la fiche, import initial, synchronisation horaire dans `jobs/`, détection des réponses publiées depuis Google, puis brancher `PublieurGoogle` avec un fournisseur de jeton. L'interface `PublieurReponses` et le champ `googleReviewId` (nom de ressource `accounts/…/locations/…/reviews/…`) sont prêts. Le publieur réel refuse les identifiants qui ne sont pas des noms de ressource Google, ce qui protège les avis fictifs.

### 7.4 Backlog

Les idées à instruire (remerciements avec retenue, repère de délai, registre factuel, page « Pourquoi répondre ») sont dans `docs/backlog.md`, avec les études qui les motivent.

## 8. Démarches en cours côté Google (hors code)

- **Demande d'accès à l'API Fiche d'établissement** : en cours sur le formulaire Google, avec la fiche Keep Linking comme justificatif. Ce formulaire autorise le projet Google Cloud de l'éditeur, une seule fois. Il ne connecte aucune fiche à l'outil.
- **Numéro du projet Cloud** demandé par le formulaire : 12 chiffres, visible sur console.cloud.google.com, tableau de bord du projet, carte « Informations sur le projet ». Si aucun projet n'existe, en créer un nommé « Éclaircie » depuis le sélecteur de projet en haut de la console, puis le sélectionner.
- **Plus tard, chaque client** (par exemple The Coffee Lyon Brotteaux) connectera sa fiche depuis l'app via l'écran OAuth, sans formulaire ni projet Cloud de son côté. Tant que l'écran de consentement est en mode test, ajouter l'adresse Google du gérant dans la liste des utilisateurs test.
- **Après l'accord** : dans le même projet Cloud, activer « My Business Account Management », « My Business Business Information » et « Google My Business API », créer l'écran de consentement et des identifiants OAuth « application web ».

## 9. Ce qui est attendu de vous

- La clé API Anthropic, pour des brouillons réels en démonstration.
- Éventuellement une vingtaine d'avis réels de The Coffee (prénom affiché, note, date, texte) pour remplacer `tests/fixtures/reviews.json`. Le champ `jours_avant` donne la date relative. La session cloud n'a pas pu les récupérer, Google étant inaccessible depuis cet environnement.
- Un projet Supabase et un compte Vercel pour la mise en ligne.
- La décision d'ouvrir une pull request de `claude/fervent-bell-zgldfx` vers `main` : la CI ne tourne que là.

## 10. Prompt de reprise pour Claude Code en local

À coller tel quel au début de la nouvelle session :

> Lis CLAUDE.md, docs/cdc.md et docs/passation.md. Les lots 0, 2, 3, 4, 5 et 7 sont livrés sur la branche `claude/fervent-bell-zgldfx`, avec un mode démo. Vérifie que l'environnement local fonctionne (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e` sur une base fraîchement seedée), puis propose-moi en 5 lignes le plan de la mise en ligne de la démo décrite en section 7.1 de la passation, et attends ma validation avant de commencer.
