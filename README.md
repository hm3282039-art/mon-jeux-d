# Astréa — Prototype de hub ville

Page de test web pour un idle RPG anime. Le nom **Astréa — Les Échos du Ciel** est un titre de travail.

## Direction du prototype

Le hub est une **carte de ville plein écran**, sans grand personnage au centre. Les bâtiments sont les points d’interaction principaux, dans l’esprit d’un hub de RPG mobile comme MLA, avec des visuels originaux.

## Lancer le prototype

```bash
npm install
npm run dev
```

Le serveur Vite écoute sur `0.0.0.0:5173`.

## Vérifier la production

```bash
npm run build
npm run preview
```

## Éléments testables

- huit bâtiments cliquables : taverne, marché, sanctuaire, temple des vœux, arbre-monde, guilde, tour et arène ;
- carte navigable par glissement horizontal sur les écrans étroits ;
- profil et ressources discrets sur les bords de l’écran ;
- coffre AFK avec monnaies de démonstration ;
- petits bandeaux pour les lieux, quêtes, messages, ressources et options ;
- ambiance animée désactivable et recentrage de la carte ;
- navigation Aventure, Ville et Banlieue, en attente de leurs futures pages.

Toutes les données sont locales au prototype. Aucun backend, compte, paiement ou tirage réel n’est utilisé. Les intérieurs des bâtiments et les autres mécaniques seront testés séparément avant intégration.

## Structure

- `src/App.tsx` : carte, bâtiments et interactions ;
- `src/styles.css` : interface, animations et responsive ;
- `public/assets/ville-astrea.webp` : décor original optimisé pour le web ;
- `VISION_PROJET.md` : vision et règles de production du jeu.
