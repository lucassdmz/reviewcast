# Cahier des charges — PWA météo des avis Google

Version 1.1 du 4 octobre 2026 · Lucas Dominguez

La version 1.0 du 1er octobre décrivait le MVP. Cette version intègre les décisions prises pendant sa construction (section 11) et ajoute le lot 7, « la voix de l'établissement » (section 12).

## 1. Contexte et objectifs

L'outil remet les avis Google en perspective : il montre d'abord le climat global (largement positif), puis aide à traiter les quelques avis négatifs sans qu'ils prennent toute la place.

**Problème** : la lecture brute de la fiche Google met les avis négatifs au même niveau que les 95 % de positifs. On finit par ne retenir que les mauvais, et on répond à chaud ou pas du tout.

**Objectifs mesurables de la V1**

- 100 % des avis négatifs (1 à 3 étoiles) ont un brouillon de réponse disponible en moins de 24 h après publication.
- Chaque brouillon respecte la ligne de conduite définie en section 4, validé par un humain avant publication.
- La home donne en moins de 5 secondes la tendance du mois : note moyenne, volume, évolution, thème dominant.
- La page analytique fait ressortir les 5 thèmes positifs et les 5 problèmes les plus fréquents sur une période choisie.

**Périmètre initial** : les établissements d'un seul franchisé (plusieurs fiches Google), un seul utilisateur (Lucas), usage mobile en priorité.

**Nom de code** : à choisir (proposition : *Éclaircie* ; *Reviewcast* est le nom du dépôt GitHub).

## 2. Utilisateurs et principes de design

**Utilisateur V1** : le gérant ou responsable qui consulte ses avis plusieurs fois par semaine, surtout sur mobile, souvent entre deux tâches.

**Principe central : rassurer avant d'alerter.** L'interface présente toujours le positif en premier et en plus grand. Le négatif est traité comme une tâche à faire, pas comme une alarme.

**Règles d'interface**

- La home s'ouvre sur la météo des 3 derniers mois, jamais sur la liste des avis négatifs. Un sélecteur en tête de carte permet de passer à 30 jours ou à 12 mois.
- Aucun compteur ne repart de zéro le 1er du mois : la météo et la note se lisent sur une période glissante (30 jours, 3 mois par défaut, 12 mois), la file sur 40 jours glissants. On écrit « 3 mois » plutôt que « 90 jours ». Deux avis sévères en début de mois ne doivent pas assombrir tout l'écran.
- Pas de dette affichée : les avis anciens restés sans réponse sont rangés dans un « rattrapage » replié, sans compteur.
- Pas de rouge vif, pas de badge de notification agressif. Les avis négatifs à traiter apparaissent comme une file de tâches, en ton neutre.
- Le contexte rassurant est dit une fois par écran, en une phrase lisible sans calcul : « 12 clients contents sur 17 avis reçus ces 40 derniers jours ».
- Les formulations sont positives et factuelles : « 2 avis à traiter » plutôt que « 2 avis négatifs ! ».
- Les succès sont célébrés : nouvel avis 5 étoiles, meilleure semaine du trimestre, 10 réponses publiées.
- Lecture rapide : chaque écran livre son information principale sans scroll sur un écran de téléphone. Le reste se découvre en défilant.
- Une information ne ressemble jamais à un bouton, et une invitation dit ce qui se passe quand on appuie (« Voir le brouillon »).

**Direction visuelle** : une application mobile sobre, dans l'esprit d'un café japonais. Fond gris brume, cartes blanches aux grands arrondis, encre noire. Une seule couleur forte, le jaune du soleil, et une touche de vert matcha pour ce qui plaît. Le ciel du moment est illustré par un grand disque solaire plus ou moins couvert. Mouvements discrets (entrée des cartes, courbes qui se tracent), coupés si l'utilisateur réduit les animations. Mode clair et sombre. Pas de dashboard dense type BI.

## 3. Périmètre fonctionnel V1

Quatre écrans : Home (météo), À traiter, Tendances, Réglages. Navigation par barre d'onglets en bas.

### 3.1 Home — météo des avis

- Indicateur météo de la période choisie (3 mois par défaut) : illustration (grand soleil, soleil voilé, nuageux, pluie légère) calculée depuis la note moyenne et la part d'avis 4-5 étoiles. Seuils par défaut : grand soleil ≥ 4,7 et ≥ 90 % de 4-5 ★ ; soleil voilé ≥ 4,3 ; nuageux ≥ 3,8 ; pluie légère en dessous. Seuils modifiables dans Réglages.
- Note moyenne sur la période choisie et sur 12 mois glissants, nombre d'avis reçus, évolution par rapport à la période précédente de même durée.
- Phrase de synthèse générée par l'IA, une ligne, ton positif et factuel, qui commence par les clients contents : « 21 clients contents sur 23 avis. Ils citent surtout l'accueil et la rapidité. »
- Le compliment du moment : extrait d'un avis positif récent mis en avant, rotation à chaque ouverture.
- Carte discrète « N avis à traiter » qui mène à l'écran À traiter. Elle ne compte que les avis des 40 derniers jours. Absente s'il n'y a rien à traiter.
- Mini-courbe de la note moyenne sur les 8 dernières semaines. Sélecteur d'établissement en haut de l'écran : météo globale de tous les établissements par défaut, météo d'un établissement en un tap.

### 3.2 À traiter — gestion des avis négatifs

- Liste des avis 1 à 3 étoiles sans réponse publiée reçus dans les 40 derniers jours, du plus récent au plus ancien. Les avis plus anciens sans réponse sont accessibles dans un bloc « Rattrapage » replié en bas d'écran, sans compteur.
- En tête de liste, une seule phrase de contexte sur le climat récent. Chaque carte montre l'auteur, la note, la date, un extrait, la gravité en jauge discrète et l'invitation « Voir le brouillon ».
- Un avis 4 étoiles avec texte critique peut être ajouté à la file si l'IA détecte un problème (réglable).
- Fiche avis : auteur, note, date, texte complet, thèmes détectés, gravité estimée par l'IA (faible, moyenne, forte), bandeau de contexte (« Cet avis fait partie de 17 avis reçus en 40 jours, dont 12 de clients contents »).
- Brouillon de réponse pré-rédigé selon la ligne de conduite (section 4). Boutons : modifier, régénérer avec une consigne (« plus court », « propose un geste commercial »), marquer comme traité sans répondre.
- Publication de la réponse directement sur Google via l'API, après validation explicite. Confirmation visuelle, puis l'avis sort de la file.
- Statuts : à traiter, brouillon prêt, publié, ignoré. Historique des réponses publiées consultable.
- Notes internes privées sur un avis (« client rappelé le 3/10 »). Avis positifs : un petit mot de remerciement pré-rédigé (deux phrases, personnalisé sur ce que le client a dit), publiable en un tap depuis la home, sans passer par la file. Toujours validé par un humain, mais en un geste.

### 3.3 Tendances — page analytique

- Sélecteur de période : 30 jours, 90 jours, 12 mois, personnalisé.
- Deux listes côte à côte : « Ce qui plaît » et « Ce qui revient comme problème », chacune avec les 5 thèmes les plus fréquents, le nombre d'avis concernés et l'évolution par rapport à la période précédente.
- Thèmes issus d'une taxonomie de départ (accueil, délais, qualité, prix, propreté, communication, SAV, à compléter) que l'IA peut étendre. Chaque thème est cliquable et ouvre les avis correspondants avec les passages surlignés.
- Courbe de la note moyenne mensuelle et répartition des étoiles sur la période.
- Taux de réponse et délai moyen de réponse aux avis négatifs.
- Synthèse IA mensuelle de 5 lignes maximum : constats, un point de vigilance, une action suggérée. Exportable en texte ou PDF pour partage à l'équipe.

### 3.4 Réglages

- Connexion du compte Google et choix de la fiche.
- La voix de l'établissement (lot 7, section 12) : signature, personne qui parle, ton, coordonnées de contact, règles par sujet. La ligne de conduite complète reste éditable en texte libre pour qui veut aller plus loin.
- Seuils météo, seuil d'inclusion des avis 4 étoiles dans la file.
- Apparence : claire par défaut, sombre, ou réglage du téléphone. Le choix vaut pour l'appareil.
- Fréquence de synchronisation et activation des notifications push (résumé hebdomadaire et nouvel avis à traiter).
- Clé API du fournisseur IA et choix du modèle.

## 4. Couche IA

L'IA fait trois choses : classer chaque avis, rédiger les brouillons de réponse, synthétiser les tendances. Tout passe par un seul module `ai/` avec un fournisseur interchangeable (Anthropic par défaut, OpenAI ou Ollama en option).

### 4.1 Appels et modèles

| Tâche | Déclencheur | Modèle par défaut | Sortie |
| --- | --- | --- | --- |
| Analyse d'un avis | à chaque nouvel avis synchronisé | Claude Sonnet | JSON : sentiment, thèmes, gravité, résumé en 1 phrase, passages clés |
| Brouillon de réponse | avis entrant dans la file À traiter, ou clic « régénérer » | Claude Opus | texte de réponse, 40 à 120 mots |
| Phrase météo de la home | à la synchronisation quotidienne | Claude Sonnet | 1 phrase |
| Synthèse mensuelle | le 1er du mois et à la demande | Claude Opus | 5 lignes structurées |

Les sorties structurées sont demandées en JSON strict et validées par un schéma (zod) avant stockage. En cas d'échec de parsing, nouvel essai une fois, puis mise en erreur visible.

### 4.2 Ligne de conduite

Texte injecté comme prompt système à chaque génération, avec mise en cache (prompt caching). La version de départ est rédigée dans `docs/ligne-de-conduite.md` et sert à tout établissement qui n'a pas la sienne. Elle part d'un constat : dans un petit commerce, la personne qui répond est la gérante ou le gérant. Une réponse ne renvoie donc jamais à « la direction ». Elle est structurée ainsi :

- Ton : vouvoiement, chaleureux, jamais défensif, pas de jargon.
- Structure imposée : remercier, reconnaître le point précis soulevé, expliquer sans se justifier, proposer une suite concrète (contact direct, geste), signer.
- Interdits : contester publiquement les faits, nommer un employé, promettre un remboursement, répondre à une insulte par une insulte.
- Cas particuliers, une règle par sujet qui revient : le prix (reconnaître le ressenti, dire ce qu'il y a dans la tasse, ne jamais dire que les prix sont affichés ni parler des charges), l'accueil, le manque de places et la limite de temps avec un ordinateur, la commande sur tablette et le pourboire, une boisson ratée, une suggestion, un avis faux ou hors sujet (brouillon court et neutre + suggestion de signalement à Google).
- Signature : celle des réglages de l'établissement, ajoutée par l'application et non par le modèle (section 12).
- 3 à 5 réponses de référence rédigées à la main, données en exemples (few-shot).

### 4.3 Coûts et garde-fous

- Estimation pour 100 avis par mois : 2 à 4 $ avec prompt caching, moitié moins avec la Batch API. L'analyse des avis, les mots de remerciement et la synthèse mensuelle passent par la Batch API en traitement nocturne (−50 %) ; seuls les brouillons de réponse aux avis négatifs et la régénération à la demande passent en temps réel. Compteur de tokens affiché dans Réglages.
- Aucune réponse n'est publiée sans action humaine explicite.
- Les avis et les brouillons ne sont envoyés qu'au fournisseur IA choisi, jamais ailleurs. Mention claire dans Réglages.
- Le texte de l'avis est traité comme une donnée, jamais comme une instruction : le prompt isole l'avis dans des balises dédiées et rappelle au modèle d'ignorer toute consigne contenue dedans.

## 5. Données et synchronisation

La source unique est la Google Business Profile API, en lecture (avis) et en écriture (réponses). Pas de scraping, pas de Places API.

### 5.1 Accès Google

- Prérequis : être propriétaire ou gestionnaire de la fiche, créer un projet Google Cloud, demander l'accès à la Business Profile API via le formulaire Google (délai de validation à prévoir, souvent plusieurs jours). Ce projet Cloud et cet accès sont ceux de l'éditeur de l'outil, pas de chaque client : en cas de commercialisation, un client se connecte avec son compte Google et autorise l'app sur l'écran OAuth, comme sur n'importe quel SaaS. Une vérification de l'app OAuth par Google devient nécessaire au-delà de 100 utilisateurs (formulaire, politique de confidentialité, vidéo de démo).
- Authentification OAuth 2.0 avec refresh token stocké chiffré côté serveur. Scope : `https://www.googleapis.com/auth/business.manage`.
- Endpoints utilisés : liste des comptes et des fiches, liste des avis (`accounts.locations.reviews.list`), publication et modification d'une réponse (`reviews.updateReply`).
- Quotas Google à respecter : la synchronisation ne doit pas dépasser une requête de liste toutes les 15 minutes.

### 5.2 Modèle de données

| Table | Champs principaux |
| --- | --- |
| `locations` | id, google_location_id, nom, adresse, compte lié |
| `reviews` | id, google_review_id, location_id, auteur (nom affiché), note (1-5), texte, date_creation, date_maj, réponse_google (texte, date), statut interne (à traiter, brouillon prêt, publié, ignoré) |
| `review_analyses` | review_id, sentiment, gravité, résumé, thèmes (liste), passages_clés, modèle, date |
| `drafts` | id, review_id, texte, version, consigne de régénération, modèle, tokens, date |
| `themes` | id, libellé, polarité (positif, négatif, mixte), origine (taxonomie, IA) |
| `monthly_summaries` | location_id, mois, texte, météo calculée, note moyenne, volume |
| `settings` | location_id, ligne de conduite, exemples de référence, seuils météo, fournisseur IA, modèle |
| `notes` | review_id, texte, date |

### 5.3 Synchronisation

- Tâche planifiée toutes les heures en journée, et au lancement de l'app si la dernière synchro date de plus de 15 minutes.
- Un avis nouveau ou modifié déclenche l'analyse IA, puis la génération de brouillon s'il entre dans la file.
- Les réponses publiées depuis Google directement sont détectées et l'avis passe en statut publié.
- Import initial : tout l'historique disponible, analysé par lots pour alimenter la page Tendances dès le premier jour.
- Les avis supprimés côté Google sont marqués comme retirés, jamais effacés en base, pour conserver les statistiques.

## 6. Architecture technique

Une PWA légère devant un petit backend qui porte toute la logique : synchronisation, IA, publication. Les clés Google et IA ne quittent jamais le serveur.

```
PWA (front)  ──HTTPS, JSON──▶  Backend API + tâches planifiées  ──▶  Base PostgreSQL
(Home, À traiter, Tendances,    (sync horaire, analyse IA,            (avis, analyses, brouillons,
 installable, lecture hors      brouillons, publication)               réglages, synthèses)
 ligne)                              │                  │
                                     │ OAuth 2.0        │ prompts, JSON strict
                                     ▼                  ▼
                        Google Business Profile API   Fournisseur IA
                        (lecture avis, publication)   (Anthropic par défaut,
                                                       OpenAI ou Ollama en option)
```

Le backend est le seul composant qui parle à Google et au fournisseur IA ; le front ne voit que des données déjà analysées.

**Stack recommandée** (Claude Code est à l'aise avec chacun de ces choix)

- Front : Next.js (App Router) + TypeScript + Tailwind, plugin PWA (`next-pwa` ou Serwist) pour le manifest et le service worker. Graphiques avec Recharts.
- Backend : routes API Next.js pour la V1 (un seul dépôt), tâches planifiées via un cron Vercel ou un worker Node séparé si l'hébergement l'exige.
- Base : PostgreSQL via Supabase (auth, base, cron intégré) ou Prisma + Postgres managé. Validation des données avec zod.
- IA : SDK Anthropic officiel derrière une interface `AiProvider` (`analyzeReview`, `draftReply`, `summarize`), implémentations Anthropic, OpenAI, Ollama.
- Google : client OAuth 2.0 avec `googleapis`, refresh token chiffré en base (AES-256, clé en variable d'environnement).
- Hébergement : Vercel pour le front et l'API, Supabase pour la base. Coût cible : moins de 10 €/mois tout compris hors IA.
- Tests : Vitest pour la logique (calcul météo, parsing des réponses IA), Playwright pour les trois parcours clés.

## 7. Exigences PWA, performance et sécurité

**PWA**

- Installable sur iOS et Android : manifest complet (nom, icônes 192 et 512, couleur de thème, `display: standalone`), service worker avec mise en cache des écrans et des dernières données.
- Mode hors ligne : lecture de la home, de la file et des tendances déjà chargées. Les actions (publier, modifier un brouillon) sont mises en attente et rejouées au retour du réseau, avec indication claire.
- Notifications push : nouvel avis à traiter, résumé hebdomadaire le lundi matin. Désactivables.
- Mobile d'abord, mais utilisable sur desktop avec une mise en page en deux colonnes à partir de 1024 px.

**Performance**

- Première ouverture en moins de 2 s sur 4G ; ouvertures suivantes instantanées grâce au cache.
- Toutes les statistiques de la page Tendances sont précalculées en base à la synchronisation, pas à l'affichage.
- Score Lighthouse PWA et accessibilité ≥ 90.

**Sécurité et confidentialité**

- Authentification de l'utilisateur par Google Sign-In (le même compte que la fiche) ou lien magique par e-mail. Une seule session active en V1.
- Tokens Google et clé IA chiffrés en base, jamais exposés au front, jamais commités (fichier `.env` + `.env.example` documenté).
- Toutes les routes API protégées, vérification de l'appartenance de la fiche à l'utilisateur à chaque requête.
- Les avis contiennent des noms de clients : pas d'envoi à un service tiers autre que le fournisseur IA choisi, pas d'analytics externe en V1.
- Journal des actions sensibles : publication de réponse, modification de la ligne de conduite, changement de clé API.
- Conformité RGPD : les avis sont des données publiques, mais les notes internes sont personnelles. Possibilité d'exporter et de supprimer toutes les données depuis Réglages.

## 8. Hors périmètre V1 et évolutions

La V1 sert les établissements d'un seul franchisé, un utilisateur, Google uniquement. Tout le reste est reporté pour livrer vite.

**Hors périmètre V1**

- Multi-utilisateurs avec rôles (un accès par gérant d'établissement) ; le multi-établissements, lui, est dans la V1.
- Autres plateformes d'avis : Trustpilot, Pages Jaunes, Facebook, TripAdvisor.
- Réponse automatique sans validation humaine.
- Publication entièrement automatique des remerciements aux avis positifs (le mot pré-rédigé est en V1, mais validé en un tap).
- Sollicitation d'avis clients (envoi de lien, QR code).
- Comparaison avec les concurrents.
- Application native (stores).

**Évolutions envisagées, par ordre de valeur**

1. Multi-utilisateurs : un accès par gérant d'établissement, vue globale pour le franchisé.
2. Classement des établissements et alerte quand l'un d'eux décroche par rapport aux autres.
3. Alertes sur rupture de tendance (un thème négatif qui double en un mois).
4. Transformation en SaaS pour d'autres commerçants, ce qui impose le multi-utilisateurs et la facturation.

## 9. Découpage en lots pour Claude Code

Sept lots, chacun livrable et testable seul. Une session Claude Code par lot, avec ce document et le `CLAUDE.md` en contexte. Les lots 3 et 4 peuvent démarrer sur des avis fictifs si l'accès Google n'est pas encore validé.

| Lot | Contenu | Critère d'acceptation |
| --- | --- | --- |
| 0. Socle | Dépôt Next.js + TypeScript + Tailwind, base Postgres, schéma, migrations, auth, `.env.example`, CI avec lint et tests | L'app démarre, l'utilisateur se connecte, la base est créée par migration |
| 1. Connexion Google | OAuth 2.0, choix de la fiche, import initial des avis, synchronisation horaire, détection des réponses publiées | Tous les avis de la fiche sont en base et se mettent à jour sans intervention |
| 2. Couche IA | Interface `AiProvider`, implémentation Anthropic avec prompt caching, analyse par avis en JSON validé, génération de brouillon, synthèse mensuelle, jeu de 20 avis fictifs pour les tests | Sur le jeu de test, 100 % des sorties passent le schéma zod et les brouillons respectent la ligne de conduite à la relecture |
| 3. Home météo | Calcul de la météo, phrase de synthèse, compliment du moment, mini-courbe, carte « à traiter » | L'écran s'affiche en moins de 2 s et reste lisible sans scroll sur un iPhone 13 |
| 4. À traiter | File des avis négatifs, fiche avis, brouillon, modification, régénération avec consigne, publication via Google, statuts, notes internes | Une réponse validée dans l'app apparaît sur Google en moins d'une minute |
| 5. Tendances | Agrégation par thème précalculée, listes « ce qui plaît / ce qui revient », courbe mensuelle, taux de réponse, synthèse IA exportable | Pour 12 mois d'avis, la page se charge en moins de 1 s et les thèmes correspondent à une lecture manuelle d'un échantillon |
| 6. PWA et finitions | Manifest, service worker, hors ligne, notifications push, mode sombre, Lighthouse, tests Playwright des trois parcours | Installable sur iOS et Android, score PWA ≥ 90, trois parcours verts |
| 7. La voix de l'établissement | Réglages de la signature, de la personne qui parle, du ton, des coordonnées et des règles par sujet, avec aperçu sur un vrai avis (section 12) | Changer la signature ou le ton dans Réglages modifie le brouillon suivant sans toucher au code ni au fichier de ligne de conduite |

**État au 4 octobre 2026** : les lots 0, 2, 3, 4 et 5 sont livrés (PR 1). Restent le lot 1 (en attente de l'accès à la Business Profile API), le lot 6 et le lot 7. Le critère du lot 3 est devenu : l'information principale de la home (météo et accès à la file) tient dans le premier écran d'un iPhone 13.

**Ordre conseillé** : 0, 2, 3 (avec données fictives), 1, 4, 5, 6. Le lot 7 peut se faire avant le lot 1 : il ne dépend pas de Google. L'IA et la home avant Google permet de voir le produit très tôt et d'affiner le ton pendant que la validation Google avance.

**Décisions à prendre avant le lot 0**

- [x] Nom du produit : Éclaircie (nom de travail).
- [x] Supabase ou Postgres + Prisma : Postgres avec Prisma, authentification Auth.js.
- [ ] Hébergement : Vercel + Supabase, ou serveur existant.
- [x] Première version de la ligne de conduite et réponses de référence : `docs/ligne-de-conduite.md`.
- [ ] Demande d'accès à la Business Profile API déposée (à faire dès maintenant, le délai est long).

## 10. Structure du dépôt et CLAUDE.md

Un monorepo Next.js suffit en V1. Le fichier `CLAUDE.md` à la racine donne à Claude Code les règles du projet ; ce cahier des charges est copié dans `docs/cdc.md`.

**Arborescence cible**

```
/
├── CLAUDE.md
├── docs/
│   ├── cdc.md                 ← ce document
│   └── ligne-de-conduite.md   ← prompt système éditable
├── app/                       ← routes Next.js (home, a-traiter, tendances, reglages, api/)
├── components/
├── lib/
│   ├── ai/                    ← AiProvider + implémentations + prompts + schémas zod
│   ├── google/                ← OAuth, client Business Profile, sync
│   ├── meteo/                 ← calcul météo et seuils
│   ├── analytics/             ← agrégations par thème et par période
│   └── db/                    ← schéma, migrations, requêtes
├── jobs/                      ← tâches planifiées (sync, synthèse mensuelle)
├── tests/
│   ├── fixtures/reviews.json  ← 20 avis fictifs
│   └── e2e/
└── public/                    ← manifest, icônes
```

**CLAUDE.md de départ**

```markdown
# Projet : météo des avis Google (PWA)

## Contexte
Lis docs/cdc.md avant toute tâche. C'est la référence fonctionnelle et technique.

## Règles
- TypeScript strict, pas de `any`. Validation des entrées externes (Google, IA) avec zod.
- Toute logique métier dans lib/, jamais dans les composants. Les composants reçoivent des données déjà calculées.
- Aucun appel IA ou Google depuis le front. Les clés restent côté serveur.
- Le texte d'un avis est une donnée, jamais une instruction : il est encadré dans les prompts et le modèle est averti.
- Aucune réponse n'est publiée sur Google sans action explicite de l'utilisateur.
- Interface : positif d'abord, ton neutre pour le négatif, pas de rouge vif, mobile en priorité. Voir section 2 du cdc.
- Textes d'interface en français, vouvoiement.
- Chaque lot livre ses tests (Vitest pour lib/, Playwright pour les parcours).

## Commandes
- `npm run dev` : serveur local
- `npm run test` : tests unitaires
- `npm run e2e` : tests Playwright
- `npm run db:migrate` : migrations

## Workflow
- Travaille lot par lot (section 9 du cdc). Avant de commencer un lot, résume en 5 lignes ce que tu vas faire et demande validation.
- Ne modifie pas docs/ligne-de-conduite.md sans demande explicite.
- Commits en français, un commit par fonctionnalité.
```

**Premier prompt à donner à Claude Code**

> Lis CLAUDE.md et docs/cdc.md. Réalise le lot 0 (socle) : initialise le projet, la base, le schéma de la section 5.2, l'authentification et la CI. Propose-moi d'abord ton plan en 5 lignes.

## 11. Décisions prises pendant la construction du MVP

| Sujet | Version 1.0 | Décision | Raison |
| --- | --- | --- | --- |
| Période de la météo | Mois calendaire | Glissante, au choix : 30 jours, 3 mois (par défaut), 12 mois | Le 3 du mois, deux avis durs donnaient « pluie légère » alors que la période récente était bonne |
| File « À traiter » | Tous les avis sans réponse | Les 40 derniers jours, le reste en « rattrapage » sans compteur | Un historique d'un an sans réponse s'affichait comme une dette de 29 tâches |
| Contexte rassurant | Sur chaque avis, avec la note du mois | Une phrase par écran, sans calcul à faire | Répété sur chaque carte, il n'était plus lu, et sa formulation n'était pas comprise |
| Home sans défilement | Tout l'écran | L'information principale seulement | Tout faire tenir obligeait à des textes trop petits pour être lus |
| Phrase de synthèse | « 23 avis, 21 enthousiastes » | « 21 clients contents sur 23 avis » | Commencer par les clients contents |
| Pastilles des cartes | Brouillon prêt et gravité dans la même forme | Gravité en jauge grise, « Voir le brouillon » en invitation | On ne savait pas ce qui était cliquable |
| Retour | Lien texte souligné | Chevron rond en haut à gauche, en plus du geste du téléphone | Une PWA installée n'a pas de barre de navigateur, et le geste ne fonctionne pas à l'ouverture depuis une notification |
| Ton des réponses | Possible renvoi à une hiérarchie | La gérante parle en son nom | L'utilisateur est la direction |

## 12. Lot 7 : la voix de l'établissement

**Objectif** : la gérante règle elle-même la façon dont l'application parle à sa place, depuis l'écran Réglages, sans écrire de consigne technique. Chaque réglage a un effet visible sur le brouillon suivant.

### 12.1 Ce que l'utilisateur règle

Par ordre de valeur. Les huit points sont livrés le 4 octobre 2026.

1. **Signature.** Un champ libre par établissement, par exemple « Valentine, The Coffee Jacobins » ou « L'équipe The Coffee Jacobins ». Elle est ajoutée à la fin de chaque réponse et de chaque remerciement par l'application, pas par le modèle : elle est donc toujours exacte, et la changer met à jour les brouillons non publiés sans les régénérer.
2. **Qui parle.** Deux choix : « je » (la gérante en son nom) ou « nous » (l'équipe). Dans les deux cas, jamais de renvoi à une direction.
3. **Ton.** Trois réglages simples plutôt qu'un texte à rédiger : registre (sobre, chaleureux, complice), longueur (courte, moyenne), emojis autorisés. Pour les emojis, un tableau s'ouvre et la gérante touche ceux qu'elle autorise, six au plus. L'IA ne pioche que dans cette sélection, un seul par réponse et jamais sur un avis difficile. Aucun emoji choisi : aucun emoji dans les réponses.
4. **Aperçu.** À chaque enregistrement, un brouillon est généré sur le dernier avis à traiter avec les nouveaux réglages, et affiché sous le formulaire. Il n'est pas stocké et ne remplace pas le brouillon de cet avis.
5. **Coordonnées pour la suite.** L'adresse e-mail ou le téléphone à proposer quand une réponse invite à poursuivre l'échange. Sans coordonnées, la réponse propose de revenir au comptoir, jamais un « message privé » vague.
6. **Règles par sujet.** Pour chaque sujet qui revient (prix, places, ordinateur, tablette et pourboire), une phrase « ce que je veux dire » et une liste « ce que je ne veux pas dire », préremplies depuis `docs/ligne-de-conduite.md`. Quand un thème revient souvent dans Tendances et n'a pas de règle, l'application propose d'en créer une.
7. **Mots à éviter.** Une liste courte de mots ou de tournures que la gérante ne veut jamais lire dans ses réponses.

8. **Apprendre de mes corrections.** Une case dans Réglages, activée par défaut et expliquée en clair. Quand la gérante réécrit vraiment un brouillon avant de le publier (pas une simple virgule), sa version est retenue et donnée au modèle comme réponse de référence. Les 8 dernières corrections sont utilisées. La liste est visible dans Réglages et chaque correction peut être retirée. Décocher la case arrête à la fois la collecte et l'utilisation.

### 12.2 Fonctionnement

- Les réglages sont stockés par établissement dans `settings` : signature, personne, registre, longueur, emojis, apprentissage, puis coordonnées, règles par sujet et mots à éviter. Les corrections retenues ont leur table, `corrections`.
- Les brouillons sont stockés sans signature.
- La ligne de conduite envoyée au modèle est composée à chaque génération : le texte de base, puis les réglages traduits en consignes, puis toutes les règles par sujet. Ce bloc reste identique d'un avis à l'autre, ce qui permet de le mettre en cache.
- Sur la fiche d'un avis, un message signale tout mot à éviter présent dans le brouillon, quel que soit le modèle.
- Le modèle reçoit la consigne de ne pas signer. La signature est ajoutée ensuite, et retirée avant toute régénération.
- Le fournisseur simulé applique la personne, la longueur, les coordonnées et la règle du sujet concerné, pour que la démonstration et les tests réagissent aux réglages sans clé API. Le ton, l'emoji, les mots à éviter et les corrections retenues ne prennent effet qu'avec le vrai modèle.
- Toute modification de ces réglages est journalisée (section 7).

### 12.3 Critères d'acceptation

- Changer la signature dans Réglages change la fin de tous les brouillons non publiés, sans appel à l'IA.
- Publier une réponse réécrite l'ajoute aux corrections retenues ; publier un brouillon inchangé ou à peine retouché n'ajoute rien ; case décochée, rien n'est retenu ni utilisé.
- Passer de « nous » à « je » puis régénérer un brouillon donne une réponse à la première personne du singulier.
- Sur le jeu d'avis de test, aucune réponse ne contient « la direction », un mot de la liste à éviter, ni deux signatures.
- Un avis qui parle du prix reçoit une réponse qui suit la règle « prix » de l'établissement.
- L'écran Réglages reste utilisable d'une main sur un téléphone : pas de champ de consigne technique, aperçu visible sans quitter l'écran.
- Les réglages sont rangés par importance en quatre sections titrées (signature, ton, sujets, apprentissage), avec un seul bouton d'enregistrement toujours visible.

