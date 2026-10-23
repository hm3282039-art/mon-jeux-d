# Vision du projet — Idle RPG

## Point de départ

Créer un jeu de zéro : un **idle RPG web** avec une ambition visuelle et des sensations inspirées notamment de **Mobile Legends: Adventure** et **Epic Seven**.

Ces jeux servent de références d’expérience et de qualité, pas de consigne pour copier leurs personnages, leur univers ou leurs contenus.

## Décisions confirmées

### Plateforme

- Le jeu est conçu pour le **web et fonctionne dans le navigateur**.
- Les prototypes, les mécaniques et les cinématiques doivent être testables dans des pages web.
- Les choix techniques et graphiques doivent rester compatibles avec cette contrainte web.

### Répartition des rôles

L’utilisateur agit comme **directeur créatif et décisionnaire** : il explique ce qu’il veut, donne son avis sur les propositions et valide ou demande des modifications.

Il n’a pas à installer ou apprendre un logiciel d’animation, dessiner les assets, monter les cinématiques ou réaliser lui-même les prototypes. La conception, la production, l’intégration et les tests techniques sont pris en charge dans le projet par l’agent.

La participation attendue de l’utilisateur se limite à orienter le projet, tester les pages fournies et faire des retours.

## Phase en cours : prototype du hub

La première étape de développement validée est la création d’un **hub web interactif**, traité comme une page de test avant toute intégration au futur jeu complet.

Le prototype comprend désormais :

- le nom de travail modifiable **Astréa — Les Échos du Ciel** ;
- une **carte de ville plein écran**, dans l’esprit du hub de MLA, sans grand personnage au centre ;
- huit lieux directement intégrés au décor et cliquables : taverne, marché, sanctuaire, temple des vœux, arbre-monde, guilde, tour et arène ;
- uniquement les informations utiles sur les bords : profil, ressources, accès rapides, coffre AFK et navigation ;
- de petits bandeaux d’information plutôt que de grandes fenêtres masquant la carte ;
- une carte que l’on peut faire glisser horizontalement pour explorer la ville sur mobile ;
- **aucun personnage créé ou affiché dans cette étape du hub**.

Les intérieurs des bâtiments, les combats, les véritables tirages d’invocation et les systèmes sociaux ne sont pas intégrés à ce prototype. Ils devront faire l’objet de leurs propres pages de test.

## Direction artistique confirmée

- Les personnages auront une **direction artistique anime**, avec des identités et des chara-designs originaux.
- Le hub explore une ambiance de fantasy céleste mêlant architecture lumineuse, îles flottantes, magie et interface or/bleu nuit.
- Les noms, l’univers et les visuels du prototype pourront être ajustés avec les retours de l’utilisateur.

## Ambition graphique

- Utiliser les meilleurs outils disponibles pour produire les graphismes et les animations, sans imposer leur utilisation à l’utilisateur.
- Ne pas se limiter à de simples images ou illustrations statiques auxquelles on ajoute un zoom ou une secousse.
- Viser de vrais personnages animés, avec une identité visuelle forte et des animations soignées.
- Prévoir de véritables cinématiques d’ulti : découpage en plans, poses et mouvements animés, caméra, effets, impacts et mise en scène sonore.
- Distinguer les **ultis classiques**, intégrés directement à l’action du combat, des **ultis « cinéma »**, qui doivent donner l’impression de regarder un court passage d’un film d’animation.
- Pour un ulti « cinéma », produire une séquence complète plan par plan : storyboard, animatique, animation des personnages et des décors, mouvements de caméra, effets, montage, lumière, mixage sonore et finitions. Une simple illustration déformée, déplacée ou zoomée ne répond pas au besoin.
- Privilégier pour ces séquences une **cinématique pré-rendue en vidéo haute qualité** lorsque cela offre un meilleur rendu qu’une scène temps réel. La vidéo est le format de diffusion dans le navigateur, pas un diaporama : son contenu doit être réellement animé et mis en scène comme un mini-film.
- Assurer une entrée et une sortie propres entre le combat et la cinématique, avec synchronisation des dégâts, possibilité de passer la séquence et retour fluide au jeu.
- Construire et intégrer les cinématiques dans un environnement web. Leur lecture doit fonctionner directement dans le navigateur.
- La technique précise de production devra être éprouvée avec un premier prototype : l’objectif est de progresser vers la qualité visée sans promettre qu’un seul outil automatique reproduira instantanément le travail d’un studio d’animation.
- Les personnages, leurs animations et les cinématiques d’ulti seront travaillés plus en détail ultérieurement, étape par étape.

## Méthode obligatoire : pages web de test avant intégration

Chaque mécanique importante doit pouvoir être essayée isolément dans une **page web de test dédiée** avant d’être intégrée au jeu principal.

Exemple pour un personnage :

1. Prototyper ses attaques, animations et son ulti dans un environnement web de test.
2. Fournir une page permettant de l’essayer directement dans le navigateur.
3. Vérifier notamment ses attaques, ses animations, ses effets, sa cinématique d’ulti et ses mécaniques.
4. Ajuster avec les retours de l’utilisateur.
5. Ne l’intégrer au jeu principal qu’après validation de ce prototype.

Ce principe vaut aussi pour les autres mécaniques : combat, progression, invocation, équipement, compétences, boss, etc. L’objectif est de tester chaque élément rapidement, sans attendre que tout le jeu soit terminé.

## Décisions encore à prendre ensemble avant de développer

Les points suivants restent volontairement ouverts :

- technologies web précises ;
- technique de production 2D ou 3D et niveau de détail des animations ;
- univers, histoire et ton du jeu ;
- caméra et présentation des combats ;
- fonctionnement précis de l’idle et de la progression hors ligne ;
- niveau de contrôle du joueur pendant les combats et lors des ultis ;
- composition des équipes, rôles et système d’éléments ou de factions ;
- personnages, compétences, raretés et amélioration ;
- sélection des héros qui recevront un ulti « cinéma » : les SSR et UR sont des candidats possibles, mais il n’est pas décidé que tous leurs ultis seront cinématiques ; ce choix sera fait plus tard, éventuellement héros par héros ;
- équipements, invocations et autres systèmes de progression ;
- modes de jeu, boss, donjons et éventuelles fonctionnalités sociales ;
- modèle économique éventuel.

## Principe directeur

On avance par petites étapes validées : **on se met d’accord, l’agent prototype, l’utilisateur teste sur une page web dédiée, on ajuste ensemble, puis seulement on intègre.**
