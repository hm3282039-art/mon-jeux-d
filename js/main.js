import { DB, Emitter, fmt } from './core.js';
import { Game } from './game.js';
import { ModManager, buildApi } from './mods.js';
import { UI } from './ui.js';
import { createApp } from './views.js';

async function loadData() {
  const files = ['config.json', 'heroes.json', 'enemies.json'];
  const [config, heroes, enemies] = await Promise.all(files.map(async (f) => {
    const res = await fetch(`data/${f}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`data/${f} → ${res.status}`);
    return res.json();
  }));
  DB.setBase({ config, heroes: heroes.heroes, enemies });
}

async function boot() {
  const bootMsg = document.getElementById('boot');
  try {
    await loadData();

    const hooks = new Emitter();
    const ui = new UI();
    const game = new Game({ hooks });
    const mods = new ModManager({ game, hooks });
    await mods.load();

    const api = buildApi({ game, hooks, mods, ui });
    mods.api = api;
    await mods.apply();

    const app = createApp({ game, hooks, ui, mods, api });
    app.mount();
    window.IdleLegends = api;
    window.__game = game;

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      game.update(dt);
      app.update(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    bootMsg?.remove();
    if (mods.errors.length) {
      ui.toast(`${mods.errors.length} mod(s) en erreur — voir l'onglet Mods`, 'warn', 4000);
    }
    const offline = Math.floor((Date.now() - (game.state.lastSeen ?? Date.now())) / 1000);
    if (offline > 120) ui.toast(`Bon retour ! ${fmt(game.rate() * Math.min(offline, 3600))} 🪙 accumulés`, 'info', 3500);
  } catch (err) {
    console.error(err);
    if (bootMsg) bootMsg.innerHTML = `<p>Erreur au démarrage : ${err.message}</p><p class="small">Ouvre la console (F12) pour le détail.</p>`;
  }
}

boot();
