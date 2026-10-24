// Gestionnaire de mods : packs JSON fournis + mods créés dans le Labo.

import { DB, registerSkillEffect, fmt } from './core.js';

export class ModManager {
  constructor({ game, hooks, basePath = 'mods' }) {
    this.game = game;
    this.hooks = hooks;
    this.basePath = basePath;
    this.mods = [];
    this.errors = [];
    this.api = null;
  }

  async load() {
    let index = { mods: [] };
    try {
      const res = await fetch(`${this.basePath}/index.json`, { cache: 'no-cache' });
      if (res.ok) index = await res.json();
    } catch { /* pas de dossier mods = pas grave */ }

    for (const entry of index.mods ?? []) {
      try {
        const res = await fetch(`${this.basePath}/${entry.file}`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const def = await res.json();
        const enabled = this.game.state.mods.enabled.includes(def.id) || def.enabledByDefault !== false;
        if (enabled && !this.game.state.mods.enabled.includes(def.id)) this.game.state.mods.enabled.push(def.id);
        this.mods.push({ ...def, builtin: true, enabled });
      } catch (err) {
        this.errors.push({ id: entry.id ?? entry.file, message: String(err.message ?? err) });
      }
    }

    for (const c of this.game.state.mods.custom ?? []) {
      this.mods.push({ ...c, builtin: false, enabled: c.enabled !== false, description: c.description ?? '' });
    }
    return this.mods;
  }

  list() { return this.mods; }

  toggle(id) {
    const mod = this.mods.find((m) => m.id === id);
    if (!mod) return;
    mod.enabled = !mod.enabled;
    if (mod.builtin) {
      const set = new Set(this.game.state.mods.enabled);
      mod.enabled ? set.add(id) : set.delete(id);
      this.game.state.mods.enabled = [...set];
    } else {
      const raw = (this.game.state.mods.custom ?? []).find((m) => m.id === id);
      if (raw) raw.enabled = mod.enabled;
    }
    this.game.save();
    return mod.enabled;
  }

  /** Applique les mods activés : contenu d'abord, scripts ensuite. */
  async apply() {
    const on = this.mods.filter((m) => m.enabled);
    for (const mod of on) {
      try {
        if (mod.heroes || mod.enemies || mod.factions || mod.config) {
          this.registerContent({ heroes: mod.heroes, enemies: mod.enemies, factions: mod.factions, config: mod.config });
        }
      } catch (err) { this.report(mod, err); }
    }
    for (const mod of on) {
      if (!mod.code) continue;
      try {
        const fn = new Function('api', `"use strict";\n${mod.code}`);
        await fn(this.api);
      } catch (err) { this.report(mod, err); }
    }
    return this.mods;
  }

  registerContent(content = {}) {
    for (const h of content.heroes ?? []) {
      DB.addHero(h);
      if (!(h.id in this.game.state.heroes)) this.game.state.heroes[h.id] = null;
    }
    for (const e of content.enemies ?? []) DB.addEnemy(e);
    for (const f of content.factions ?? []) DB.addFaction(f);
    if (content.config) DB.patchConfig(content.config);
    this.hooks.emit('content:register', content);
  }

  report(mod, err) {
    console.error(`[mod:${mod.id}]`, err);
    this.errors.push({ id: mod.id, message: String(err?.message ?? err) });
  }

  saveCustom({ id, name, code, description = '' }) {
    const list = this.game.state.mods.custom ?? [];
    const ex = list.find((m) => m.id === id);
    if (ex) Object.assign(ex, { name, code, description, enabled: true });
    else list.push({ id, name, code, description, enabled: true });
    this.game.state.mods.custom = list;
    const set = new Set(this.game.state.mods.enabled);
    set.add(id);
    this.game.state.mods.enabled = [...set];
    this.game.save();
  }

  removeCustom(id) {
    this.game.state.mods.custom = (this.game.state.mods.custom ?? []).filter((m) => m.id !== id);
    this.mods = this.mods.filter((m) => m.id !== id);
    this.game.state.mods.enabled = this.game.state.mods.enabled.filter((m) => m !== id);
    this.game.save();
  }

  importPack(def) {
    if (!def?.id) throw new Error('Le pack doit contenir un "id"');
    let code = def.code ?? '';
    if (def.heroes || def.enemies || def.factions || def.config) {
      code = `api.registerContent(${JSON.stringify({ heroes: def.heroes, enemies: def.enemies, factions: def.factions, config: def.config }, null, 2)});\n${code}`;
    }
    this.saveCustom({ id: def.id, name: def.name ?? def.id, code, description: def.description ?? '' });
    this.mods.push({ id: def.id, name: def.name ?? def.id, code, builtin: false, enabled: true });
    return def;
  }
}

/** API exposée aux mods : window.IdleLegends */
export function buildApi({ game, hooks, mods, ui }) {
  const api = {
    version: '1.0.0',
    game, DB, hooks, mods,
    Battle: null,
    skillEffects: [],
    registerSkillEffect,
    registerContent: (c) => mods.registerContent(c),
    unlockHero: (id) => game.unlockHero(id),
    on: (e, fn) => hooks.on(e, fn),
    off: (e, fn) => hooks.off(e, fn),
    once: (e, fn) => hooks.on(e, fn),
    emit: (e, ...a) => hooks.emit(e, ...a),
    addGlobalMultiplier: (name, fn) => {
      hooks.on('global:compute', (ctx) => {
        const r = fn(ctx) ?? {};
        for (const [k, v] of Object.entries(r)) if (typeof v === 'number') ctx[k] = (ctx[k] ?? 1) * v;
      });
      return name;
    },
    addGold: (n) => game.addGold(n),
    addGems: (n) => { game.state.gems += n; },
    addTickets: (n) => { game.state.tickets += n; },
    modState: (id) => {
      game.state.mods.data ??= {};
      return (game.state.mods.data[id] ??= {});
    },
    setStage: (n) => game.setStage(n),
    fmt,
    ELEMENTS: DB.config ? undefined : undefined,
    h: (tag, attrs, children) => ui.h(tag, attrs, children),
    toast: (msg, kind) => ui.toast(msg, kind),
    addTab: (tab) => ui.addTab(tab),
    EVENTS: [
      'battle:start', 'battle:end', 'attack', 'damage', 'hit', 'heal', 'shield', 'stun', 'status', 'death',
      'skill:cast', 'stage:start', 'stage:complete', 'stage:fail', 'summon', 'hero:levelup', 'hero:ascend',
      'autel:upgrade', 'idle:tick', 'global:compute', 'content:register',
    ],
  };
  return api;
}
