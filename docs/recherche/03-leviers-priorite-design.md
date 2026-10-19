# Éclaircie, écran d’accueil : recherche sur la priorisation, les leviers de note et les patterns de design

Recherche web du 19/10/2026. Chaque affirmation est rattachée à une source (liste en fin de document). Légende de fiabilité :

- **[P]** source primaire (Google, texte de loi, article académique publié)
- **[S]** source secondaire fiable (presse, résumé d’éditeur de l’étude)
- **[V]** source vendeur ou praticien (intérêt commercial, méthodologie partielle)
- **[?]** non vérifié ou contradictoire, à confirmer avant de l’écrire dans l’app

---

## A. Qu’est-ce qui rend un avis « important » ? (score de priorité)

### A.1 Comment Google trie les avis (« Les plus pertinents »)

- **Google ne publie pas la formule.** La page d’aide officielle sur la note dit seulement que la note est « the average of all ratings published on Google » et que la mise à jour peut prendre « jusqu’à 2 semaines ». Elle ne dit rien du tri. [P]
- **Signaux cités par la communauté** (réponse d’un Product Expert sur le forum Google, donc pas une position officielle) : longueur (200 caractères et plus), spécificité, auteur Local Guide, mots-clés, présence de photos. La note en étoiles ne serait pas le moteur, ce qui explique que des avis négatifs remontent en tête. [?]
- **Tests Sterling Sky (agence SEO local, Joy Hawkins)** [V] :
  - Les avis de Local Guides restent plus longtemps dans le top 10 que les autres ; les avis d’auteurs avec photo de profil y restent « environ deux fois plus longtemps » dans la plupart des secteurs testés. Le nombre d’avis ou de photos postés ailleurs par l’auteur n’a aucune corrélation. Les avis longs restent plus longtemps. Pas de tailles d’échantillon publiées, données de 2022.
  - Pas de « diversité d’étoiles » forcée : les 1★ restent à peine plus longtemps en tête que les 5★ ; les **4★ restent le plus longtemps** (non expliqué). Les avis récents tendent à rester plus longtemps en haut, « mais pas toujours » (exemple : deux avis négatifs de plus de 4 mois en tête malgré beaucoup d’avis récents).
- **Conséquence pour Éclaircie** : on ne peut pas reproduire le tri de Google, mais on peut estimer une **probabilité d’exposition** (longueur, photo, Local Guide, photo de profil, récence). Un avis négatif long, illustré, écrit par un Local Guide est probablement celui que les prospects voient en premier.

### A.2 Ce que les clients lisent vraiment

BrightLocal, Local Consumer Review Survey 2025 (n = 1 026 adultes américains) [V, mais référence du secteur] :

- 4 % ne lisent jamais d’avis.
- 48 % lisent d’abord le **résumé IA**, puis une sélection d’avis ; 18 % décideraient sur le seul résumé.
- Récence : seuls 20 % estiment qu’un avis doit dater de moins de deux semaines pour compter (−7 points vs 2024) ; près de 10 % disent que la récence n’a aucun impact. Les attentes de récence baissent.
- Réponses : 7 % n’attendent pas de réponse ; **63 % attendent une réponse dans un délai de 2-3 jours à une semaine**. Les consommateurs préfèrent nettement les entreprises qui répondent à tous les avis (écart qualifié d’« énorme », chiffre non donné dans le texte).
- 4 points de plus qu’en 2024 disent que la note en étoiles n’influence pas leur décision : le texte des avis prend le relais.

Spiegel Research Center (Northwestern, 2017, données e-commerce, pas commerce local) [P/S] :

- Un produit avec 5 avis a une probabilité d’achat **270 % supérieure** à un produit sans avis ; les gains décroissent après environ 5 avis.
- La probabilité d’achat **culmine entre 4,0 et 4,7** puis baisse en approchant 5,0 (le « trop parfait » rend méfiant). Le chiffre « 4,2-4,5 » qui circule n’est pas celui de Spiegel. [P]

Chevalier & Mayzlin (Journal of Marketing Research, 2006, livres sur Amazon et Barnes & Noble) [P] : « pour la plupart des échantillons », l’impact d’un avis 1★ est **supérieur** à celui d’un avis 5★. Explication des auteurs : les 1★ sont rares et plus crédibles. Effet mesuré sur les ventes relatives, contexte livres.

Womply (2019, ~200 000 TPE américaines, corrélations, éditeur de logiciel) [V] :

- Note Google moyenne de 1 à 1,5 : 33 % de CA en moins que la moyenne (19 % sur Yelp, 9 % sur Facebook). Les mauvais avis Google coûtent plus cher que ceux des autres plateformes.
- Note de 4 à 4,5 : +28 % de CA ; les entreprises à 5,0 gagnent moins que celles à 1-1,5 (souvent récentes, peu d’avis).
- Plus de 82 avis : +54 % de CA.

Luca (Harvard Business School, Yelp, Seattle) [S] : +1 étoile ≈ +5 à 9 % de CA pour les **restaurants indépendants**, aucun effet pour les chaînes. Identification par régression sur discontinuité de l’arrondi Yelp (à la demi-étoile). Pertinent pour un café indépendant lyonnais. [Année de publication exacte non confirmée par mes sources.]

### A.3 Photos et longueur : plus d’influence ?

- PowerReviews (7,8 M d’avis, e-commerce) : la **longueur** est la caractéristique la plus corrélée aux votes « utile ». [V]
- Han et al. (Tilburg, TripAdvisor hôtels, article à comité de lecture) : effet des photos sur l’utilité perçue en **U inversé** selon l’esthétique, modéré par la longueur du texte ; une expérience confirme un lien causal. Les photos aident, mais pas linéairement. [P]
- Sondage commandé par Yelp (1 500 consommateurs) : 59 % préfèrent des avis moyens de 16 à 50 mots, 24 % courts, 14 % longs. Commanditaire intéressé. [V]
- **Aucune étude publique ne mesure directement l’effet photo/longueur sur le tri Google.** [?]

### A.4 Ce que fait une réponse à un avis négatif (pour les futurs lecteurs)

- **Proserpio & Zervas (Marketing Science, 2017)** [P] : sur TripAdvisor (comparé à Expedia où les hôtels ne répondent pas, différence en différences), les hôtels qui commencent à répondre gagnent en moyenne **+0,12 étoile** et **+12 % de volume d’avis**. Mécanisme : pas d’amélioration de la qualité, mais les clients mécontents deviennent moins enclins à poster des avis négatifs sans fondement, et les avis négatifs deviennent plus longs et plus détaillés. Selon une couverture secondaire de leur article HBR (2018), environ un tiers des hôtels ont gagné une demi-étoile arrondie dans les 6 mois suivant leur première réponse. [S pour ce dernier chiffre]
- **Wang & Chaudhry (Journal of Marketing Research, 2018)** [P, résumé uniquement] :
  - Répondre aux **avis négatifs** améliore les notes des avis **suivants**, à condition que la réponse soit visible au moment où le prochain client écrit.
  - Répondre aux **avis positifs** a un effet **négatif** sur les notes suivantes.
  - Une réponse **personnalisée** (spécifique au contenu) **amplifie** les deux effets : le positif pour les réponses aux négatifs, le négatif pour les réponses aux positifs.
- Sparks, So & Bradley (Tourism Management, 2016, expérience) [P] : une réponse **rapide** et à **voix humaine** produit de meilleures inférences de confiance et de « souci du client » ; la source (manager ou équipe) et le cadrage importent peu.
- Chen, Gu, Ye & Zhu (Information Systems Research, 2018) [P] : les réponses augmentent le volume d’avis suivants, sans effet visible sur la note dans leur contexte. Résultat à garder en tête : l’effet note n’est pas universel.
- Sondage Kelton pour Yelp (2021, n = 1 500) : 88 % disent qu’un avis négatif ne les empêcherait pas d’aller dans l’établissement s’ils voient qu’il a été traité de manière proactive. [V]

### A.5 Répondre aux avis positifs : utile ou pas ?

Les sources se contredisent, il faut le dire franchement dans le produit :

- Wang & Chaudhry : répondre aux positifs fait **baisser** les notes suivantes, surtout si la réponse est personnalisée. [P]
- Google (page officielle « Tips to get more reviews ») : « Instead of sending the same "thank you" to everyone, focus on reviews where you can share a helpful update ». Google décourage les remerciements génériques. [P]
- BrightLocal 2025 : les consommateurs préfèrent les entreprises qui répondent à tous les avis. [V]
- Womply : répondre à au moins 25 % des avis est associé à +35 % de CA (corrélation). [V]

**Lecture proposée** : répondre aux positifs reste une attente sociale, mais ce n’est **jamais la priorité** de l’écran d’accueil. La carte « avis qui fait sourire » sert d’abord le moral du gérant ; la réponse proposée doit être courte, et seulement si elle apporte quelque chose (une nouveauté, une réponse à une question).

### A.6 Faux avis, hors sujet, et quand signaler à Google

Politique officielle de contenu Google Maps [P] :

- Interdit : faux engagement (« Reviews or ratings that have been paid for, directly or in kind »), conflit d’intérêts (y compris « current or former employment »), contenu hors sujet (« Only post content that is based on your experience »), commentaires politiques/sociaux/personnels hors sujet, publicité, posts répétés ou dénués de sens, harcèlement, propos haineux, insultes, informations personnelles d’autrui, usurpation d’identité.
- Page « Report policy-violating reviews » [P] : signalement via le **Reviews Management Tool** ; évaluation « typically takes several days » ; **un seul appel** par avis signalé, jusqu’à 10 avis par soumission d’appel. Surtout : « Do not report a review just because you disagree with it or dislike it ». Google n’arbitre pas les litiges factuels.
- Détection automatique par Google de schémas suspects (pic de 1★ ou de 5★ sur une courte période), selon un fil de la communauté Google Maps. [S]

**Règle pour Éclaircie** : la carte « Signaler » ne s’affiche que pour un motif de politique identifiable (hors sujet, employé/concurrent identifié, insultes, données personnelles, doublon, avis manifestement destiné à un autre établissement). Un avis négatif légitime ne doit jamais être proposé au signalement : on y répond.

### A.7 Vitesse de réponse

- Google : « Respond in a timely manner », sans délai chiffré. Les réponses passent une modération qui prend « usually up to 10 minutes » mais jusqu’à 30 jours. Le client est notifié de la réponse et **peut modifier son avis** ensuite. [P]
- BrightLocal 2025 : 63 % attendent une réponse sous 2-3 jours à une semaine. Un blog SEO rapporte 19 % attendant une réponse le jour même en 2026 (6 % l’année précédente). [V, ce dernier chiffre est de seconde main : ?]
- Sparks et al. 2016 : la rapidité améliore la confiance perçue. [P]
- **Aucune étude trouvée ne chiffre un seuil (heures contre jours).** [?]

### A.8 Score de priorité proposé (explicable)

Principe : le score ne s’applique **qu’aux avis sans réponse**. Les avis qui relèvent d’un signalement sortent du score de réponse et vont dans une file « Signaler » distincte.

```
Priorité = 100 × (0,35·Gravité + 0,25·Exposition + 0,20·Fraîcheur + 0,20·Actionnabilité)
```

| Facteur | Poids | Calcul (0 à 1) | Pourquoi |
|---|---|---|---|
| **Gravité** | 35 % | 1★ = 1,0 ; 2★ = 0,85 ; 3★ = 0,6 ; 4★ avec reproche = 0,4 ; 4★ sans reproche = 0,1 ; 5★ = 0,05 | Les 1★ pèsent plus que les 5★ sur la décision (Chevalier & Mayzlin). Répondre aux négatifs améliore les notes suivantes (Wang & Chaudhry ; Proserpio & Zervas). Un 3★ ou un 4★ avec reproche est convertible : le client est notifié de la réponse et peut modifier son avis (Google). |
| **Exposition** | 25 % | 0,40·min(caractères/200 ; 1) + 0,25·photo + 0,15·Local Guide + 0,10·photo de profil + 0,10·votes « utile » | Approximation de la probabilité d’apparaître en tête de « Les plus pertinents » (forum Google, tests Sterling Sky). Hypothèse, pas de formule Google publiée. |
| **Fraîcheur** | 20 % | ≤ 48 h : 1,0 ; 2-7 j : de 1,0 à 0,6 ; 7-30 j : de 0,6 à 0,3 ; > 30 j : 0,2 (plancher) | Fenêtre d’attente des clients (BrightLocal : 2-3 jours à une semaine), effet de la rapidité (Sparks). Le plancher existe parce qu’un vieux négatif sans réponse reste visible, et que la réponse sert les lecteurs futurs, pas seulement l’auteur (Wang & Chaudhry). |
| **Actionnabilité** | 20 % | +0,5 si l’avis pose une question ou contient une information factuelle à corriger (horaires, prix, produit) ; +0,5 si le thème revient dans d’autres avis des 60 derniers jours | Google conseille de cibler les avis où l’on peut « share a helpful update ». Un thème récurrent signale un problème à corriger à la source, levier le plus durable sur la note. |

Règles d’affichage :

- **L’écran d’accueil montre un seul avis** : le score le plus élevé, avec la phrase d’explication générée à partir des facteurs dominants (ex. : « 1★ d’hier, long et avec photo, probablement visible en tête de votre fiche »). L’explicabilité est la condition pour que le gérant fasse confiance au tri.
- Les poids sont des **hypothèses de conception**, pas des valeurs calibrées par la recherche. À calibrer avec les données d’usage (taux de réponse, avis modifiés après réponse, évolution de la note).
- Carte « avis qui fait sourire » : 5★ des 14 derniers jours, texte le plus long et le plus spécifique (prénom d’un membre de l’équipe, produit cité), photo en bonus, jamais deux fois le même.

---

## B. Améliorer sa note Google vite ET légitimement

### B.1 Arithmétique de la moyenne

Google affiche la **moyenne simple** de toutes les notes publiées (page officielle) [P]. Aucune source primaire n’établit de pondération par récence dans la note affichée : c’est un mythe entretenu par des sites d’outils. La récence peut en revanche jouer sur le **classement local** (test Sterling Sky : un client a perdu des positions quand son flux d’avis s’est arrêté et en a regagné à la reprise). [V]

Affichage arrondi au dixième. Un 4,7 affiché correspondrait à une moyenne réelle entre 4,650 et 4,749 (arrondi classique) selon des sites tiers ; Google ne documente pas la règle d’arrondi. [?] Mise à jour de la note : jusqu’à 2 semaines. [P]

Formule : pour passer d’une moyenne réelle *m* avec *N* avis à un seuil d’affichage *s* (ex. 4,45 pour afficher 4,5) avec uniquement des 5★ :

```
n ≥ N × (s − m) / (5 − s)
```

Cas du brief, **4,4 affiché avec 180 avis**, cible 4,5 affiché (seuil 4,45) :

| Moyenne réelle derrière « 4,4 » | 5★ nécessaires (sans autre avis) |
|---|---|
| 4,350 (bas de la plage) | 33 |
| 4,400 (milieu) | 17 |
| 4,449 (haut de la plage) | 1 |

Chaque nouvel avis 1★ à ce niveau coûte environ (4,45 − 1) / (5 − 4,45) ≈ **6,3 avis 5★** supplémentaires. Un 4★ abaisse aussi la moyenne quand elle dépasse 4. Pour viser **4,6 affiché** depuis 4,400 exact : 60 avis 5★.

**Conséquence produit** : Éclaircie dispose de tous les avis via l’API, il peut **calculer la moyenne exacte** et afficher « encore 17 avis 5★ pour passer à 4,5 », un objectif concret façon anneau Apple. Attention : les avis supprimés par Google ou filtrés peuvent faire diverger le calcul local de la note affichée. [?]

### B.2 Leviers prouvés ou documentés

1. **Demander à tous les clients, sans filtrer.** Askalidis, Kim & Malthouse (Decision Support Systems, 2017 ; 238 809 avis, 4 distributeurs) [P] : les avis **sollicités par e-mail** ont une moyenne de **4,3** contre **3,88** pour les avis spontanés ; les avis spontanés baissent avec le temps, les avis sollicités restent stables. Explication : les mécontents s’expriment spontanément, les satisfaits seulement si on leur demande. C’est le levier le plus puissant et il est légal, à condition de demander à **tout le monde**.
2. **Lien court ou QR code officiel Google** [P] : depuis le profil, « Read Reviews » puis « Get more reviews » ; le QR code ne se génère que depuis un navigateur d’ordinateur. Google suggère : reçus, e-mails de remerciement, fin de conversation, QR imprimé en boutique, WhatsApp, Facebook. Le client doit être connecté à un compte Google.
3. **Moment de la demande** : BrightLocal 2025 [V], restauration : **48 % s’attendent à une demande le lendemain au plus tard, dont 24 % le jour même**. L’e-mail est le canal jugé le plus efficace (40 %), le face-à-face 27 %. Pour un café sans e-mail client : QR ou carte NFC au comptoir et sur les tables, demande orale au moment du paiement, lien sur le ticket.
4. **Cartes NFC/QR au comptoir** : aucune étude de cas indépendante avec chiffres avant/après trouvée, uniquement des affirmations de vendeurs. [?] Méthode recommandée : mesurer 4 à 8 semaines de référence (avis/semaine), installer, comparer.
5. **Répondre aux négatifs** : +0,12★ et +12 % de volume en moyenne (Proserpio & Zervas), amélioration des notes suivantes (Wang & Chaudhry). Réponse spécifique, humaine, rapide.
6. **Corriger le problème récurrent** : c’est la seule façon d’agir sur les futurs avis spontanés (ceux qui tirent la moyenne vers le bas d’après Askalidis et al.). Éclaircie doit détecter les thèmes récurrents dans les négatifs (attente, température, prix, accueil) et les remonter comme action.
7. **Signaler les avis contraires à la politique** (et seulement eux), via le Reviews Management Tool.

### B.3 Limites légales

**Google** [P] :

- Interdit : « Offer incentives – such as payment, discounts, free goods and/or services » ; « Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers » (= **review gating** interdit) ; avis en conflit d’intérêts (employés, anciens employés).
- Pas d’incitation ni pour obtenir un avis ni pour en faire retirer un négatif.
- Zone grise : Sterling Sky cite un client qui récompensait ses **employés** (tirage au sort hebdomadaire de 5 à 50 $) quand un client citait leur nom dans un avis, et affirme que ce n’est pas contraire aux règles de Google. [V] La politique Google ne le dit pas explicitement : **à éviter** dans Éclaircie, cela pousse au filtrage des clients.

**Union européenne, directive Omnibus 2019/2161** (applicable depuis le 28/05/2022), points 23 ter et 23 quater ajoutés à l’annexe I de la directive 2005/29 (pratiques réputées déloyales en toutes circonstances) [P via commentaires juridiques] : affirmer que des avis émanent de vrais clients sans mesures raisonnables de vérification ; publier ou faire publier de faux avis, ou **déformer** des avis pour promouvoir des produits.

**France** [P] :

- Code de la consommation, **art. L. 121-4, 27° et 28°** (ordonnance n° 2021-1734) : pratiques commerciales réputées trompeuses : affirmer sans vérification que des avis émanent de consommateurs ; « diffuser ou faire diffuser [...] des faux avis [...] ou modifier des avis de consommateurs ».
- **Art. L. 111-7-2** et décret : toute personne qui collecte, modère ou publie des avis doit informer de façon loyale, claire et transparente sur leurs modalités de publication et de traitement, et indiquer si une **contrepartie** a été proposée. Concerne surtout un professionnel qui affiche lui-même des avis (sur son site, par exemple). [P]
- Sanctions : 2 ans d’emprisonnement et 300 000 € d’amende (art. L. 132-2) ; depuis la loi n° 2024-420 du 10 mai 2024, **circonstance aggravante en ligne** : jusqu’à 5 ans et 750 000 € pour une personne physique, avec des plafonds proportionnels au CA. [S, à vérifier sur Légifrance avant de l’écrire dans l’app]
- DGCCRF : enquêtes répétées sur les faux avis, suppression ou retard de publication des négatifs, achat d’avis à des sociétés d’e-réputation ; 35 % de non-conformité dans une enquête citée. [S]
- Proposition de loi Sénat n° 488 (2025) visant notamment la vérification d’identité des auteurs : statut non vérifié. [?]

**Ce qu’Éclaircie ne doit jamais faire** : écran « Êtes-vous satisfait ? » qui renvoie les 4-5★ vers Google et les 1-3★ vers un formulaire privé (gating, interdit par Google et assimilable à une déformation des avis) ; réduction ou cadeau contre un avis ; demande ciblée sur les seuls clients connus comme satisfaits. Plusieurs concepts Dribbble et templates de marché (Upwork) proposent exactement ce gating : c’est un anti-modèle.

### B.4 Résultats chiffrés publiés

- Hôtels TripAdvisor qui commencent à répondre : +0,12★, +12 % d’avis (Proserpio & Zervas). [P]
- Avis sollicités : 4,3 contre 3,88 pour les spontanés (Askalidis et al.). Verified buyers 4,34 contre 3,89 anonymes (PowerReviews/Spiegel, 2015). [P/S]
- Restaurants indépendants : +1★ Yelp ≈ +5 à 9 % de CA (Luca). [S]
- TPE répondant à ≥ 25 % des avis : +35 % de CA par rapport à la moyenne ; jamais de réponse : −9 % (Womply, corrélation). [V]
- **Aucune étude de cas de café ou de commerce indépendant avec chiffres avant/après vérifiables n’a été trouvée.** Ne rien inventer dans l’app : afficher les données propres de l’utilisateur.

---

## C. Patterns de design pour un « briefing du jour »

### C.1 Benchmark produit

| App | Mécanique centrale | À reprendre pour Éclaircie |
|---|---|---|
| **Oura** (Readiness) | Score 0-100 + « contributeurs » (9 dans l’aide actuelle), chacun comparé à **la moyenne personnelle** ; bandes Optimal 85-100, Good 70-84, Fair 60-69, Pay attention < 60. Refonte oct. 2025 : onglet **Today** avec les scores en haut et **une seule « big thing »** par jour, contextuelle selon l’heure, pensée comme la page « Top Stories » d’une app d’info. | La note en héros, avec des contributeurs sous elle (volume du mois, taux de réponse, délai de réponse, tendance des 30 derniers jours). Comparer à **sa propre** moyenne passée, pas à une norme abstraite. Une seule chose importante par jour. |
| **Whoop** (Recovery) | Un pourcentage calculé **une fois le matin**, fixe dans la journée ; 3 zones de couleur (vert 67-99, jaune 34-66, rouge 1-33). Whoop reconnaît que les couleurs simplifient une échelle continue. | Un état du jour stable et lisible en une couleur (« Grand beau », « Nuageux », « Averse » : le nom Éclaircie s’y prête). Calculé à l’ouverture, pas recalculé en permanence pour éviter l’anxiété. |
| **Apple Fitness** (anneaux) | Trois objectifs quotidiens à fermer. Le HIG interdit de réutiliser les anneaux pour d’autres données. | Reprendre l’idée d’un **objectif fermable** (« 3 avis à répondre cette semaine », « 17 avis 5★ avant 4,5 ») mais **pas** la forme des anneaux, réservée par Apple. |
| **Gentler Streak** | Apple Design Award 2024 (Impact social). « Activity Path » qui suggère du repos ; un jour de repos ne casse pas la série ; mode maladie/vacances qui masque le suivi. | Ton bienveillant : pas de culpabilisation quand il n’y a pas d’avis, mode « fermeture annuelle ». Pour un gérant de café épuisé, c’est la bonne référence émotionnelle. |
| **Duolingo** (séries) | Série quotidienne, gel de série, notification avant la perte. Tests publiés : séparer objectif quotidien et série = +3,3 % de rétention à J14 ; pari de série = +14 % à J7. | Une série douce (« 12 jours sans avis négatif laissé sans réponse ») avec un gel automatique les jours de fermeture. Ne pas transformer les avis en jeu : la récompense porte sur la réponse, jamais sur la note. |
| **Copilot Money** | À l’ouverture, le tableau de bord montre les transactions **arrivées depuis la dernière visite**, groupées par jour, à marquer « revues » (individuellement ou en lot) ; pastille pour les non revues. | Bloc « Depuis votre dernière visite : 3 nouveaux avis », avec un geste « vu » et une pastille sur les avis non lus. Le sentiment de clôture vient du marquage. |
| **Monzo** | Accueil consolidé avec des « spotlights » sur le solde, les factures, les dépenses ; mise en page réordonnable. Retours communautaires mitigés : trop de fonctions entassées sur l’accueil. | Leçon négative autant que positive : un accueil qui accumule devient illisible. Quatre blocs maximum, ceux du brief. |
| **Robinhood** | Confettis après les premiers trades, **retirés en mars 2021** après une plainte du régulateur du Massachusetts sur la gamification. | La célébration doit récompenser une bonne action (avoir répondu), jamais un comportement risqué. Rester sobre. |
| **Flighty** | Métaphore du tableau des départs, « presque ennuyeusement évident » selon le fondateur ; états qui changent selon le moment ; incertitude exprimée en clair (« probabilité de prolongation 30-60 % »). | Dire honnêtement l’incertitude (« Google peut mettre jusqu’à 2 semaines à mettre à jour votre note »). États contextuels : matin = briefing, soir = bilan. |
| **Superhuman** | À l’inbox zero, une **photo choisie à la main** chaque jour (rapporté par des utilisateurs et un blog Superhuman). | Quand tous les avis ont une réponse : un état « Éclaircie » avec une belle image (une photo de Lyon, la devanture du café). C’est le moment de plaisir le plus naturel du produit. |
| **Linear** (Triage) | File d’entrée avec 4 décisions au clavier : accepter, doublon, refuser, mettre en attente (réapparaît à une date ou à une nouvelle activité). Propriétaire explicite de la file. | Sur chaque avis, 3 décisions seulement : **Répondre**, **Signaler**, **Plus tard**. « Plus tard » réapparaît le lendemain. Si plusieurs personnes gèrent, qui s’en occupe. |
| **Things 3** (Today) | Aujourd’hui = agenda en haut + tâches + section « Ce soir » ; bascule automatique à minuit. | Séparer « à faire maintenant » et « ce soir après la fermeture » (répondre à froid à un avis blessant). |
| **Arc Search** (Browse for Me) | Page générée : réponse en haut, puis titres de section, images, sources en bas. Fiabilité non garantie, échecs constatés. | Un résumé en une phrase en haut (« Semaine calme, un avis à traiter »), sources cliquables (les avis eux-mêmes). |
| **Apple Intelligence** (résumés de notifications) | Résumés d’infos suspendus en janvier 2025 après une erreur grave signalée par la BBC ; ajout d’un avertissement « Summaries may contain errors » et du **texte IA en italique**. | Tout texte généré par l’IA (résumé, brouillon de réponse) doit être **visuellement distingué** et **jamais publié sans validation**. Ne pas résumer un avis négatif de façon qui en change le sens. |
| **Apple Weather** | Prévision minute par minute sur l’heure, alertes météo officielles, changements notables (« plus chaud demain »), modules détaillables. [Ordre exact des modules non documenté.] | La métaphore météo est déjà dans le nom : note = température, tendance = « plus chaud que la semaine dernière », alerte = avis négatif non traité. |

### C.2 Concepts Dribbble et Behance (corpus faible)

Constat : sur Dribbble, quasiment tous les concepts « review management » sont des tableaux de bord **desktop** SaaS ou des landing pages ; très peu d’écrans mobiles pensés pour un gérant seul. Behance n’a rien donné d’exploitable dans mes recherches.

- **Getpin, Mobile Local Analytics & Reputation Management** (Glib) : jauge semi-circulaire en héros (« 97 % ») + 3 sous-scores circulaires (visibilité, engagement, performance) ; carte d’avis Google empilée. Le pattern Oura appliqué à la réputation. https://dribbble.com/shots/27617133-Getpin-Mobile-Local-Analytics-Reputation-Management-UI
- **Getpin, Review Management UI Flow** (Gliuk Studio) : réponse aux avis sous forme de **conversation** avec l’assistant (« Vous avez reçu un avis… Voulez-vous répondre ? » → « Voici un brouillon » → « Merci »). Idée forte pour le mobile : la réponse comme dialogue. https://dribbble.com/shots/27730024-Getpin-Local-SEO-Automation-Review-Management-UI-Flow
- **RevVue, AI Review Management SaaS for Restaurants** (Pavlo Zakotianskyi) : note moyenne en héros, scores par thème (service, goût, propreté, prix, rapidité) avec deltas, cartes « Why it moved » qui expliquent la variation. Le concept « pourquoi ça a bougé » est directement transposable. https://dribbble.com/shots/26631464-AI-Review-Management-SAAS-for-Restaurants
- **MyFrank, Review Management Dashboard** (Forhad Sheikh) : onglets Tous / Répondus / Sans réponse avec compteurs, avis supprimés par Google visibles avec infobulle explicative. Note : son menu contient une « Filter & Gift Roulette », mécanique incitative à ne pas reprendre. https://dribbble.com/shots/27706842-MyFrank-Review-Management-Dashboard
- **Revme, Review Management Platform Redesign** (Design Monks) : palette chaude sable/beige, typographie éditoriale, demande d’avis par SMS. Référence d’ambiance plus que de structure. https://dribbble.com/shots/26703848-Revme-Review-Management-Platform-Redesign
- **Reveo** (case study de Zak Knowlton, hors Dribbble) : hiérarchie « métriques à fort impact, alertes, prochaine action » avant le reporting détaillé. https://www.zakknowlton.com/work/reveo

### C.3 Synthèse : l’écran d’accueil Éclaircie

1. **Héros : la note** (moyenne exacte calculée, arrondi Google affiché), une tendance vs 30 jours, un état météo en un mot. Contributeurs repliés dessous (Oura). Calcul fixé à l’ouverture (Whoop).
2. **Levier du jour** : une seule action concrète et légale, chiffrée (« 17 avis 5★ pour passer à 4,5 : posez le QR sur les tables »). Objectif fermable (anneaux, sans leur forme).
3. **L’avis qui compte** : une carte, un avis, la phrase qui explique pourquoi il est en tête, 3 boutons Répondre / Signaler / Plus tard (Linear). Brouillon IA en italique, jamais publié automatiquement (Apple Intelligence).
4. **L’avis qui fait sourire** : 5★ récent et spécifique, en grand, sans pression de réponse.
5. **État vide célébré** : tout est répondu = image du jour (Superhuman), ton doux (Gentler Streak), pas de confettis sur la note (Robinhood).

---

## Points incertains à ne pas présenter comme des faits dans l’app

- Formule du tri « Les plus pertinents » : inconnue, seulement des signaux observés.
- Règle d’arrondi exacte de la note Google : non documentée par Google.
- Pondération de la récence dans la note : non démontrée (et probablement fausse).
- Seuil de rapidité de réponse en heures : aucune étude.
- Effet chiffré des cartes NFC/QR : aucune étude indépendante.
- Montants de sanction après la loi de 2024 : à revérifier sur Légifrance.
- Les poids du score de priorité : hypothèses de conception à calibrer.
- Contradiction non résolue : Wang & Chaudhry (répondre aux positifs nuit) contre BrightLocal/Womply (répondre à tout est attendu ou associé à plus de CA).

---

## Sources

### Partie A
- Google, Business Profile, review score : https://support.google.com/business/answer/4801187?hl=en
- Google, politique de contenu Maps (contenus interdits et restreints) : https://support.google.com/contributionpolicy/answer/7400114?hl=en
- Google, signaler un avis : https://support.google.com/business/answer/4596773?hl=en
- Google, gérer les avis : https://support.google.com/business/answer/3474050?hl=en
- Forum Google, avis négatif en tête de « pertinence » : https://support.google.com/business/thread/252002916/bad-review-is-ranking-very-high-in-relevance?hl=en
- Sterling Sky, Local Guides : https://www.sterlingsky.ca/local-guides-google-reviews/
- Sterling Sky, diversité des étoiles : https://www.sterlingsky.ca/google-reviews-diversity/
- BrightLocal, Local Consumer Review Survey 2025 : https://www.brightlocal.com/research/local-consumer-review-survey-2025/
- Spiegel Research Center : https://spiegel.medill.northwestern.edu/How-Online-Reviews-Influence-Sales
- Chevalier & Mayzlin (NBER) : https://www.nber.org/papers/w10148
- Wang & Chaudhry 2018, DOI 10.1509/jmr.15.0511 : https://www.scinapse.io/papers/2513205909
- Proserpio & Zervas 2017 : https://pubsonline.informs.org/doi/suppl/10.1287/mksc.2017.1043 ; CV Zervas : https://people.bu.edu/zg/zervas-cv.pdf ; INFORMS : https://www.informs.org/News-Room/INFORMS-Releases/News-Releases/Want-to-improve-your-business-s-online-ratings-Make-sure-to-respond-to-reviews ; WARC : https://www.warc.com/newsandopinion/news/brands-get-better-ratings-by-replying-to-reviews/40051
- Chen, Gu, Ye, Zhu 2018 : https://pubsonline.informs.org/doi/fpi/10.1287/isre.2018.0781
- Sparks, So & Bradley 2016 : https://research-repository.griffith.edu.au/items/7c56677d-6fe7-5941-9aae-ec6a1f38ef42
- Han et al., esthétique des photos : https://research.tilburguniversity.edu/en/publications/the-more-aesthetic-the-better-the-impact-of-photo-aesthetics-on-p/
- PowerReviews, avis utiles : https://www.powerreviews.com/what-makes-a-review-helpful/
- Near Media (SOCi, Local Guides, sondage Yelp) : https://nearmedia.co/local-guide-reviews ; https://nearmedia.co/ep-45
- Womply 2019 : https://www.businesswire.com/news/home/20190723005207/en/Womply-Study-Suggests-Bad-Google-Reviews-Costlier ; https://searchengineland.com/review-counts-matter-more-to-local-business-revenue-than-star-ratings-according-to-study-320271 ; https://www.mediapost.com/publications/article/339083/the-impact-of-star-ratings-and-reviews-on-revenue.html
- Luca, Yelp (résumé) : https://www.momos.com/blog/from-review-to-revenue

### Partie B
- Google, conseils pour obtenir des avis : https://support.google.com/business/answer/3474122?hl=en ; https://support.google.com/business/answer/7035772?hl=en
- Google, créer un lien ou QR code : https://support.google.com/business/answer/16816815?hl=en
- Search Engine Land, QR codes Google : https://searchengineland.com/google-offers-qr-codes-to-get-reviews-from-customers-452966
- Sterling Sky, récence et classement : https://www.sterlingsky.ca/google-review-recency-ranking/
- Askalidis, Kim, Malthouse (arXiv) : https://arxiv.org/pdf/1604.00417 ; Spiegel, sollicités vs spontanés : https://spiegel.medill.northwestern.edu/self-motivated-vs-prompted-reviews
- Calculs d’arrondi (sources tierces) : https://help.reviewflowz.com/en/articles/13133717-why-free-google-review-calculators-are-all-wrong
- Légifrance, L. 121-4 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563107 ; L. 111-7-2 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049571119
- Lettre des Réseaux, faux avis : https://www.lettredesreseaux.com/la-minute-des-reseaux-6-les-nouvelles-mesures-de-protection-des-consommateurs-face-aux-avis-clients-fictifs.html
- HLC, sanctions aggravées 2024 : https://hlc.com/fr/publications/misleading-commercial-practices-a-stricter-legal-framework-increased-controls-and-best-practices
- Le Monde du Droit, lutte contre les faux avis : https://www.lemondedudroit.fr/decryptages/11308-la-lutte-contre-les-faux-avis-de-consommateurs-sur-internet.html
- Directive Omnibus, commentaires : https://www.makeinfluence.com/en/academy/fake-and-manipulated-reviews-what-the-eu-omnibus-directive-bans ; https://www.cuatrecasas.com/en/global/art/consumer-protection-in-the-digital-single-market-directive-2019-2161
- INC, tableau Omnibus : https://inc-conso.fr/sites/default/files/pdf/tableau-omnibus-inc-2022_0.pdf
- Proposition de loi Sénat n° 488 : https://senat.fr/leg/ppl24-488.pdf
- Blog du Modérateur, DGCCRF 35 % : https://www.blogdumoderateur.com/dgccrf-faux-avis-2017/

### Partie C
- Oura, contributeurs : https://support.ouraring.com/hc/en-us/articles/360057791533 ; https://ouraring.com/blog/readiness-score/ ; refonte : https://9to5google.com/2025/10/20/oura-app-redesign/
- Whoop : https://www.whoop.com/thelocker/how-does-whoop-recovery-work-101 ; https://developer.whoop.com/docs/whoop-101
- Apple HIG, Activity rings : https://developer-mdn.apple.com/design/human-interface-guidelines/components/status/activity-rings
- Gentler Streak : https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102 ; https://www.digitaltrends.com/?p=3165528
- Duolingo : https://blog.duolingo.com/improving-the-streak ; https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- Copilot Money : https://9to5mac.com/2024/10/31/copilot-money-review-ipad-cash-flow-tags/ ; https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/
- Monzo : https://monzo.com/blog/the-new-and-improved-home-screen ; https://www.monzo.com/blog/how-we-built-the-new-home-screen
- Robinhood : https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html
- Flighty : https://flighty.com/about ; https://techcrunch.com/2024/08/06/flightys-popular-flight-tracking-app-can-now-predict-delays-using-machine-learning/
- Superhuman : https://blog.superhuman.com/inbox-zero-day-2025/ ; https://www.capterra.com/p/199278/Superhuman/reviews
- Linear : https://linear.app/docs/triage ; https://linear.app/docs/triage-manage-unplanned-work
- Things 3 : https://en.wikipedia.org/wiki/Things_(software)
- Arc Search : https://techcrunch.com/2024/01/28/arcs-new-iphone-browser-wants-to-be-your-search-companion ; https://www.inverse.com/tech/arc-search-ios-app-interview-lead-designer-engineer
- Apple Intelligence : https://www.nbcnewyork.com/news/business/money-report/apple-disables-ai-notifications-for-news-in-its-beta-iphone-software/6110884/ ; https://the-decoder.com/apple-pauses-ai-generated-news-summaries-after-serious-accuracy-issues-surface/
- Apple Weather : https://9to5mac.com/2020/09/19/ios-14-weather-app/ ; https://apps.apple.com/app/id1069513131
- Dribbble : liens dans la section C.2 ; Reveo : https://www.zakknowlton.com/work/reveo
