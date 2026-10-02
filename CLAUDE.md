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
