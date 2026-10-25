// État de jeu : sauvegarde, économie, héros, invocation, boucle.

import {
  DB, Emitter, choice, rnd, seededRng, fmt, deepMerge,
  Battle, heroStats, levelCap, levelCost, ascendCost, autelCost,
  makeEnemyTeam, globalMultipliers, maxStars, teamSynergy,
} from './core.js';

const KEY = 'idle-legends.v1';

export function defaultState() {
  const starters = ['kael', 'lyra', 'magnus', 'selene', 'brann'].filter((id) => DB.heroes.has(id));
  const heroes = {};
  for (const id of DB.heroes.keys()) heroes[id] = null;
  for (const id of starters) heroes[id] = { level: 1, stars: 1, shards: 0 };
  return {
    v: 1, created: Date.now(), lastSeen: Date.now(),
    stage: 1, gold: 600, gems: 1200, tickets: 5,
    heroes, team: starters.slice(0, 5),
    autel: { atk: 0, hp: 0, gold: 0 },
    pity: { epic: 0, legendary: 0 },
    settings: { autoCast: false, speed: 1, autoNext: true },
    stats: { wins: 0, battles: 0, summons: 0, best: 1 },
    mods: { enabled: [], custom: [], data: {} },
  };
}

export class Game {
  constructor({ hooks = new Emitter() } = {}) {
    this.hooks = hooks;
    this.state = defaultState();
    this.battle = null;
    this.pending = null;
    this._acc = 0;
    this._saveT = 0;
    this._resT = 0;
    this.load();
  }

  // ------------------------------------------------------------- sauvegarde
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (raw) {
        const base = defaultState();
        this.state = deepMerge(base, raw);
        for (const id of Object.keys(this.state.heroes)) if (!DB.heroes.has(id)) delete this.state.heroes[id];
        this.state.team = (this.state.team ?? []).filter((id) => this.state.heroes[id]).slice(0, 5);
      }
    } catch (err) {
      console.warn('[save] lecture impossible', err);
    }
    if (!this.state.team.length) {
      const first = Object.keys(this.state.heroes).find((id) => this.state.heroes[id]);
      if (first) this.state.team = [first];
    }
  }

  save() {
    this.state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (err) { console.warn('[save] écriture impossible', err); }
  }

  reset() {
    localStorage.removeItem(KEY);
    this.state = defaultState();
    this.battle = null;
    this.pending = null;
    this._resT = 0;
    this.save();
    this.hooks.emit('reset', this.state);
  }

  exportSave() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `idle-legends-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  // ------------------------------------------------------------- économie
  globals() {
    const m = globalMultipliers(this.state.autel);
    const ctx = { ...m };
    this.hooks.emit('global:compute', ctx);
    return { atk: ctx.atk, hp: ctx.hp, gold: ctx.gold };
  }

  rate() {
    const c = DB.config.idle ?? {};
    const stage = Math.max(1, this.state.stage);
    return ((c.goldPerSecondBase ?? 2) + (c.goldPerSecondPerStage ?? 0.9) * Math.pow(stage, c.goldPerSecondExponent ?? 1.1)) * this.globals().gold;
  }

  addGold(n) {
    const g = Math.max(0, Math.round(n));
    this.state.gold += g;
    return g;
  }
  spendGold(n) { if (this.state.gold < n) return false; this.state.gold -= n; return true; }

  // ------------------------------------------------------------- héros
  owned() {
    return Object.entries(this.state.heroes)
      .filter(([, i]) => i)
      .map(([id]) => ({ id, def: DB.hero(id), inst: this.state.heroes[id] }))
      .filter((o) => o.def);
  }

  stats(id) {
    const inst = this.state.heroes[id];
    const def = DB.hero(id);
    return inst && def ? heroStats(def, inst, this.globals()) : null;
  }

  teamStats() {
    const base = this.state.team.filter(Boolean).map((id) => this.stats(id)).filter(Boolean);
    if (!base.length) return [];
    const { bonuses } = teamSynergy(base);
    return base.map((s) => {
      const m = bonuses.get(s.element) ?? 1;
      return { ...s, synergy: m, atk: Math.round(s.atk * m), hp: Math.round(s.hp * m), maxHp: Math.round(s.maxHp * m) };
    });
  }

  synergyInfo() { return teamSynergy(this.teamStats()); }
  teamPower() {
    return this.teamStats().reduce((sum, s) => sum + Math.round(s.atk * 3 + s.maxHp * 0.35 + s.def * 2.2 + s.spd * 40), 0);
  }

  canLevel(id) {
    const inst = this.state.heroes[id];
    if (!inst) return { ok: false };
    if (inst.level >= levelCap(inst.stars)) return { ok: false, reason: 'Palier atteint' };
    const cost = levelCost(inst.level + 1);
    if (this.state.gold < cost) return { ok: false, reason: 'Or insuffisant', cost };
    return { ok: true, cost };
  }

  levelUp(id, batch = 1) {
    const inst = this.state.heroes[id];
    if (!inst) return 0;
    let n = 0;
    for (let i = 0; i < batch; i++) {
      const c = this.canLevel(id);
      if (!c.ok || !this.spendGold(c.cost)) break;
      inst.level++; n++;
    }
    if (n) { this.hooks.emit('hero:levelup', { id, level: inst.level, count: n }); this.save(); }
    return n;
  }

  maxLevelUp(id) { let n = 0; while (this.canLevel(id).ok && n < 3000) n += this.levelUp(id, 25); return n; }

  ascendInfo(id) {
    const inst = this.state.heroes[id];
    if (!inst) return { can: false };
    if (inst.stars >= maxStars()) return { can: false, reason: 'Max' };
    const need = ascendCost(inst.stars);
    return { can: (inst.shards ?? 0) >= need, need, have: inst.shards ?? 0 };
  }

  ascend(id) {
    const info = this.ascendInfo(id);
    if (!info.can) return false;
    const inst = this.state.heroes[id];
    inst.shards -= info.need;
    inst.stars++;
    this.save();
    this.hooks.emit('hero:ascend', { id, stars: inst.stars });
    return true;
  }

  toggleTeam(id) {
    if (!this.state.heroes[id]) return 'locked';
    const team = this.state.team.filter(Boolean);
    if (team.includes(id)) { this.state.team = team.filter((x) => x !== id); this.save(); return 'removed'; }
    if (team.length >= 5) return 'full';
    this.state.team = [...team, id];
    this.save();
    return 'added';
  }

  // ------------------------------------------------------------- invocation
  summonCost(count) {
    const c = DB.config.summon ?? {};
    return count === 10 ? c.cost10 ?? 900 : c.cost1 ?? 100;
  }

  rollRarity() {
    const entries = Object.entries(DB.rarityWeights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = rnd() * total;
    for (const [k, w] of entries) { if (r < w) return k; r -= w; }
    return 'rare';
  }

  summon(count = 1) {
    const cost = this.summonCost(count);
    if (this.state.tickets < count && this.state.gems < cost) return { ok: false, reason: `Il faut ${cost} gemmes ou ${count} parchemin(s)` };
    let used = 0;
    while (used < count && this.state.tickets > 0) { this.state.tickets--; used++; }
    if (used < count) this.state.gems -= cost;

    const c = DB.config.summon ?? {};
    const results = [];
    for (let i = 0; i < count; i++) {
      let rarity = this.rollRarity();
      this.state.pity.epic++; this.state.pity.legendary++;
      if (rarity === 'rare' && this.state.pity.epic >= (c.pityEpic ?? 10)) rarity = 'epic';
      if (rarity !== 'legendary' && this.state.pity.legendary >= (c.pityLegendary ?? 60)) rarity = 'legendary';
      if (rarity !== 'rare') this.state.pity.epic = 0;
      if (rarity === 'legendary') this.state.pity.legendary = 0;
      const pool = DB.heroesOfRarity(rarity);
      const def = choice(pool.length ? pool : [...DB.heroes.values()]);
      results.push(this.grantHero(def.id, rarity));
    }
    this.state.stats.summons += count;
    this.save();
    this.hooks.emit('summon', { count, results });
    return { ok: true, results };
  }

  grantHero(id, rarity = 'rare') {
    const def = DB.hero(id);
    const inst = this.state.heroes[id];
    if (!inst) {
      this.state.heroes[id] = { level: 1, stars: 1, shards: 0 };
      if (this.state.team.filter(Boolean).length < 5) this.state.team = [...this.state.team.filter(Boolean), id];
      return { id, def, isNew: true, shards: 0, rarity };
    }
    const shards = rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1;
    inst.shards = (inst.shards ?? 0) + shards;
    return { id, def, isNew: false, shards, rarity };
  }

  /** Ajout direct (mods / édition). */
  unlockHero(id) {
    if (!DB.heroes.has(id)) throw new Error(`Héros inconnu : ${id}`);
    if (!this.state.heroes[id]) this.state.heroes[id] = { level: 1, stars: 1, shards: 0 };
    this.save();
    return this.state.heroes[id];
  }

  // ------------------------------------------------------------- autel
  autelInfo(kind) {
    const level = this.state.autel[kind] ?? 0;
    const cost = autelCost(level);
    return { level, cost, can: this.state.gold >= cost };
  }
  upgradeAutel(kind) {
    const i = this.autelInfo(kind);
    if (!this.spendGold(i.cost)) return false;
    this.state.autel[kind] = i.level + 1;
    this.save();
    this.hooks.emit('autel:upgrade', { kind, level: i.level + 1 });
    return true;
  }

  // ------------------------------------------------------------- combat
  startBattle() {
    const allies = this.teamStats();
    if (!allies.length) return null;
    const seed = this.state.stage * 7919 + this.state.stats.battles * 31;
    const wave = makeEnemyTeam(this.state.stage, seededRng(seed));
    const b = new Battle({
      allies: allies.map((a) => ({ ...a })),
      enemies: wave.units,
      hooks: this.hooks,
      config: DB.config,
      autoCast: this.state.settings.autoCast,
    });
    b.stage = this.state.stage;
    b.faction = wave.faction;
    this.battle = b;
    this.state.stats.battles++;
    this.hooks.emit('stage:start', { stage: this.state.stage, battle: b });
    return b;
  }

  onBattleEnd(res) {
    if (!res || res.stage !== this.state.stage) return this.pending;
    const c = DB.config.rewards ?? {};
    const stage = this.state.stage;
    const boss = stage % 5 === 0;
    const mult = boss ? c.bossMultiplier ?? 2.5 : 1;
    if (res.result === 'win') {
      const gold = Math.round(((c.winGoldBase ?? 30) + (c.winGoldPerStage ?? 16) * stage) * mult * this.globals().gold);
      const gems = Math.round(((c.winGemsBase ?? 9) + (c.winGemsPerStage ?? 0.8) * stage) * (boss ? 2 : 1));
      res.rewards = { gold, gems, tickets: boss ? 1 : 0 };
      this.addGold(gold);
      this.state.gems += gems;
      if (boss) this.state.tickets++;
      this.state.stats.wins++;
      this.state.stage++;
      this.state.stats.best = Math.max(this.state.stats.best, this.state.stage);
      this.hooks.emit('stage:complete', { stage, res, boss });
    } else {
      res.rewards = { gold: 0, gems: 0, tickets: 0 };
      this.hooks.emit('stage:fail', { stage, res });
    }
    this.pending = res;
    this.save();
    return res;
  }

  nextStage() { this.pending = null; this.battle = null; this._resT = 0; this.startBattle(); }
  retry() { this.pending = null; this.battle = null; this._resT = 0; this.startBattle(); }

  goBack() {
    if (this.state.stage <= 1) return false;
    this.state.stage--;
    this.nextStage();
    return true;
  }

  setStage(n) {
    this.state.stage = Math.max(1, Math.floor(n));
    this.nextStage();
  }

  // ------------------------------------------------------------- boucle
  update(dt) {
    this._acc += this.rate() * dt;
    const whole = Math.floor(this._acc);
    if (whole > 0) { this._acc -= whole; this.addGold(whole); }
    this.hooks.emit('idle:tick', { dt });

    if (this.pending) {
      if (this.state.settings.autoNext) {
        this._resT += dt;
        if (this._resT >= 1.3) {
          this._resT = 0;
          this.pending.result === 'win' ? this.nextStage() : this.retry();
        }
      }
      return;
    }
    if (!this.battle) { this.startBattle(); return; }

    const speed = this.state.settings.speed ?? 1;
    const steps = Math.max(1, Math.ceil((dt * speed) / 0.05));
    const step = (dt * speed) / steps;
    for (let i = 0; i < steps && this.battle && !this.battle.over; i++) this.battle.tick(step);
    if (this.battle?.over) this.onBattleEnd(this.battle.result);

    this._saveT += dt;
    if (this._saveT >= (DB.config.idle?.autosaveSeconds ?? 5)) { this._saveT = 0; this.save(); }
  }
}

export { fmt };
