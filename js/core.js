// Moteur pur (aucun DOM) : aléatoire, contenu, stats, compétences, combat.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RNG = { fn: Math.random, seed(s) { this.fn = mulberry32(s); return this; }, reset() { this.fn = Math.random; } };
export const rnd = () => RNG.fn();
export const choice = (a) => a[Math.floor(rnd() * a.length)];

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const seededRng = (seed) => mulberry32(hashString(String(seed)));

export function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return '∞';
  const neg = n < 0, v = Math.abs(n);
  let o;
  if (v < 1000) o = String(Math.floor(v * 10) / 10).replace(/\.0$/, '');
  else if (v < 1e6) o = (v / 1e3).toFixed(d) + ' K';
  else if (v < 1e9) o = (v / 1e6).toFixed(d) + ' M';
  else if (v < 1e12) o = (v / 1e9).toFixed(d) + ' Md';
  else o = (v / 1e12).toFixed(d) + ' T';
  return (neg ? '-' : '') + o.replace('.', ',');
}

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s % 60} s`;
  return `${s} s`;
}

export class Emitter {
  constructor() { this.map = new Map(); }
  on(e, fn) { if (!this.map.has(e)) this.map.set(e, new Set()); this.map.get(e).add(fn); return () => this.off(e, fn); }
  off(e, fn) { this.map.get(e)?.delete(fn); }
  emit(e, ...a) { for (const fn of [...(this.map.get(e) ?? [])]) { try { fn(...a); } catch (err) { console.error(`[${e}]`, err); } } }
}

export function deepMerge(t, p) {
  if (Array.isArray(p)) return p.slice();
  if (p === null || typeof p !== 'object') return p;
  const o = t && typeof t === 'object' && !Array.isArray(t) ? { ...t } : {};
  for (const [k, v] of Object.entries(p)) o[k] = deepMerge(o[k], v);
  return o;
}

export const ELEMENTS = {
  Feu: { beats: 'Nature', icon: '🔥', color: '#ff7a45' },
  Nature: { beats: 'Foudre', icon: '🌿', color: '#7ad46a' },
  Foudre: { beats: 'Eau', icon: '⚡', color: '#ffe066' },
  Eau: { beats: 'Feu', icon: '💧', color: '#5fa8e0' },
  Lumière: { beats: 'Ombre', icon: '✨', color: '#f5dc9a' },
  Ombre: { beats: 'Lumière', icon: '🌑', color: '#a06bd6' },
  Neutre: { beats: '', icon: '◆', color: '#9aa4b0' },
};

export function affinity(src, tgt) {
  const s = ELEMENTS[src], t = ELEMENTS[tgt];
  if (!s || !t) return 0;
  if (s.beats === tgt) return 1;
  if (t.beats === src) return -1;
  return 0;
}

// ------------------------------------------------------------------ contenu
export const DB = {
  config: {},
  heroes: new Map(),
  enemies: new Map(),
  factions: [],
  ready: false,
  reset() { this.config = {}; this.heroes.clear(); this.enemies.clear(); this.factions = []; this.ready = false; },
  setBase({ config, heroes, enemies }) {
    this.reset();
    this.config = config;
    for (const h of heroes) this.addHero(h);
    for (const e of enemies.enemies) this.addEnemy(e);
    this.factions = enemies.factions;
    this.ready = true;
  },
  addHero(def) {
    if (!def?.id) throw new Error('Héros sans id');
    const h = { rarity: 'rare', role: 'Combattant', element: 'Neutre', icon: '⚔️', colors: ['#888', '#222'], skill: { name: 'Frappe', desc: '', effect: 'strike', power: 1.4 }, ...def };
    this.heroes.set(h.id, h); return h;
  },
  addEnemy(def) { if (!def?.id) throw new Error('Ennemi sans id'); this.enemies.set(def.id, { rarity: 'rare', element: 'Neutre', ...def }); },
  addFaction(f) { this.factions.push(f); },
  patchConfig(p) { this.config = deepMerge(this.config, p); },
  hero(id) { return this.heroes.get(id); },
  enemy(id) { return this.enemies.get(id); },
  heroesOfRarity(r) { return [...this.heroes.values()].filter((h) => h.rarity === r); },
  get rarityWeights() { return this.config.summon?.weights ?? { rare: 70, epic: 25, legendary: 5 }; },
};

// -------------------------------------------------------------------- stats
export const levelCap = (stars = 1) => (DB.config.hero?.levelCapBase ?? 12) + (DB.config.hero?.levelCapPerStar ?? 12) * (stars - 1);
export const levelCost = (lv) => Math.floor((DB.config.hero?.levelBaseCost ?? 36) * Math.pow(lv, DB.config.hero?.levelCostExponent ?? 1.4));
export const ascendCost = (stars) => (DB.config.hero?.shardsPerStar ?? [2, 3, 5, 8])[stars - 1] ?? 999;
export const maxStars = () => DB.config.hero?.maxStars ?? 5;
export const autelCost = (lv) => Math.floor((DB.config.autel?.baseCost ?? 220) * Math.pow(DB.config.autel?.costExponent ?? 1.27, lv));

export function globalMultipliers(autel = { atk: 0, hp: 0, gold: 0 }) {
  const c = DB.config.autel ?? {};
  return {
    atk: Math.pow(1 + (c.atkPerLevel ?? 0.07), autel.atk ?? 0),
    hp: Math.pow(1 + (c.hpPerLevel ?? 0.07), autel.hp ?? 0),
    gold: Math.pow(1 + (c.goldPerLevel ?? 0.05), autel.gold ?? 0),
  };
}

export function heroStats(def, inst, g = { atk: 1, hp: 1 }) {
  const lv = Math.max(0, (inst.level ?? 1) - 1);
  const stars = inst.stars ?? 1;
  const sm = 1 + (DB.config.hero?.statPerStar ?? 0.25) * (stars - 1);
  const gr = def.growth ?? { hp: 0, atk: 0, def: 0 };
  const hp = (def.base.hp + gr.hp * lv) * sm * (g.hp ?? 1);
  const atk = (def.base.atk + gr.atk * lv) * sm * (g.atk ?? 1);
  const dv = (def.base.def + gr.def * lv) * sm;
  return {
    id: def.id, name: def.name, title: def.title ?? '', role: def.role, element: def.element,
    rarity: def.rarity, icon: def.icon, colors: def.colors, level: inst.level, stars,
    hp: Math.round(hp), maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(dv),
    spd: def.base.spd, crit: def.base.crit, critDmg: def.base.critDmg, skill: def.skill,
    power: Math.round(atk * 3 + hp * 0.35 + dv * 2.2 + def.base.spd * 40),
  };
}

export function teamSynergy(heroes) {
  const counts = new Map();
  for (const h of heroes) counts.set(h.element, (counts.get(h.element) ?? 0) + 1);
  const cfg = DB.config.synergy ?? { two: 0.06, three: 0.12, five: 0.22 };
  const bonuses = new Map();
  let best = { element: null, count: 0, bonus: 0 };
  for (const [el, n] of counts) {
    const b = n >= 5 ? cfg.five : n >= 3 ? cfg.three : n >= 2 ? cfg.two : 0;
    if (b) bonuses.set(el, 1 + b);
    if (n > best.count) best = { element: el, count: n, bonus: b };
  }
  return { bonuses, best, counts };
}

export function makeEnemyTeam(stage, rng = Math.random) {
  const cfg = DB.config.enemy ?? {};
  const factions = DB.factions.length ? DB.factions : [{ id: 'x', name: 'Horde', units: [...DB.enemies.keys()] }];
  const faction = factions[Math.floor((stage - 1) / 8) % factions.length];
  const pool = faction.units.map((id) => DB.enemy(id)).filter(Boolean);
  const roster = pool.length ? pool : [...DB.enemies.values()];
  const count = stage < 2 ? 3 : stage < 4 ? 4 : 5;
  const isBoss = stage % 5 === 0;
  const hpMul = Math.pow(cfg.hpScale ?? 1.07, stage - 1);
  const atkMul = Math.pow(cfg.atkScale ?? 1.055, stage - 1);
  const defMul = Math.pow(cfg.defScale ?? 1.045, stage - 1);
  const tanks = roster.filter((e) => e.role === 'Tank' || e.role === 'Combattant');
  const others = roster.filter((e) => !tanks.includes(e));
  const units = [];
  for (let i = 0; i < count; i++) {
    let def;
    if (isBoss && i === 0) def = tanks[tanks.length - 1] ?? roster[0];
    else if (i < 2) def = (tanks.length ? tanks : roster)[Math.floor(rng() * (tanks.length || roster.length))];
    else def = (others.length ? others : roster)[Math.floor(rng() * (others.length || roster.length))];
    units.push(enemyUnit(def, stage, hpMul, atkMul, defMul, isBoss && i === 0, cfg));
  }
  return { units, faction, isBoss, stage };
}

function enemyUnit(def, stage, hpMul, atkMul, defMul, boss, cfg) {
  const lv = Math.max(0, stage - 1);
  const gr = def.growth ?? { hp: 0, atk: 0, def: 0 };
  const hp = (def.base.hp + gr.hp * lv) * hpMul * (boss ? cfg.bossHp ?? 2.4 : 1);
  return {
    id: def.id, name: boss ? `${def.name} — ÉLITE` : def.name, role: def.role, element: def.element ?? 'Neutre',
    icon: def.icon, colors: def.colors, isBoss: boss,
    hp: Math.round(hp), maxHp: Math.round(hp),
    atk: Math.round((def.base.atk + gr.atk * lv) * atkMul * (boss ? cfg.bossAtk ?? 1.35 : 1)),
    def: Math.round((def.base.def + gr.def * lv) * defMul * (boss ? cfg.bossDef ?? 1.2 : 1)),
    spd: def.base.spd, crit: def.base.crit ?? 0.05, critDmg: def.base.critDmg ?? 1.5,
    skill: null, level: stage, stars: boss ? 2 : 1, rarity: def.rarity ?? 'rare',
  };
}

// --------------------------------------------------------------- compétences
export const SKILL_EFFECTS = new Map();
export const registerSkillEffect = (type, fn) => (SKILL_EFFECTS.set(type, fn), fn);

const pw = (u, b, s, m = 1) => b.atkOf(u) * (s.power ?? 1) * m;

registerSkillEffect('strike', (u, b, s) => { const t = b.pickTarget(u); if (t) b.damage(u, t, pw(u, b, s)); });
registerSkillEffect('cleave', (u, b, s) => { for (const t of b.enemiesOf(u)) b.damage(u, t, pw(u, b, s)); });
registerSkillEffect('snipe', (u, b, s) => { const t = b.lowestHp(u); if (t) b.damage(u, t, pw(u, b, s)); });
registerSkillEffect('snipe_lifesteal', (u, b, s) => {
  const t = b.lowestHp(u); if (!t) return;
  const d = b.damage(u, t, pw(u, b, s)); b.heal(u, d * 0.45);
});
registerSkillEffect('multi_hit', (u, b, s) => {
  for (let i = 0; i < (s.hits ?? 3); i++) {
    const ts = b.enemiesOf(u); if (!ts.length) break;
    b.damage(u, ts[Math.floor(rnd() * ts.length)], pw(u, b, s));
  }
});
registerSkillEffect('execute', (u, b, s) => {
  const t = b.pickTarget(u); if (!t) return;
  b.damage(u, t, pw(u, b, s, t.hp / t.maxHp <= 0.4 ? 2 : 1));
});
registerSkillEffect('rage_strike', (u, b, s) => {
  const t = b.pickTarget(u); if (!t) return;
  b.damage(u, t, pw(u, b, s));
  b.addStatus(u, { id: 'rage', name: 'Rage', kind: 'buff', stat: 'atk', pct: 0.25, duration: 6 });
});
registerSkillEffect('judgement', (u, b, s) => {
  for (const t of b.enemiesOf(u)) b.damage(u, t, pw(u, b, s));
  for (const a of b.alliesOf(u)) b.heal(a, b.atkOf(u) * 0.9);
});
registerSkillEffect('drain_all', (u, b, s) => {
  let tot = 0; for (const t of b.enemiesOf(u)) tot += b.damage(u, t, pw(u, b, s));
  if (tot) b.heal(u, tot * 0.3);
});
registerSkillEffect('heal_all', (u, b, s) => { for (const a of b.alliesOf(u)) b.heal(a, pw(u, b, s)); });
registerSkillEffect('heal_buff', (u, b, s) => {
  for (const a of b.alliesOf(u)) {
    b.heal(a, pw(u, b, s));
    b.addStatus(a, { id: 'benediction', name: 'Bénédiction', kind: 'buff', stat: 'atk', pct: 0.2, duration: 7 });
  }
});
registerSkillEffect('shield_all', (u, b, s) => { for (const a of b.alliesOf(u)) b.addShield(a, pw(u, b, s), 6); });
registerSkillEffect('stun_single', (u, b, s) => { const t = b.pickTarget(u); if (t) { b.damage(u, t, pw(u, b, s)); b.stun(t, 1.8); } });
registerSkillEffect('stun_all', (u, b, s) => {
  for (const t of b.enemiesOf(u)) { b.damage(u, t, pw(u, b, s)); if (t.index < 2) b.stun(t, 1.2); }
});
registerSkillEffect('freeze_all', (u, b, s) => { for (const t of b.enemiesOf(u)) { b.damage(u, t, pw(u, b, s)); b.stun(t, 1.5); } });
registerSkillEffect('poison', (u, b, s) => {
  const t = b.pickTarget(u); if (!t) return;
  b.damage(u, t, pw(u, b, s));
  b.addStatus(t, { id: 'poison', name: 'Poison', kind: 'dot', dps: b.atkOf(u) * (s.power ?? 0.6) * 0.5, duration: 6 });
});
registerSkillEffect('burn_all', (u, b, s) => {
  for (const t of b.enemiesOf(u)) {
    b.damage(u, t, pw(u, b, s) * 0.6);
    b.addStatus(t, { id: 'burn', name: 'Brûlure', kind: 'dot', dps: b.atkOf(u) * (s.power ?? 0.55), duration: 5 });
  }
});

// -------------------------------------------------------------------- combat
let UID = 1;

export class Battle {
  constructor({ allies, enemies, hooks = new Emitter(), config = DB.config, autoCast = false }) {
    this.cfg = config;
    this.hooks = hooks;
    this.time = 0; this.over = false; this.result = null;
    this.duration = config.battle?.timeout ?? 60;
    this.logs = []; this.units = [];
    this.autoCast = autoCast;
    this.allies = allies.map((s, i) => this.addUnit(s, 'ally', i));
    this.enemies = enemies.map((s, i) => this.addUnit(s, 'enemy', i));
    this.hooks.emit('battle:start', this);
  }

  addUnit(spec, side, index) {
    const u = {
      uid: UID++, side, index, id: spec.id, name: spec.name, role: spec.role ?? 'Combattant',
      element: spec.element ?? 'Neutre', rarity: spec.rarity ?? 'rare', icon: spec.icon ?? '❔',
      colors: spec.colors ?? ['#888', '#222'], level: spec.level ?? 1, stars: spec.stars ?? 1,
      hp: spec.hp, maxHp: spec.maxHp ?? spec.hp, atk: spec.atk, def: spec.def,
      spd: spec.spd ?? 1, crit: spec.crit ?? 0.05, critDmg: spec.critDmg ?? 1.5,
      skill: spec.skill ?? null, energy: side === 'ally' ? 20 : 0, atb: rnd() * 0.35,
      shield: 0, shieldT: 0, stunT: 0, statuses: [], alive: true, isBoss: !!spec.isBoss,
      dmgDone: 0, healDone: 0,
    };
    this.units.push(u);
    return u;
  }

  team(side) { return this.units.filter((u) => u.side === side); }
  alliesOf(u) { return this.units.filter((x) => x.alive && x.side === u.side); }
  enemiesOf(u) { return this.units.filter((x) => x.alive && x.side !== u.side); }

  pickTarget(u) {
    const foes = this.enemiesOf(u);
    if (!foes.length) return null;
    const ranged = ['Assassin', 'Tireur', 'Mage'].includes(u.role);
    const pool = ranged ? foes : foes.filter((f) => f.index < 2);
    return (pool.length ? pool : foes)[Math.floor(rnd() * (pool.length ? pool.length : foes.length))];
  }
  lowestHp(u) {
    const f = this.enemiesOf(u);
    return f.length ? f.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b)) : null;
  }
  atkOf(u) { let v = u.atk; for (const s of u.statuses) if (s.kind === 'buff' && s.stat === 'atk') v *= 1 + s.pct; return v; }
  defOf(u) { let v = u.def; for (const s of u.statuses) if (s.kind === 'buff' && s.stat === 'def') v *= 1 + s.pct; return v; }

  log(message, kind = 'info', side = 'neutral') {
    const e = { t: this.time, message, kind, side };
    this.logs.push(e);
    if (this.logs.length > 60) this.logs.shift();
    this.hooks.emit('log', e);
  }

  /** Le joueur peut lancer un ultime manuellement. */
  castNow(unit) {
    if (this.over || !unit?.alive || (unit.energy ?? 0) < 100) return false;
    unit.energy = 0;
    const eff = SKILL_EFFECTS.get(unit.skill?.effect) ?? SKILL_EFFECTS.get('strike');
    eff(unit, this, unit.skill);
    this.log(`${unit.name} lance « ${unit.skill?.name} »`, 'skill', unit.side);
    this.hooks.emit('skill:cast', { battle: this, unit });
    this.checkEnd();
    return true;
  }

  tick(dt) {
    if (this.over) return this.result;
    this.time += dt;
    for (const u of this.units) {
      if (!u.alive) continue;
      this.tickStatuses(u, dt);
      if (!u.alive) continue;
      if (u.stunT > 0) { u.stunT = Math.max(0, u.stunT - dt); continue; }
      u.atb += dt * (u.spd ?? 1) * 1.15;
      if (u.atb < 1) continue;
      u.atb = 0;
      if (u.skill && u.energy >= 100 && u.side === 'enemy') { u.energy = 0; this.castNow(u); }
      else if (u.side === 'ally' && u.skill && u.energy >= 100 && this.autoCast) this.castNow(u);
      else this.basicAttack(u);
      if (this.checkEnd()) break;
    }
    if (!this.over && this.time >= this.duration) this.finish(this.enemiesLeftRatio() > 0 ? 'timeout' : 'win');
    return this.result;
  }

  enemiesLeftRatio() {
    const total = this.units.filter((u) => u.side === 'enemy').reduce((s, u) => s + u.maxHp, 0) || 1;
    const left = this.units.filter((u) => u.side === 'enemy').reduce((s, u) => s + Math.max(0, u.hp), 0);
    return left / total;
  }

  basicAttack(u) {
    const t = this.pickTarget(u);
    if (!t) return;
    const d = this.damage(u, t, this.atkOf(u), { basic: true });
    u.energy = Math.min(100, u.energy + (this.cfg.battle?.energyPerAttack ?? 16));
    this.hooks.emit('attack', { battle: this, unit: u, target: t, dealt: d });
  }

  tickStatuses(u, dt) {
    if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
    for (const s of u.statuses) {
      s.remaining -= dt;
      if (s.kind === 'dot') {
        s.acc = (s.acc ?? 0) + dt;
        while (s.acc >= 1 && u.alive) { s.acc -= 1; this.damage(null, u, s.dps, { type: 'dot', noCrit: true, ignoreDef: true }); }
      }
      if (!u.alive) break;
    }
    u.statuses = u.statuses.filter((s) => s.remaining > 0);
  }

  damage(source, target, amount, opts = {}) {
    if (!target?.alive || amount <= 0) return 0;
    let dmg = Math.max(1, amount);
    let aff = 0;
    if (!opts.ignoreAffinity && source) {
      aff = affinity(source.element, target.element);
      if (aff > 0) dmg *= 1 + (this.cfg.battle?.affinityBonus ?? 0.25);
      else if (aff < 0) dmg *= 1 - (this.cfg.battle?.affinityPenalty ?? 0.12);
    }
    if (!opts.ignoreDef) {
      const def = Math.max(0, this.defOf(target));
      dmg *= 1 - Math.min(def / (def + (this.cfg.battle?.defenseFactor ?? 260)), this.cfg.battle?.maxMitigation ?? 0.8);
    }
    let crit = false;
    if (!opts.noCrit && source && rnd() < source.crit) { crit = true; dmg *= source.critDmg; }
    dmg = Math.max(1, Math.round(dmg));
    let absorbed = 0;
    if (target.shield > 0) { absorbed = Math.min(target.shield, dmg); target.shield -= absorbed; dmg -= absorbed; }
    target.hp = Math.max(0, target.hp - dmg);
    if (source) {
      source.dmgDone += dmg + absorbed;
      source.energy = Math.min(100, source.energy + (this.cfg.battle?.energyPerHit ?? 5));
    }
    if (target.hp <= 0 && target.alive) this.kill(target, source);
    const payload = { battle: this, source, target, amount: dmg, absorbed, crit, affinity: aff, type: opts.type };
    this.hooks.emit('damage', payload);
    this.hooks.emit('hit', payload);
    return dmg;
  }

  heal(target, amount, source) {
    if (!target?.alive || amount <= 0) return 0;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    const healed = Math.round(target.hp - before);
    if (source) source.healDone += healed;
    if (healed) this.hooks.emit('heal', { battle: this, source, target, amount: healed });
    return healed;
  }
  addShield(u, amount, duration = 6) {
    if (!u?.alive) return;
    u.shield = Math.max(u.shield, Math.round(amount));
    u.shieldT = Math.max(u.shieldT, duration);
    this.hooks.emit('shield', { battle: this, unit: u });
  }
  stun(u, d) { if (!u?.alive) return; u.stunT = Math.max(u.stunT, d); this.hooks.emit('stun', { battle: this, unit: u }); }
  addStatus(u, st) {
    if (!u?.alive) return;
    const full = { remaining: st.duration ?? 5, acc: 0, ...st };
    const ex = u.statuses.find((s) => s.id === st.id);
    if (ex) Object.assign(ex, full, { remaining: Math.max(ex.remaining, full.remaining) });
    else u.statuses.push(full);
    this.hooks.emit('status', { battle: this, unit: u, status: full });
  }
  kill(u, src) {
    u.alive = false; u.hp = 0; u.statuses = []; u.shield = 0;
    this.log(`${u.name} est vaincu`, 'death', u.side);
    this.hooks.emit('death', { battle: this, unit: u, source: src });
  }
  checkEnd() {
    if (this.over) return true;
    if (!this.units.some((u) => u.side === 'enemy' && u.alive)) { this.finish('win'); return true; }
    if (!this.units.some((u) => u.side === 'ally' && u.alive)) { this.finish('lose'); return true; }
    return false;
  }
  finish(result) {
    if (this.over) return this.result;
    this.over = true;
    this.result = {
      result, stage: this.stage ?? null, duration: this.time,
      survivors: this.units.filter((u) => u.side === 'ally' && u.alive).length,
      allies: this.team('ally').map(snap), enemies: this.team('enemy').map(snap),
    };
    this.hooks.emit('battle:end', this.result);
    return this.result;
  }
}

function snap(u) {
  return { id: u.id, name: u.name, icon: u.icon, side: u.side, element: u.element, role: u.role,
    alive: u.alive, hp: Math.round(u.hp), maxHp: Math.round(u.maxHp),
    dmgDone: Math.round(u.dmgDone), healDone: Math.round(u.healDone) };
}

export function simulate({ allies, enemies, hooks, config = DB.config, autoCast = true, maxSeconds }) {
  const b = new Battle({ allies, enemies, hooks, config, autoCast });
  const limit = maxSeconds ?? (config.battle?.timeout ?? 60);
  let guard = 0;
  while (!b.over && b.time < limit && guard++ < limit * 25 + 50) b.tick(0.05);
  if (!b.over) b.finish('timeout');
  return b.result;
}
