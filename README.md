# Idle Legends

Idle RPG **actif** jouable dans le navigateur : collection de héros, équipe de 5, gacha, campagne infinie.
**Gratuit, sans serveur, sans compte, sans énergie, sans mur payant — et moddable à l'infini.**

## Lancer

Le jeu a besoin d'être servi en HTTP (modules ES). N'importe quel serveur statique fait l'affaire :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

ou `npx serve .`, ou l'extension *Live Server* de VS Code, ou GitHub Pages.

## Jouer

- **Combat** : ton équipe affronte une vague, boss toutes les 5 étapes. Bouton `×1/×2/×3` pour la vitesse.
- **Ultimes** : chaque héros remplit sa jauge (barre bleue sur son portrait). Quand elle est pleine, **touche le héros** pour lancer son ultime (ou active `AUTO`).
- **Héros** : niveaux à l'or, étoiles avec des fragments (doublons du gacha).
- **Invoquer** : 1 ou 10 tirages, pity épique (10) et légendaire (60), parchemins sur les boss.
- **Autel** : bonus permanents ATQ / PV / Or pour toute l'équipe.
- **Synergies** : 2 héros du même élément = +6 %, 3 = +12 %, 5 = +22 % (ATQ et PV).

Aucune limite de jeu : pas d'énergie, pas de timer. La sauvegarde est automatique (localStorage) et exportable en JSON depuis l'onglet Mods.

## Modder

Trois façons, de la plus simple à la plus puissante.

### 1. Éditer les données (`data/`)

| Fichier | Contenu |
|---|---|
| `data/heroes.json` | héros : stats de base, croissance, ultime |
| `data/enemies.json` | ennemis + factions (une faction par tranche de 8 étapes) |
| `data/config.json` | équilibrage : dégâts, or, coûts, pity, scaling ennemi |

Exemple d'ultime :

```json
"skill": { "name": "Météore", "desc": "Frappe tous les ennemis.", "effect": "cleave", "power": 1.1 }
```

`effect` accepte : `strike`, `cleave`, `snipe`, `snipe_lifesteal`, `multi_hit`, `execute`, `rage_strike`,
`judgement`, `drain_all`, `heal_all`, `heal_buff`, `shield_all`, `stun_single`, `stun_all`, `freeze_all`,
`poison`, `burn_all`.

### 2. Un pack JSON (`mods/*.json`)

Dépose un fichier et déclare-le dans `mods/index.json` :

```json
{
  "id": "mon-pack",
  "name": "Mon pack",
  "heroes": [ { "id": "mon-heros", "name": "…", "rarity": "legendary", "role": "Mage", "element": "Feu" } ],
  "factions": [ { "id": "ma-zone", "name": "Ma zone", "units": ["gobelin", "loup"] } ],
  "config": { "summon": { "weights": { "rare": 40, "epic": 40, "legendary": 20 } } },
  "code": "api.addGems(500);"
}
```

Un pack fourni est déjà là : `mods/pack-starter.json` (3 héros, 1 faction, gacha plus généreux).

### 3. Le Laboratoire (dans le jeu, onglet **Mods**)

Tu écris du JavaScript, tu cliques **Tester**, ça s'applique instantanément ; **Enregistrer** le garde.

```js
// nouvelle mécanique : les critiques volent de la vie
api.on("hit", ({ battle, source, crit, amount }) => {
  if (crit && source?.alive) battle.heal(source, amount * 0.08);
});

// nouvel effet de compétence utilisable dans un héros
api.registerSkillEffect("chaos_bolt", (u, b) => {
  for (let i = 0; i < 5; i++) {
    const foes = b.enemiesOf(u);
    if (!foes.length) break;
    b.damage(u, foes[Math.floor(Math.random() * foes.length)], b.atkOf(u) * 0.5);
  }
});

// bonus global
api.addGlobalMultiplier("or_plus", () => ({ gold: 1.25 }));
```

### API des mods

| Fonction | Rôle |
|---|---|
| `api.registerContent({ heroes, enemies, factions, config })` | ajouter du contenu |
| `api.registerSkillEffect(nom, fn)` | créer un effet de compétence |
| `api.addGlobalMultiplier(nom, fn)` | multiplicateur global (atk / hp / gold) |
| `api.on(event, fn)` | écouter le jeu (voir la liste dans l'onglet Mods) |
| `api.addGold/addGems/addTickets(n)`, `api.setStage(n)`, `api.unlockHero(id)` | outils de test |
| `api.addTab({ id, label, icon, render })` | ajouter un écran |
| `api.modState(id)` | données persistantes de ton mod |
| `api.h(tag, attrs, children)`, `api.toast(msg)` | interface |

## Structure

```
index.html
css/style.css
data/      heroes.json · enemies.json · config.json
mods/      index.json · pack-starter.json
js/
  core.js    moteur pur : aléatoire, contenu, stats, compétences, combat
  game.js    état, sauvegarde, économie, gacha, boucle
  mods.js    chargeur de mods + API
  ui.js      helpers DOM
  views.js   écrans (combat, héros, invocation, autel, mods)
  main.js    démarrage
```
