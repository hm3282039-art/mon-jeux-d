# Chroniques d'Astria — Citadelle Céleste

Hub principal interactif haute-performance (60 FPS) inspiré d'**Epic Seven**, conçu en HTML5 / CSS Grid & Flexbox / Canvas 2D modulaire avec synthèse sonore temps réel via **Web Audio API**.

## Caractéristiques Principales

- **Panorama Interactif 60 FPS (`js/citadel-canvas.js`)** :
  - Parallaxe fluide à la souris + déplacement tactile/glisser sur écrans compacts.
  - Rayons lumineux célestes volumétriques (*God Rays*) et plus de 120 particules de mana flottantes en fusion additive.
  - Effets visuels dédiés par quartier : cercles d'invocation runiques en perspective 3D, vortex dimensionnel en rotation, braises de forge, sphère armillaire astrale et projecteurs impériaux.
  - Surbrillance lumineuse, zoom subtil au survol, ondes de clic et étiquettes flottantes synchronisées aux 6 bâtiments.
- **6 Bâtiments Interactifs & Modales Dédiées (`js/modals.js`)** :
  1. **Caserne des Héros** (`1`) — Gestion de l'escouade de 5 héros, montée en niveaux, statistiques détaillées et équipement de reliques.
  2. **Forge & Atelier** (`2`) — Artisanat d'armes/armures d'obsidienne dorée et renforcement sur l'enclume de `+0` à `+15`.
  3. **Portail de Combat** (`3`) — Campagne continentale et Tour Astrale de l'Infini (**0 Énergie / Progression 100 % illimitée**).
  4. **Temple d'Invocation** (`4`) — Système Gacha astral (`×1`, `×10`, tirage gratuit) avec compteur de garantie *Pity* 5★ Légendaire.
  5. **Console Auto-Bot & Paramètres** (`5`) — Automate de farm illimité en arrière-plan, protocoles ciblés, journal temps réel, réglages Audio/VFX et personnalisation du profil.
  6. **Grand Colisée** (`6`) — Duels classés contre des Seigneurs Bots, ligues impériales et Boutique d'Insignes d'Honneur.
- **Barre Supérieure & Économie Sans Énergie (`js/main.js`, `js/state.js`)** :
  - Carte de profil du Seigneur (Avatar personnalisable, Niveau, barre d'EXP, Puissance de Combat Totale `PC` animée).
  - Compteurs dynamiques interpolés en temps réel : **Or Impérial** (farm illimité), **Cristaux Astraux** et **Insignes d'Honneur** — *aucun système restrictif d'énergie ou de stamina*.
- **Framework Audio Procédural (`js/audio.js`)** :
  - Effets sonores synthétisés via Web Audio API sans fichier externe : harmonies pentatoniques au survol des bâtiments, clics d'interface, changements d'onglets, enclume de forge et fanfares d'invocation.

## Lancer le Projet

Servez la racine du dépôt avec n'importe quel serveur HTTP statique (requis pour les modules ES) :

```bash
python3 -m http.server 8000
```

Puis ouvrez `http://localhost:8000` dans votre navigateur.

## Structure du Projet

```text
index.html            Structure HTML5 & surcouche HUD
css/style.css         Design system Haute-Fantaisie (Bleu Royal, Or #FFD700, Cyan, Obsidienne)
assets/
  bg/citadel.jpg      Panorama illustré haute-résolution de la Citadelle Céleste
  bg/arena.jpg        Arène de combat du Portail
  heroes/*.jpg        Portraits illustrés des 10 Héros d'Astria
  sprites/*.webp      Sprites de boss et combattants
js/
  main.js             Initialisation, boucle 60fps, compteurs animés & raccourcis
  citadel-canvas.js   Moteur Canvas 60fps, parallaxe, God Rays, particules & hitboxes
  modals.js           Système de modales et interfaces des 6 bâtiments
  state.js            État réactif, sauvegarde localStorage, calcul de PC & Auto-Bot
  data.js             Catalogue des bâtiments, héros, plans de forge & adversaires
  audio.js            Synthétiseur d'effets sonores Web Audio API
```
