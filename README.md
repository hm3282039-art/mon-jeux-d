# Astréa — Hub de cité heroic-fantasy

Prototype web d’un hub d’idle RPG anime, reprenant les codes UI/UX des jeux mobiles comme MLA avec des visuels originaux.

## Lancer le prototype

```bash
npm install
npm run dev
```

Le serveur Vite écoute sur `0.0.0.0:5173`.

## Construire

```bash
# Build de contrôle dans dist/
npm run build

# Version statique autonome dans docs/
npm run build:static
```

Les assets du build statique utilisent des chemins relatifs pour permettre son hébergement sur un serveur statique. Le build contient deux pages indépendantes : `index.html` pour le hub et `heroes.html` pour le laboratoire des héros.

## Page test 02 — Héros et cinématiques

Ouvrir `heroes.html` en développement, ou `docs/heroes.html` dans le build statique.

- deux héros originaux : **Kaelis**, épéiste solaire, et **Nyxara**, oracle céleste ;
- trois compétences actives par héros avec dégâts, effets, cooldowns, charge d’ultime et sons WebAudio ;
- golem d’entraînement avec PV, statuts, critiques et réinitialisation ;
- statistiques, passifs, sélection des personnages et journal de combat ;
- une cinématique de **8 secondes, 60 FPS et audio stéréo** par héros, produite à partir de quatre plans d’action distincts avec interpolation du mouvement ;
- lecture plein écran, sous-titres, mute, progression, skip avec Échap, replay et écran de résultat ;
- affichage mobile avec fond cinématographique et gestion explicite des erreurs vidéo.

Cette page est un banc d’essai isolé : les héros ne sont pas encore intégrés au hub ou à un système de combat complet.

## Interface et interactions du hub

- décor heroic-fantasy saturé avec dorures, cristaux, néons cyan/violet, brume, rayons et parallaxe ;
- portail d’invocation central avec anneaux et éclats animés ;
- neuf points d’intérêt : taverne, marché, forge, sanctuaire, invocation, arbre-monde, guilde, tour et arène ;
- avatar VIP, niveau, puissance et barre de progression ;
- ressources Or, Diamants, Énergie et Parchemins avec boutons `+` ouvrant les offres ;
- dock Campagne, Cité, Héros, Sac et Guilde ;
- raccourcis rétractables : Événements, Pass de combat, Quotidiennes, Taverne AFK et Magasin ;
- jauge AFK et coffre cliquable au pied de l’Arbre-monde ;
- cartes et options accessibles dans de petits bandeaux sans masquer toute la ville ;
- navigation horizontale de la carte sur les écrans étroits et mode sans animations.

## Rendu haute fréquence

- une seule couche canvas pour les particules, avec halos lumineux précalculés et aucun flou animé plein écran ;
- boucle `requestAnimationFrame` **non plafonnée à 60 FPS**, synchronisée sur l’écran 60 / 120 / 144 / 165 / 240 Hz et au-delà ;
- animations temporelles indépendantes de la fréquence d’affichage ;
- parallaxe écrite directement sur le compositing, sans re-render React à chaque frame ;
- modes Auto, Ultra, Fluide et Éco, avec adaptation automatique de la densité des particules si nécessaire ;
- mise en pause quand l’onglet est masqué et compteur de FPS réellement mesuré après une courte synchronisation.

La fréquence maximale visible dépend toujours de l’écran, du navigateur et de l’appareil : un écran 60 Hz ne peut pas afficher 144 images réelles par seconde.

Toutes les données sont locales au prototype. Aucun backend, compte, paiement ou tirage réel n’est utilisé. Les intérieurs et mécaniques complètes seront prototypés séparément.

## Structure

- `src/App.tsx` : carte, HUD, points d’intérêt et interactions ;
- `src/Atmosphere.tsx` : moteur canvas haute fréquence, qualité et mesure des FPS ;
- `src/styles.css` : direction artistique, effets et responsive ;
- `heroes.html`, `src/heroes-main.tsx`, `src/HeroLab.tsx`, `src/heroes.css` : page test des héros, compétences et lecteur cinématique ;
- `public/assets/heroes/` : portraits WebP, posters et vidéos MP4 des deux ultimes ;
- `public/assets/astrea-celestia.webp` : décor panoramique original de la capitale céleste ;
- `public/assets/avatar-aelion.webp` : avatar du joueur ;
- `docs/` : dernier build statique publiable ;
- `VISION_PROJET.md` : vision et règles de production.
