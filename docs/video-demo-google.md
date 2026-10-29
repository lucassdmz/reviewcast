# Vidéo de démonstration pour Google

Sert à deux demandes : l'accès à la Business Profile API (en pièce jointe d'une réponse au dossier 7-4432000041357, si Google demande des précisions) et, plus tard, la validation de l'écran d'autorisation OAuth (obligatoire pour passer en production avec l'autorisation `business.manage`).

## Ce que Google veut voir

- L'écran d'autorisation Google en entier, avec le nom de l'app, et l'URL de la barre d'adresse où l'on voit l'ID client OAuth (`client_id=…`).
- Chaque usage de l'autorisation demandée : lecture des fiches, lecture des avis, publication d'une réponse.
- Que rien n'est publié sans action explicite de l'utilisateur.
- Le lien vers la politique de confidentialité.

## Préparation

- Format : enregistrement d'écran, 1 min 30 à 2 min 30, mis en ligne sur YouTube **non répertorié**. Google refuse les fichiers privés.
- Langue : interface en français, sous-titres ou voix off en anglais. Les phrases à dire sont ci-dessous.
- Navigateur de bureau, fenêtre réduite à une largeur de téléphone, zoom 100 %, barre d'adresse visible.
- Pour le passage OAuth : vrais identifiants du projet Eclaircie, compte lucas@keeplinking.fr (testeur). Pour la suite, si l'accès API n'est pas encore accordé, mode démo (`MODE_DEMO=1`, IA et publication simulées) : le dire à voix haute.
- Les vrais avis The Coffee contiennent des noms de clients : flouter les noms au montage, ou utiliser les avis fictifs du seed.

## Déroulé

| Temps | À l'écran | À dire (anglais) |
|---|---|---|
| 0:00 | Page de connexion d'Éclaircie, lien « Politique de confidentialité » visible | "This is Éclaircie, a review management tool for small cafés and shops, published by Keep Linking in Lyon, France." |
| 0:10 | Clic sur « Se connecter avec Google » | "The business owner signs in with the Google account that manages their Business Profile." |
| 0:15 | Écran d'autorisation Google. S'arrêter 3 secondes sur le nom de l'app et sur l'autorisation « Gérer vos fiches d'établissement ». Montrer l'URL avec `client_id` | "Here is the consent screen for project Eclaircie. We request the business.manage scope, to read the owner's locations and reviews and to post the replies they approve." |
| 0:30 | Choix de l'établissement | "We list the locations this account manages. The owner picks theirs." |
| 0:40 | Accueil : météo des avis, carte des clients contents | "Reviews are read through the API and summarized: most customers are happy, and the app says so first." |
| 0:55 | Onglet À traiter, ouverture d'un avis négatif | "Negative reviews waiting for an answer are listed here." |
| 1:05 | Le brouillon proposé, modification d'une phrase à la main | "The app drafts a reply. The owner reads it and edits it freely." |
| 1:20 | Bouton « Publier sur Google », écran de confirmation, validation | "Nothing is posted automatically. The reply is published only when the owner confirms here." |
| 1:35 | Confirmation visuelle, l'avis sort de la file. Si l'accès est accordé : la réponse visible sur la fiche Google | "The reply is now live on Google, and the review leaves the queue." |
| 1:50 | La page Politique de confidentialité | "Owners can revoke access at any time from their Google account, and our privacy policy explains how Google user data is used, under the Limited Use requirements." |
| 2:05 | Fin | "Thank you." |

## Après l'enregistrement

- Coller le lien YouTube dans la réponse au dossier Google, ou dans le formulaire de validation OAuth (Google Auth Platform › Centre de validation).
- Garder la vidéo à jour : si l'écran de publication change, la refaire avant toute nouvelle demande.
