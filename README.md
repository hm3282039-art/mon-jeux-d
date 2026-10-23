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

Les assets du build statique utilisent des chemins relatifs pour permettre son hébergement sur un serveur statique. Le build contient trois pages indépendantes : `index.html` pour le hub, `heroes.html` pour le premier laboratoire des héros et `ultimate.html` pour le nouveau test d’ultimes temps réel de Kaelis et Nyxara.

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

## Page test 03 — Kaelis et Nyxara, ultimes cinéma

Ouvrir `ultimate.html` en développement, ou `docs/ultimate.html` dans le build statique.

- deux héros sélectionnables avec leurs designs d’origine : **Kaelis — Aube Incarnée** et **Nyxara — Requiem des Constellations** ;
- cinématiques complètes de **8 secondes** découpées en sept plans, avec impact à **4,50 s** ;
- rigs par parties utilisant les illustrations anime d’origine : os hiérarchiques, bras, jambes, tête, yeux, cheveux, capes, robes et armes ;
- ailes de phénix et trainées solaires pour Kaelis ; serpent astral animé et constellations pour Nyxara ;
- golem articulé avec anticipation, recul, fissures et réaction à l’impact ;
- caméras, transformation du champ de bataille, particules, débris et son WebAudio original ;
- version courte de **2,4 s** avec impact à **1,35 s**, et version directe de **0,7 s** sans cinématique ;
- pause, reprise, skip, rejeu, mute, ralenti et réinitialisation de la cible ;
- événement `ULT_IMPACT` unique, drain des PV synchronisé, statut propre au héros et reprise des timers de combat ;
- mesure réelle de la fréquence d’affichage et boucle `requestAnimationFrame` non plafonnée à 60 Hz.

Cette nouvelle proposition est un prototype isolé qui attend le test et la validation de l’utilisateur. Elle n’est pas intégrée au hub ni au combat principal.

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
- `ultimate.html`, `src/ultimate-main.tsx`, `src/UltimateLab.tsx`, `src/ultimate.css` : page de test autonome des ultimes de Kaelis et Nyxara ;
- `src/ultimate/` : rigs et atlas, rendu Canvas, moteur temporel, événements gameplay et son procédural ;
- `public/assets/ultimate/` : décor de l’arène et atlas à transparence réelle des deux héros ;
- `public/assets/astrea-celestia.webp` : décor panoramique original de la capitale céleste ;
- `public/assets/avatar-aelion.webp` : avatar du joueur ;
- `docs/` : dernier build statique publiable ;
- `VISION_PROJET.md` : vision et règles de production.
