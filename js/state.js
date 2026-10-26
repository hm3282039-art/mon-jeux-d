// ============================================================================
// État Réactif du Hub & Économie Sans Énergie (Progression Illimitée)
// ============================================================================

import {
  HERO_CATALOG,
  FORGE_BLUEPRINTS,
  AUTOBOT_PROTOCOLS,
  HONOR_SHOP_ITEMS,
} from './data.js';

const STORAGE_KEY = 'astria-citadel-hub-v1';

export function formatNum(n) {
  return Math.floor(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function createInitialState() {
  const heroes = {};
  const starterOwned = ['titania', 'seraphiel', 'brann', 'lyra', 'kael'];
  for (const h of HERO_CATALOG) {
    if (starterOwned.includes(h.id)) {
      heroes[h.id] = {
        owned: true,
        level: h.rarity === 'legendary' ? 45 : h.rarity === 'epic' ? 38 : 32,
        stars: h.starsBase,
        dupes: 0,
      };
    } else {
      heroes[h.id] = {
        owned: false,
        level: 1,
        stars: h.starsBase,
        dupes: 0,
      };
    }
  }

  return {
    player: {
      name: 'Seigneur Astria',
      title: 'Archonte Céleste',
      level: 42,
      xp: 64,
      avatarId: 'titania',
    },
    currencies: {
      gold: 125400,
      crystals: 3600,
      honor: 840,
    },
    pity: {
      legendaryCount: 18,
      legendaryMax: 50,
      freeDailyReady: true,
      totalPulls: 0,
    },
    squad: ['titania', 'seraphiel', 'brann', 'lyra', 'kael'],
    heroes,
    inventory: [
      { uid: 'gear_1', blueprintId: 'solaris_blade', plus: 7, equippedHeroId: 'titania' },
      { uid: 'gear_2', blueprintId: 'obsidian_aegis', plus: 5, equippedHeroId: 'kael' },
      { uid: 'gear_3', blueprintId: 'astral_diadem', plus: 4, equippedHeroId: 'seraphiel' },
    ],
    campaign: {
      stage: 24,
      towerFloor: 37,
      clears: 142,
    },
    coliseum: {
      points: 1840,
      wins: 29,
      streak: 4,
    },
    autobot: {
      active: true,
      protocolId: 'campaign_inf',
      speed: 2,
      autoForge: false,
      cyclesCompleted: 318,
    },
    settings: {
      audioEnabled: true,
      volume: 0.65,
      particleDensity: 'high', // low | high | ultra
      godRays: true,
      parallax: true,
      showFps: true,
    },
  };
}

export class CitadelState {
  constructor() {
    this.data = this._load();
    this.listeners = new Set();
    this.botLogs = [
      '[AUTO-BOT] Protocole Campagne Continentale ∞ initialisé (0 Énergie requise).',
      '[SANCTUAIRE] Flux de mana astral stabilisé dans les 6 quartiers.',
      '[GARDE] Escouade de Titania en patrouille — Rendement Or optimal.',
    ];
    this._goldCarry = 0;
    this._botCycleTimer = 0;
    this._saveTimer = 0;
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      const base = createInitialState();
      return {
        ...base,
        ...parsed,
        player: { ...base.player, ...(parsed.player || {}) },
        currencies: { ...base.currencies, ...(parsed.currencies || {}) },
        pity: { ...base.pity, ...(parsed.pity || {}) },
        heroes: { ...base.heroes, ...(parsed.heroes || {}) },
        campaign: { ...base.campaign, ...(parsed.campaign || {}) },
        coliseum: { ...base.coliseum, ...(parsed.coliseum || {}) },
        autobot: { ...base.autobot, ...(parsed.autobot || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : base.inventory,
        squad: Array.isArray(parsed.squad) && parsed.squad.length ? parsed.squad : base.squad,
      };
    } catch {
      return createInitialState();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Stockage indisponible ou saturé
    }
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = createInitialState();
    this.pushBotLog('[SYSTÈME] Sauvegarde réinitialisée aux archives d’origine.');
    this.emit('all');
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(topic = 'update', payload = null) {
    for (const fn of this.listeners) {
      fn(topic, payload, this.data);
    }
  }

  pushBotLog(line) {
    const stamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.botLogs.unshift(`${stamp} · ${line}`);
    if (this.botLogs.length > 28) this.botLogs.length = 28;
    this.emit('botlog', this.botLogs[0]);
  }

  // -------------------- Calculs de Stats & PC (Combat Power) --------------------

  getHeroStats(heroId) {
    const def = HERO_CATALOG.find((h) => h.id === heroId);
    const inst = this.data.heroes[heroId];
    if (!def || !inst) return null;

    const lvFactor = 1 + (inst.level - 1) * 0.055;
    const starFactor = 1 + (inst.stars - 3) * 0.18 + inst.dupes * 0.04;

    const atk = Math.round(def.baseAtk * lvFactor * starFactor);
    const hp = Math.round(def.baseHp * lvFactor * starFactor);
    const defStat = Math.round(def.baseDef * lvFactor * starFactor);

    // Bonus d'équipement équipé sur ce héros
    const equipped = this.data.inventory.filter((g) => g.equippedHeroId === heroId);
    let gearCp = 0;
    let bonusAtk = 0;
    for (const g of equipped) {
      const bp = FORGE_BLUEPRINTS.find((b) => b.id === g.blueprintId);
      if (!bp) continue;
      gearCp += bp.cpValue + g.plus * 460;
      if (bp.slot === 'Arme') bonusAtk += bp.baseStat + g.plus * bp.perPlus;
    }

    const totalAtk = atk + bonusAtk;
    const cp = Math.round(totalAtk * 8.4 + hp * 0.95 + defStat * 5.2 + def.spd * 55 + gearCp);

    return {
      ...def,
      owned: inst.owned,
      level: inst.level,
      stars: inst.stars,
      dupes: inst.dupes,
      atk: totalAtk,
      hp,
      def: defStat,
      cp,
      equipped,
    };
  }

  getTotalTeamCp() {
    return this.data.squad.reduce((sum, id) => {
      const st = this.getHeroStats(id);
      return sum + (st && st.owned ? st.cp : 0);
    }, 0);
  }

  getGoldPerSecond() {
    const base = 75 + this.data.campaign.stage * 4.5 + Math.round(this.getTotalTeamCp() / 4200);
    if (!this.data.autobot.active) return Math.round(base * 0.35);
    const proto = AUTOBOT_PROTOCOLS.find((p) => p.id === this.data.autobot.protocolId) || AUTOBOT_PROTOCOLS[0];
    return Math.round(base * proto.goldMult * (0.7 + this.data.autobot.speed * 0.35));
  }

  getColiseumRank() {
    const p = this.data.coliseum.points;
    if (p >= 2500) return 'Champion Astral';
    if (p >= 2100) return 'Diamant I';
    if (p >= 1850) return 'Platine I';
    if (p >= 1600) return 'Or I';
    return 'Argent I';
  }

  gainPlayerXp(amount) {
    this.data.player.xp += amount;
    let leveled = false;
    while (this.data.player.xp >= 100) {
      this.data.player.xp -= 100;
      this.data.player.level += 1;
      this.data.currencies.crystals += 50;
      leveled = true;
    }
    if (leveled) {
      this.pushBotLog(`[SEIGNEUR] Niveau ${this.data.player.level} atteint ! +50 Cristaux Astraux.`);
    }
  }

  // -------------------- Boucle Temps Réel (Auto-Bot Illimité) --------------------

  tick(dt) {
    // Rendement d'Or continu (Farm illimité sans stamina)
    const gps = this.getGoldPerSecond();
    this._goldCarry += gps * dt;
    if (this._goldCarry >= 1) {
      const add = Math.floor(this._goldCarry);
      this._goldCarry -= add;
      this.data.currencies.gold += add;
      this.emit('currency');
    }

    // Cycles de l'Auto-Bot
    if (this.data.autobot.active) {
      const cycleInterval = Math.max(2.2, 6.4 / this.data.autobot.speed);
      this._botCycleTimer += dt;
      if (this._botCycleTimer >= cycleInterval) {
        this._botCycleTimer = 0;
        this._runAutoBotCycle();
      }
    }

    this._saveTimer += dt;
    if (this._saveTimer >= 6) {
      this._saveTimer = 0;
      this.save();
    }
  }

  _runAutoBotCycle() {
    const proto = AUTOBOT_PROTOCOLS.find((p) => p.id === this.data.autobot.protocolId) || AUTOBOT_PROTOCOLS[0];
    this.data.autobot.cyclesCompleted += 1;
    const bonusGold = Math.round((240 + this.data.campaign.stage * 22) * proto.goldMult);
    this.data.currencies.gold += bonusGold;
    this.gainPlayerXp(4);

    const extras = [`+${formatNum(bonusGold)} Or`];
    if (Math.random() < proto.crystalChance) {
      const c = 4 + Math.floor(Math.random() * 7);
      this.data.currencies.crystals += c;
      extras.push(`+${c} Cristaux`);
    }
    if (Math.random() < proto.honorChance) {
      const h = 3 + Math.floor(Math.random() * 6);
      this.data.currencies.honor += h;
      extras.push(`+${h} Honneur`);
    }

    if (this.data.autobot.autoForge && this.data.inventory.length > 0 && this.data.currencies.gold >= 9500) {
      const candidate = this.data.inventory.find((g) => g.plus < 15);
      if (candidate) {
        this.upgradeGear(candidate.uid, true);
      }
    }

    this.pushBotLog(`[${proto.name}] Vague #${this.data.autobot.cyclesCompleted} nettoyée → ${extras.join(', ')}`);
    this.emit('currency');
  }

  // -------------------- Temple d'Invocation (Gacha) --------------------

  summon(count = 1, useFree = false) {
    const cost = useFree ? 0 : count === 10 ? 900 : 100;
    if (useFree && !this.data.pity.freeDailyReady) {
      return { ok: false, reason: 'L’invocation astrale gratuite a déjà été réclamée.' };
    }
    if (!useFree && this.data.currencies.crystals < cost) {
      return { ok: false, reason: `Cristaux Astraux insuffisants (${cost} requis).` };
    }

    if (useFree) this.data.pity.freeDailyReady = false;
    else this.data.currencies.crystals -= cost;

    const pulls = [];
    for (let i = 0; i < count; i++) {
      this.data.pity.legendaryCount += 1;
      this.data.pity.totalPulls += 1;

      let rarity = 'rare';
      const roll = Math.random() * 100;
      if (this.data.pity.legendaryCount >= this.data.pity.legendaryMax || roll < 7.5) {
        rarity = 'legendary';
        this.data.pity.legendaryCount = 0;
      } else if (i === 9 && !pulls.some((p) => p.rarity !== 'rare')) {
        rarity = 'epic';
      } else if (roll < 36) {
        rarity = 'epic';
      }

      const pool = HERO_CATALOG.filter((h) => h.rarity === rarity);
      const chosen = pool[Math.floor(Math.random() * pool.length)] || HERO_CATALOG[0];
      const rec = this.data.heroes[chosen.id];
      const isNew = !rec.owned;

      if (isNew) {
        rec.owned = true;
        rec.level = Math.max(rec.level, 20);
        if (this.data.squad.length < 5 && !this.data.squad.includes(chosen.id)) {
          this.data.squad.push(chosen.id);
        }
      } else {
        rec.dupes += 1;
        if (rec.stars < 6 && rec.dupes % 2 === 0) {
          rec.stars += 1;
        }
      }

      pulls.push({
        hero: chosen,
        rarity,
        isNew,
        stars: rec.stars,
      });
    }

    this.gainPlayerXp(count * 8);
    this.save();
    this.emit('summon', pulls);
    this.emit('currency');
    return { ok: true, pulls };
  }

  // -------------------- Caserne des Héros --------------------

  getLevelUpCost(heroId, levels = 1) {
    const inst = this.data.heroes[heroId];
    if (!inst) return Infinity;
    let total = 0;
    for (let i = 0; i < levels; i++) {
      const lv = inst.level + i;
      total += Math.round(320 + Math.pow(lv, 1.48) * 18);
    }
    return total;
  }

  levelUpHero(heroId, levels = 1) {
    const inst = this.data.heroes[heroId];
    if (!inst || !inst.owned) return { ok: false, reason: 'Héros non débloqué.' };
    if (inst.level >= 100) return { ok: false, reason: 'Niveau maximum (100) déjà atteint !' };

    const actualLevels = Math.min(levels, 100 - inst.level);
    const cost = this.getLevelUpCost(heroId, actualLevels);
    if (this.data.currencies.gold < cost) {
      return { ok: false, reason: `Or Impérial insuffisant (${formatNum(cost)} requis).` };
    }

    this.data.currencies.gold -= cost;
    inst.level += actualLevels;
    this.save();
    this.emit('heroes');
    this.emit('currency');
    return { ok: true, newLevel: inst.level };
  }

  toggleSquadHero(heroId) {
    const inst = this.data.heroes[heroId];
    if (!inst?.owned) return { ok: false, reason: 'Invoquez d’abord ce héros au Temple.' };

    const idx = this.data.squad.indexOf(heroId);
    if (idx >= 0) {
      if (this.data.squad.length <= 1) {
        return { ok: false, reason: 'Au moins un héros doit rester dans l’escouade.' };
      }
      this.data.squad.splice(idx, 1);
      this.save();
      this.emit('heroes');
      return { ok: true, action: 'removed' };
    }
    if (this.data.squad.length >= 5) {
      // Remplace le héros le moins puissant de l'escouade
      const weakest = [...this.data.squad].sort(
        (a, b) => (this.getHeroStats(a)?.cp || 0) - (this.getHeroStats(b)?.cp || 0),
      )[0];
      const wIdx = this.data.squad.indexOf(weakest);
      this.data.squad[wIdx] = heroId;
    } else {
      this.data.squad.push(heroId);
    }
    this.save();
    this.emit('heroes');
    return { ok: true, action: 'added' };
  }

  equipGear(gearUid, heroId) {
    const item = this.data.inventory.find((g) => g.uid === gearUid);
    if (!item) return { ok: false };
    const bp = FORGE_BLUEPRINTS.find((b) => b.id === item.blueprintId);
    // Déséquipe tout objet du même emplacement sur ce héros
    if (heroId && bp) {
      for (const other of this.data.inventory) {
        const otherBp = FORGE_BLUEPRINTS.find((b) => b.id === other.blueprintId);
        if (other.equippedHeroId === heroId && otherBp?.slot === bp.slot) {
          other.equippedHeroId = null;
        }
      }
    }
    item.equippedHeroId = heroId || null;
    this.save();
    this.emit('heroes');
    return { ok: true };
  }

  // -------------------- Forge & Atelier --------------------

  craftGear(blueprintId) {
    const bp = FORGE_BLUEPRINTS.find((b) => b.id === blueprintId);
    if (!bp) return { ok: false, reason: 'Schéma introuvable.' };
    if (this.data.currencies.gold < bp.craftCost) {
      return { ok: false, reason: `Or insuffisant (${formatNum(bp.craftCost)} requis).` };
    }
    this.data.currencies.gold -= bp.craftCost;
    const item = {
      uid: `gear_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      blueprintId: bp.id,
      plus: 0,
      equippedHeroId: null,
    };
    this.data.inventory.unshift(item);
    this.gainPlayerXp(12);
    this.save();
    this.emit('forge', item);
    this.emit('currency');
    return { ok: true, item, blueprint: bp };
  }

  getGearUpgradeCost(item) {
    return Math.round(900 + Math.pow(item.plus + 1, 1.75) * 420);
  }

  upgradeGear(gearUid, silent = false) {
    const item = this.data.inventory.find((g) => g.uid === gearUid);
    if (!item) return { ok: false, reason: 'Équipement introuvable.' };
    if (item.plus >= 15) return { ok: false, reason: 'Palier divin +15 déjà atteint !' };

    const cost = this.getGearUpgradeCost(item);
    if (this.data.currencies.gold < cost) {
      return { ok: false, reason: `Or insuffisant (${formatNum(cost)} requis).` };
    }
    this.data.currencies.gold -= cost;

    // Taux généreux garantissant du plaisir sans casse d'objet
    const chance = item.plus < 6 ? 1.0 : item.plus < 11 ? 0.85 : 0.7;
    const success = Math.random() <= chance;
    if (success) item.plus += 1;

    if (!silent) {
      this.save();
      this.emit('forge', item);
      this.emit('heroes');
      this.emit('currency');
    }
    return { ok: true, success, plus: item.plus, cost };
  }

  // -------------------- Portail de Combat (Sans Énergie) --------------------

  runBattleStage(mode = 'campaign', chapterReward = null) {
    const teamCp = this.getTotalTeamCp();
    if (mode === 'tower') {
      const floor = this.data.campaign.towerFloor;
      const gold = 1900 + floor * 145;
      const crystals = 18 + Math.floor(floor / 4);
      this.data.currencies.gold += gold;
      this.data.currencies.crystals += crystals;
      this.data.campaign.towerFloor += 1;
      this.data.campaign.clears += 1;
      this.gainPlayerXp(18);
      this.pushBotLog(`[TOUR INFINIE] Étage ${floor} conquis (0 Énergie) → +${formatNum(gold)} Or, +${crystals} Cristaux !`);
      this.save();
      this.emit('currency');
      return { ok: true, mode, stageCleared: floor, gold, crystals, teamCp };
    }

    const gold = (chapterReward?.goldReward || 2600) + this.data.campaign.stage * 55;
    const crystals = chapterReward?.crystalReward || 25;
    this.data.currencies.gold += gold;
    this.data.currencies.crystals += crystals;
    this.data.campaign.stage += 1;
    this.data.campaign.clears += 1;
    this.gainPlayerXp(15);
    this.pushBotLog(`[CAMPAGNE] Étape ${this.data.campaign.stage - 1} victorieuse → +${formatNum(gold)} Or, +${crystals} Cristaux.`);
    this.save();
    this.emit('currency');
    return { ok: true, mode, stageCleared: this.data.campaign.stage - 1, gold, crystals, teamCp };
  }

  // -------------------- Grand Colisée (JcJ & Bots) --------------------

  challengeOpponent(opponent) {
    const myCp = this.getTotalTeamCp();
    const ratio = myCp / Math.max(1, opponent.cp);
    const winProb = Math.min(0.96, Math.max(0.28, 0.58 * ratio));
    const victory = Math.random() < winProb;

    const honor = victory ? opponent.honorReward : Math.round(opponent.honorReward * 0.35);
    const gold = victory ? opponent.goldReward : Math.round(opponent.goldReward * 0.3);
    this.data.currencies.honor += honor;
    this.data.currencies.gold += gold;

    if (victory) {
      this.data.coliseum.wins += 1;
      this.data.coliseum.streak += 1;
      this.data.coliseum.points += 28 + Math.min(20, this.data.coliseum.streak * 3);
      this.gainPlayerXp(20);
      this.pushBotLog(`[COLISÉE] Victoire contre ${opponent.name} ! +${honor} Insignes d'Honneur.`);
    } else {
      this.data.coliseum.streak = 0;
      this.data.coliseum.points = Math.max(1000, this.data.coliseum.points - 8);
      this.pushBotLog(`[COLISÉE] Duel serré face à ${opponent.name} — +${honor} Honneur de bravoure.`);
    }

    this.save();
    this.emit('currency');
    this.emit('coliseum');
    return { ok: true, victory, honor, gold, rank: this.getColiseumRank() };
  }

  buyHonorItem(itemId) {
    const item = HONOR_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: 'Article indisponible.' };
    if (this.data.currencies.honor < item.costHonor) {
      return { ok: false, reason: `Insignes d'Honneur insuffisants (${item.costHonor} requis).` };
    }
    this.data.currencies.honor -= item.costHonor;

    if (item.type === 'crystals') {
      this.data.currencies.crystals += item.amount;
    } else if (item.type === 'gold') {
      this.data.currencies.gold += item.amount;
    } else if (item.type === 'gear') {
      this.data.inventory.unshift({
        uid: `gear_${Date.now()}`,
        blueprintId: item.blueprintId,
        plus: item.plusLevel || 5,
        equippedHeroId: null,
      });
    }

    this.save();
    this.emit('currency');
    this.emit('coliseum');
    return { ok: true, item };
  }
}
