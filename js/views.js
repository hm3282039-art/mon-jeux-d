// Écrans du jeu + coquille de l'application.

import { h, RARITY } from './ui.js';
import { DB, ELEMENTS, fmt, fmtTime, levelCap, levelCost, maxStars, ascendCost } from './core.js';

const ROLE_ICON = { Tank: '🛡️', Combattant: '⚔️', Tireur: '🏹', Assassin: '🗡️', Mage: '🔮', Soigneur: '✚' };
const ROLE_ORDER = ['Tank', 'Combattant', 'Tireur', 'Assassin', 'Mage', 'Soigneur'];
const el = (e) => ELEMENTS[e] ?? ELEMENTS.Neutre;

export function createApp({ game, hooks, ui, mods, api }) {
  const screens = new Map();
  let current = null;
  let activeBattleRef = null;

  // ------------------------------------------------------------- barre du haut
  const gold = h('b', { className: 'cur gold' });
  const gems = h('b', { className: 'cur gems' });
  const tickets = h('b', { className: 'cur tickets' });
  const nav = h('nav', { className: 'tabbar' });
  const stageTag = h('span', { className: 'stage-tag' });

  function refreshTop() {
    gold.textContent = `${fmt(game.state.gold)} 🪙`;
    gems.textContent = `${fmt(game.state.gems)} 💎`;
    tickets.textContent = `${game.state.tickets} 🎟️`;
    stageTag.textContent = `Étape ${game.state.stage}`;
  }

  // ------------------------------------------------------------- combat
  function buildBattle() {
    const cards = new Map();
    const enemyRow = h('div', { className: 'team enemy' });
    const allyRow = h('div', { className: 'team ally' });
    const fx = h('div', { className: 'fx' });
    const cutinBox = h('div', { className: 'cutin-box' });
    const timer = h('span', { className: 'timer' });
    const overlay = h('div', { className: 'overlay' });
    const synergy = h('div', { className: 'synergy' });
    const logBox = h('div', { className: 'log' });
    const factionTag = h('span', { className: 'faction-tag' });
    const waveTag = h('span', { className: 'wave-tag' });

    const arena = h('div', { className: 'arena' });

    const head = h('div', { className: 'battle-head' }, [
      h('button', { className: 'icon-btn', text: '◀', onClick: () => game.goBack() }),
      h('div', { className: 'battle-title' }, [stageTag, synergy]),
      h('div', { className: 'speed' }, [
        h('button', { className: 'chip', text: '×1', onClick: (e) => cycleSpeed(e.target) }),
        h('button', { className: 'chip', text: 'AUTO', onClick: (e) => toggleAuto(e.target) }),
      ]),
    ]);

    function cycleSpeed(btn) {
      const s = game.state.settings.speed;
      game.state.settings.speed = s >= 3 ? 1 : s + 1;
      btn.textContent = `×${game.state.settings.speed}`;
      btn.classList.toggle('on', game.state.settings.speed > 1);
    }
    function toggleAuto(btn) {
      game.state.settings.autoCast = !game.state.settings.autoCast;
      if (game.battle) game.battle.autoCast = game.state.settings.autoCast;
      btn.classList.toggle('on', game.state.settings.autoCast);
      ui.toast(game.state.settings.autoCast ? 'Ultimes automatiques' : 'Ultimes manuels : touche tes héros !', 'info');
    }

    const controls = h('div', { className: 'battle-controls' }, [
      h('button', { className: 'btn', text: '⚡ Passer', onClick: () => { if (game.battle) game.battle.finish('timeout'); } }),
      h('button', { className: 'btn', text: '⏭ +5 étapes', onClick: () => game.setStage(game.state.stage + 5) }),
      h('button', { className: 'btn', text: '🦸 Équipe', onClick: () => goTo('heroes') }),
    ]);

    arena.append(
      h('div', { className: 'arena-sky' }),
      h('div', { className: 'arena-rays' }),
      h('div', { className: 'arena-floor' }),
      h('div', { className: 'arena-fog' }),
      h('div', { className: 'arena-top' }, [factionTag, waveTag]),
      enemyRow,
      h('div', { className: 'vs' }, [h('div', { className: 'line' }), timer, h('div', { className: 'line' })]),
      allyRow,
      fx,
      cutinBox,
      overlay,
    );

    const screen = h('section', { className: 'screen' }, [head, arena, controls, logBox]);

    // ---------------------------------------------------------- carte unité
    function card(u) {
      const e = el(u.element);
      const portrait = h('div', { className: 'portrait' });
      if (u.art) {
        portrait.classList.add('has-art');
        portrait.append(h('img', {
          className: 'art', src: u.art, alt: u.name, draggable: false,
          onError: (ev) => { ev.target.remove(); portrait.classList.remove('has-art'); },
        }));
      }
      for (const node of [
        h('span', { className: 'glyph', text: u.icon }),
        h('div', { className: 'aura' }),
        h('div', { className: 'hurt' }),
        h('span', { className: 'el', text: e.icon }),
        u.isBoss ? h('span', { className: 'crown', text: '👑' }) : null,
        h('span', { className: 'lv', text: u.level }),
        h('div', { className: 'energy' }),
        h('span', { className: 'sx' }),
      ]) if (node) portrait.append(node);

      const node = h('div', {
        className: `unit ${u.side} rar-${u.rarity ?? 'rare'} ${u.isBoss ? 'boss' : ''}`,
      }, [
        h('div', { className: 'portrait-wrap' }, [
          h('div', { className: 'shadow' }),
          portrait,
        ]),
        h('div', { className: 'uname', text: u.isBoss ? u.name.replace(' — ÉLITE', '') : u.name }),
        h('div', { className: 'bar hp' }, [h('div', { className: 'bar-fill' })]),
        h('div', { className: 'status' }),
      ]);

      node.style.setProperty('--el', e.color);
      node.style.setProperty('--c1', u.colors?.[0] ?? '#888');
      node.style.setProperty('--c2', u.colors?.[1] ?? '#111');

      portrait.addEventListener('click', () => {
        if (u.side !== 'ally' || !game.battle) return;
        if (u.energy < 100 || !u.alive) return;
        game.battle.castNow(u);
      });

      const refs = {
        u, node, portrait,
        hp: node.querySelector('.bar.hp .bar-fill'),
        energy: node.querySelector('.energy'),
        status: node.querySelector('.status'),
        key: '',
      };
      cards.set(u.uid, refs);
      return node;
    }

    function paint() {
      cards.clear();
      enemyRow.innerHTML = '';
      allyRow.innerHTML = '';
      const b = game.battle;
      if (!b) { enemyRow.append(h('div', { className: 'empty', text: 'Préparation…' })); return; }
      if (b.faction) {
        arena.style.setProperty('--tint', b.faction.tint ?? '#6a5cff');
        factionTag.textContent = b.faction.name;
        factionTag.style.borderColor = b.faction.tint ?? '';
      }
      waveTag.textContent = b.stage % 5 === 0 ? `☠ BOSS · Étape ${b.stage}` : `Étape ${b.stage}`;
      b.team('enemy').forEach((u) => enemyRow.append(card(u)));
      b.team('ally').forEach((u) => allyRow.append(card(u)));
      sync();
    }

    function sync() {
      for (const r of cards.values()) {
        const { u } = r;
        if (!u?.maxHp) continue;
        const pct = Math.max(0, u.hp / u.maxHp);
        r.hp.style.width = `${pct * 100}%`;
        r.hp.classList.toggle('low', pct < 0.3);
        r.node.classList.toggle('dead', u.hp <= 0);
        r.node.classList.toggle('shielded', u.shield > 0);
        r.node.classList.toggle('ready', u.energy >= 100 && u.alive && u.side === 'ally');
        r.energy.style.height = `${Math.min(100, u.energy)}%`;
        const key = (u.statuses ?? []).map((s) => s.id).join();
        if (key !== r.key) {
          r.key = key;
          r.status.innerHTML = '';
          for (const s of u.statuses ?? []) r.status.append(h('span', { className: `dot ${s.kind}`, title: s.name }));
        }
      }
      const b = game.battle;
      const left = b ? Math.max(0, b.duration - b.time) : 0;
      timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      const syn = game.synergyInfo();
      synergy.innerHTML = '';
      if (syn.best.count >= 2) {
        const e = el(syn.best.element);
        synergy.append(h('span', { className: 'syn-badge', style: { borderColor: e.color } },
          `${e.icon} ${syn.best.element} ×${syn.best.count} +${Math.round(syn.best.bonus * 100)}%`));
      }
    }

    // ---------------------------------------------------------- effets
    let lastCut = 0;
    function bump(u, dir) {
      const r = cards.get(u?.uid);
      if (!r) return;
      r.node.classList.remove('lunge-up', 'lunge-down');
      void r.node.offsetWidth;
      r.node.classList.add(dir === 'up' ? 'lunge-up' : 'lunge-down');
      setTimeout(() => r.node.classList.remove('lunge-up', 'lunge-down'), 340);
    }
    function shake(power = 1) {
      arena.classList.remove('shake');
      void arena.offsetWidth;
      arena.style.setProperty('--shake', String(power));
      arena.classList.add('shake');
      setTimeout(() => arena.classList.remove('shake'), 260);
    }
    function cutIn(unit) {
      const now = performance.now();
      if (!unit?.art || now - lastCut < 650) return;
      lastCut = now;
      const node = h('div', { className: `cutin ${unit.side ?? 'ally'}` }, [
        h('img', { className: 'cutin-art', src: unit.art, alt: '' }),
        h('div', { className: 'cutin-veil' }),
        h('div', { className: 'cutin-txt' }, [
          h('span', { className: 'cutin-who', text: unit.name }),
          h('b', { className: 'cutin-skill', text: unit.skill?.name ?? 'ULTIME' }),
        ]),
      ]);
      cutinBox.append(node);
      arena.style.setProperty('--flash', el(unit.element).color);
      arena.classList.add('flash');
      setTimeout(() => arena.classList.remove('flash'), 400);
      setTimeout(() => node.remove(), 1000);
    }

    function showResult(r) {
      overlay.innerHTML = '';
      if (!r) return;
      const win = r.result === 'win';
      const rw = r.rewards ?? { gold: 0, gems: 0, tickets: 0 };
      overlay.append(h('div', { className: `result ${win ? 'win' : 'lose'}` }, [
        h('div', { className: 'emoji', text: win ? '🏆' : r.result === 'timeout' ? '⌛' : '💀' }),
        h('h2', { text: win ? 'VICTOIRE' : r.result === 'timeout' ? 'TEMPS ÉCOULÉ' : 'DÉFAITE' }),
        h('p', { className: 'muted small', text: win ? `Étape ${r.stage} · ${fmtTime(r.duration)}` : 'Trop faible : monte tes héros' }),
        h('div', { className: 'rewards' }, [
          h('span', { text: `🪙 +${fmt(rw.gold)}` }),
          h('span', { text: `💎 +${rw.gems}` }),
          rw.tickets ? h('span', { text: `🎟️ +${rw.tickets}` }) : null,
        ]),
        h('div', { className: 'row' }, [
          h('button', { className: 'btn primary grow', text: win ? 'Suivant ▶' : 'Réessayer ↻', onClick: () => (win ? game.nextStage() : game.retry()) }),
          h('button', { className: 'btn', text: 'Renforcer', onClick: () => goTo('heroes') }),
        ]),
      ]));
    }

    hooks.on('battle:start', () => { overlay.innerHTML = ''; cutinBox.innerHTML = ''; if (current === 'battle') paint(); });
    hooks.on('attack', ({ unit }) => {
      if (current !== 'battle' || !unit) return;
      bump(unit, unit.side === 'ally' ? 'up' : 'down');
    });
    hooks.on('damage', ({ target, amount, crit, affinity }) => {
      if (current !== 'battle') return;
      const r = cards.get(target.uid);
      if (!r) return;
      const cls = crit ? 'crit' : affinity > 0 ? 'super' : affinity < 0 ? 'weak' : '';
      ui.float(fx, r.portrait, `-${fmt(amount)}${crit ? ' !' : ''}`, cls);
      r.node.classList.remove('hit');
      void r.node.offsetWidth;
      r.node.classList.add('hit');
      if (crit) shake(1.6);
      else if (target.isBoss) shake(1);
    });
    hooks.on('heal', ({ target, amount }) => {
      if (current !== 'battle') return;
      const r = cards.get(target.uid);
      if (r) ui.float(fx, r.portrait, `+${fmt(amount)}`, 'heal');
    });
    hooks.on('shield', ({ unit }) => {
      if (current !== 'battle') return;
      const r = cards.get(unit?.uid);
      if (r) ui.float(fx, r.portrait, 'BOUCLIER', 'shielded');
    });
    hooks.on('stun', ({ unit }) => {
      if (current !== 'battle') return;
      const r = cards.get(unit?.uid);
      if (r) ui.float(fx, r.portrait, 'ÉTOURDI', 'status');
    });
    hooks.on('death', ({ unit }) => {
      if (current !== 'battle') return;
      const r = cards.get(unit?.uid);
      if (r) {
        r.node.classList.add('dying');
        setTimeout(() => r.node.classList.remove('dying'), 600);
      }
    });
    hooks.on('skill:cast', ({ unit }) => {
      if (current !== 'battle') return;
      const r = cards.get(unit?.uid);
      if (!r) return;
      r.node.classList.add('casting');
      setTimeout(() => r.node.classList.remove('casting'), 560);
      if (unit.side === 'ally') cutIn(unit);
    });
    hooks.on('log', (e) => {
      if (current !== 'battle') return;
      logBox.append(h('div', { className: `logline ${e.kind}` }, `${e.t.toFixed(1)}s · ${e.message}`));
      while (logBox.children.length > 8) logBox.firstChild.remove();
      logBox.scrollTop = logBox.scrollHeight;
    });
    hooks.on('battle:end', (r) => { if (current === 'battle') { showResult(r); sync(); } });

    const view = {
      id: 'battle', label: 'Combat', icon: '⚔️', el: screen,
      onShow() { if (!game.battle && !game.pending) game.startBattle(); paint(); if (game.pending) showResult(game.pending); },
      update() { if (current === 'battle') sync(); },
    };
    return view;
  }

  // ------------------------------------------------------------- héros
  function buildHeroes() {
    const teamRow = h('div', { className: 'slots' });
    const grid = h('div', { className: 'grid' });
    const synergy = h('div', { className: 'synergy' });
    let filter = 'all';
    const filters = h('div', { className: 'chips' });

    const screen = h('section', { className: 'screen' }, [
      h('div', { className: 'sect-head' }, [h('h1', { text: 'Héros' }), h('span', { className: 'pill', id: 'owned' })]),
      teamRow, synergy, filters, grid,
    ]);

    function paintTeam() {
      teamRow.innerHTML = '';
      const team = game.state.team.filter(Boolean);
      for (let i = 0; i < 5; i++) {
        const id = team[i];
        const s = id ? game.stats(id) : null;
        if (!s) { teamRow.append(h('div', { className: 'slot empty', text: '+' })); continue; }
        teamRow.append(h('button', { className: `slot rar-${s.rarity}`, onClick: () => detail(id) }, [
          h('span', { className: 'slot-av', style: { background: `radial-gradient(circle at 30% 20%, ${s.colors[0]}, ${s.colors[1]})` } }, [
            s.art ? h('img', { className: 'slot-img', src: s.art, alt: '', onError: (ev) => ev.target.remove() }) : null,
            h('span', { className: 'slot-glyph', text: s.icon }),
          ]),
          h('span', { className: 'slot-n', text: s.name }),
          h('span', { className: 'slot-l', text: `Lv ${s.level}` }),
        ]));
      }
    }

    function paintSynergy() {
      const syn = game.synergyInfo();
      synergy.innerHTML = '';
      if (!syn.best.count) { synergy.append(h('span', { className: 'muted small', text: 'Synergie : 2 héros du même élément = +6 % ATQ/PV' })); return; }
      const e = el(syn.best.element);
      synergy.append(h('span', { className: 'syn-badge', style: { borderColor: e.color } },
        `${e.icon} ${syn.best.element} ×${syn.best.count} · +${Math.round(syn.best.bonus * 100)} %`));
    }

    function paintFilters() {
      filters.innerHTML = '';
      for (const f of [{ id: 'all', label: 'Tous' }, ...ROLE_ORDER.map((r) => ({ id: r, label: `${ROLE_ICON[r]} ${r}` }))]) {
        filters.append(h('button', {
          className: `chip ${filter === f.id ? 'on' : ''}`,
          text: f.label,
          onClick: () => { filter = f.id; paintFilters(); paintGrid(); },
        }));
      }
    }

    function paintGrid() {
      grid.innerHTML = '';
      const owned = game.owned().map((o) => game.stats(o.id)).filter(Boolean)
        .filter((s) => filter === 'all' || s.role === filter)
        .sort((a, b) => b.power - a.power);
      for (const s of owned) grid.append(heroCard(s));
      if (!owned.length) grid.append(h('div', { className: 'empty', text: 'Aucun héros pour ce filtre' }));
      document.getElementById('owned').textContent = `${game.owned().length}/${DB.heroes.size} · Puissance ${fmt(game.teamPower())}`;
    }

    function heroCard(s) {
      const inTeam = game.state.team.includes(s.id);
      const art = h('div', {
        className: `hart ${s.art ? 'has-art' : ''}`,
        style: { background: `radial-gradient(circle at 30% 15%, ${s.colors[0]}, ${s.colors[1]})` },
      }, [
        s.art ? h('img', {
          className: 'hart-img', src: s.art, alt: s.name, loading: 'lazy', draggable: false,
          onError: (ev) => { ev.target.remove(); art.classList.remove('has-art'); },
        }) : null,
        h('span', { className: 'hglyph', text: s.icon }),
        h('span', { className: 'hshine' }),
        h('span', { className: 'hel', text: el(s.element).icon }),
        inTeam ? h('span', { className: 'hbadge', text: 'ÉQUIPE' }) : null,
        h('span', { className: 'hstars', text: '★'.repeat(s.stars) }),
      ]);
      return h('button', { className: `hcard rar-${s.rarity}`, onClick: () => detail(s.id) }, [
        art,
        h('div', { className: 'hmeta' }, [
          h('b', { text: s.name }),
          h('span', { className: 'hrole', text: `${ROLE_ICON[s.role]} ${s.role}` }),
          h('span', { className: 'hpow', text: `⚡ ${fmt(s.power)}` }),
        ]),
      ]);
    }

    function detail(id) {
      const body = h('div', { className: 'detail' });
      ui.modal({ title: '', content: body, wide: true, onClose: () => { paintTeam(); paintGrid(); } });
      const render = () => {
        const s = game.stats(id);
        if (!s) return;
        const inst = game.state.heroes[id];
        const cap = levelCap(inst.stars);
        const asc = game.ascendInfo(id);
        const inTeam = game.state.team.includes(id);
        const maxed = inst.stars >= maxStars();
        body.innerHTML = '';
        body.append(
          h('div', {
            className: `hero-banner rar-${s.rarity} ${s.art ? 'has-art' : ''}`,
            style: { background: `radial-gradient(circle at 30% 15%, ${s.colors[0]}, ${s.colors[1]})` },
          }, [
            s.art ? h('img', {
              className: 'banner-img', src: s.art, alt: s.name, draggable: false,
              onError: (ev) => { const b = ev.target.parentElement; ev.target.remove(); b.classList.remove('has-art'); },
            }) : null,
            h('div', { className: 'banner-fade' }),
          ]),
          h('div', { className: 'dhead' }, [
            h('div', { className: `dart rar-${s.rarity}`, style: { background: `radial-gradient(circle at 30% 15%, ${s.colors[0]}, ${s.colors[1]})` }, text: s.icon }),
            h('div', { className: 'did' }, [
              h('div', { className: 'dname' }, [h('h2', { text: s.name }), h('span', { className: `tag ${s.rarity}`, text: RARITY[s.rarity].label })]),
              h('p', { className: 'muted tiny', text: `${s.title} · ${ROLE_ICON[s.role]} ${s.role} · ${el(s.element).icon} ${s.element}` }),
              h('div', { className: 'stars', text: '★'.repeat(inst.stars) + '☆'.repeat(Math.max(0, maxStars() - inst.stars)) }),
              h('div', { className: 'pow', text: `⚡ ${fmt(s.power)}` }),
            ]),
          ]),
          h('div', { className: 'stats' }, [
            stat('❤️', fmt(s.maxHp), 'PV'), stat('⚔️', fmt(s.atk), 'ATQ'), stat('🛡️', fmt(s.def), 'DEF'),
            stat('💨', s.spd.toFixed(2), 'VIT'), stat('🎯', `${Math.round(s.crit * 100)} %`, 'CRIT'), stat('💥', `${Math.round(s.critDmg * 100)} %`, 'D.CRIT'),
          ]),
          h('div', { className: 'skill' }, [h('b', { text: `✦ ${s.skill?.name ?? '—'}` }), h('p', { className: 'muted small', text: s.skill?.desc ?? '' })]),
          h('div', { className: 'up' }, [
            h('div', { className: 'row between' }, [h('b', { text: `Niveau ${inst.level} / ${cap}` }), h('span', { className: 'muted small', text: inst.level >= cap ? 'Palier atteint' : `${fmt(levelCost(inst.level + 1))} 🪙` })]),
            h('div', { className: 'row' }, [
              h('button', { className: 'btn', text: '+1', onClick: () => { game.levelUp(id, 1); render(); } }),
              h('button', { className: 'btn', text: '+10', onClick: () => { game.levelUp(id, 10); render(); } }),
              h('button', { className: 'btn primary grow', text: 'MAX', onClick: () => { game.maxLevelUp(id); render(); } }),
            ]),
          ]),
          h('div', { className: 'up' }, [
            h('div', { className: 'row between' }, [h('b', { text: maxed ? 'Étoiles max' : `Ascension ${inst.stars}★ → ${inst.stars + 1}★` }), h('span', { className: 'muted small', text: maxed ? '★★★★★' : `${inst.shards ?? 0}/${asc.need} ✦` })]),
            maxed ? null : h('div', { className: 'bar shards' }, [h('div', { className: 'bar-fill', style: { width: `${Math.min(100, ((inst.shards ?? 0) / asc.need) * 100)}%` } })]),
            maxed ? null : h('button', { className: 'btn primary full', text: asc.can ? '⬆ Monter en étoile' : 'Fragments insuffisants', disabled: !asc.can, onClick: () => { game.ascend(id); render(); } }),
          ]),
          h('button', {
            className: `btn ${inTeam ? 'ghost' : 'primary'} full`,
            text: inTeam ? 'Retirer de l’équipe' : 'Équiper',
            onClick: () => {
              const r = game.toggleTeam(id);
              if (r === 'full') ui.toast('Équipe complète (5 max)', 'warn');
              render(); paintTeam(); paintGrid();
            },
          }),
        );
      };
      render();
    }

    const stat = (i, v, l) => h('div', { className: 'stat' }, [h('span', { text: i }), h('b', { text: v }), h('span', { className: 'lbl', text: l })]);

    return {
      id: 'heroes', label: 'Héros', icon: '🦸', el: screen,
      onShow() { paintTeam(); paintSynergy(); paintFilters(); paintGrid(); },
      update() {},
    };
  }

  // ------------------------------------------------------------- invocation
  function buildSummon() {
    const results = h('div', { className: 'pulls' });
    const pity = h('div', { className: 'pity' });
    const screen = h('section', { className: 'screen' }, [
      h('div', { className: 'portal' }, [
        h('div', { className: 'portal-glow' }),
        h('div', { className: 'portal-core', text: '🔮' }),
        h('h1', { text: 'PORTAIL DES HÉROS' }),
        h('p', { className: 'muted', text: 'Invoque, collectionne, monte en étoiles' }),
      ]),
      pity,
      h('div', { className: 'row' }, [
        h('button', { className: 'btn summon', onClick: () => pull(1) }, [h('b', { text: '×1' }), h('span', { text: '1 🎟️ · 100 💎' })]),
        h('button', { className: 'btn primary summon', onClick: () => pull(10) }, [h('b', { text: '×10' }), h('span', { text: '10 🎟️ · 900 💎' })]),
      ]),
      results,
    ]);

    function paintPity() {
      const max = DB.config.summon?.pityEpic ?? 10;
      const p = game.state.pity.epic ?? 0;
      pity.innerHTML = '';
      pity.append(h('span', { className: 'muted small', text: 'Garantie épique' }),
        h('div', { className: 'bar' }, [h('div', { className: 'bar-fill', style: { width: `${(p / max) * 100}%` } })]),
        h('b', { text: `${p}/${max}` }));
    }

    function pull(n) {
      const res = game.summon(n);
      if (!res.ok) return ui.toast(res.reason, 'warn');
      results.innerHTML = '';
      const fresh = res.results.filter((r) => r.isNew).length;
      res.results.forEach((r, i) => {
        results.append(h('div', { className: `pull rar-${r.rarity} ${r.isNew ? 'new' : ''}`, style: { animationDelay: `${i * 50}ms` } }, [
          h('div', { className: 'pull-art', style: { background: `radial-gradient(circle at 30% 20%, ${r.def.colors[0]}, ${r.def.colors[1]})` } }, [
            r.def.art ? h('img', { className: 'pull-img', src: r.def.art, alt: '', onError: (ev) => ev.target.remove() }) : null,
            h('span', { className: 'pull-glyph', text: r.def.icon }),
          ]),
          h('b', { text: r.def.name }),
          h('span', { className: 'tagx', text: r.isNew ? 'NOUVEAU' : `+${r.shards} ✦` }),
        ]));
      });
      ui.toast(fresh ? `${fresh} nouveau(x) héros !` : '+fragments', fresh ? 'success' : 'info');
      paintPity();
    }

    return { id: 'summon', label: 'Invoquer', icon: '🔮', el: screen, onShow: paintPity, update() {} };
  }

  // ------------------------------------------------------------- autel
  function buildAutel() {
    const grid = h('div', { className: 'autel' });
    const summary = h('div', { className: 'synergy' });
    const UPS = [
      { key: 'atk', icon: '⚔️', name: 'Rage Ancestrale', desc: 'ATQ de tous les héros', per: 0.07 },
      { key: 'hp', icon: '❤️', name: 'Souffle de Vie', desc: 'PV de tous les héros', per: 0.07 },
      { key: 'gold', icon: '🪙', name: 'Fortune Dorée', desc: 'Or gagné partout', per: 0.05 },
    ];
    const screen = h('section', { className: 'screen' }, [
      h('div', { className: 'altar' }, [h('span', { text: '🕯️' }), h('span', { className: 'core', text: '🔮' }), h('span', { text: '🕯️' })]),
      h('h1', { className: 'center', text: 'Autel des Âmes' }),
      h('p', { className: 'muted center small', text: 'Améliorations permanentes, pour toute ton équipe' }),
      summary, grid,
    ]);

    function paint() {
      grid.innerHTML = '';
      for (const u of UPS) {
        const info = game.autelInfo(u.key);
        const bonus = Math.pow(1 + u.per, info.level) - 1;
        grid.append(h('div', { className: `acard ${info.can ? 'can' : ''}` }, [
          h('div', { className: 'aico', text: u.icon }),
          h('div', { className: 'abody' }, [
            h('div', { className: 'row between' }, [h('b', { text: u.name }), h('span', { className: 'pill', text: `Niv ${info.level}` })]),
            h('p', { className: 'muted tiny', text: u.desc }),
            h('div', { className: 'row between' }, [h('span', { className: 'muted tiny', text: 'Bonus' }), h('b', { className: 'gold', text: `+${(bonus * 100).toFixed(0)} %` })]),
            h('button', { className: 'btn primary full', text: `${fmt(info.cost)} 🪙`, disabled: !info.can, onClick: () => { if (game.upgradeAutel(u.key)) { paint(); } else ui.toast('Or insuffisant', 'warn'); } }),
          ]),
        ]));
      }
      const g = game.globals();
      summary.innerHTML = '';
      summary.append(
        h('span', { className: 'syn-badge', text: `ATQ ×${g.atk.toFixed(2)}` }),
        h('span', { className: 'syn-badge', text: `PV ×${g.hp.toFixed(2)}` }),
        h('span', { className: 'syn-badge', text: `Or ×${g.gold.toFixed(2)}` }),
      );
    }

    return { id: 'autel', label: 'Autel', icon: '🕯️', el: screen, onShow: paint, update() {} };
  }

  // ------------------------------------------------------------- mods
  function buildMods() {
    const list = h('div', { className: 'modlist' });
    const nameIn = h('input', { className: 'input', placeholder: 'Nom du mod' });
    const idIn = h('input', { className: 'input', placeholder: 'id-du-mod' });
    const codeIn = h('textarea', { className: 'code', spellcheck: 'false', placeholder: '// tape ta mécanique ici' });
    const out = h('pre', { className: 'console' });

    const TPL = {
      heros: `api.registerContent({
  heroes: [{
    id: "aster", name: "Aster", title: "Étoile Filante",
    rarity: "legendary", role: "Mage", element: "Lumière",
    icon: "🌟", colors: ["#ffe9a8", "#6a4a10"],
    base: { hp: 860, atk: 150, def: 30, spd: 1.05, crit: 0.15, critDmg: 1.7 },
    growth: { hp: 72, atk: 12, def: 2.6 },
    skill: { name: "Météore", desc: "Frappe tous les ennemis.", effect: "cleave", power: 1.1 }
  }]
});
api.unlockHero("aster");
api.toast("Aster a rejoint ton roster !", "success");`,

      meca: `// MÉCANIQUE : les critiques volent 8 % de vie
api.on("hit", ({ battle, source, crit, amount }) => {
  if (!crit || !source?.alive) return;
  battle.heal(source, amount * 0.08);
});

// +25 % d'or permanent
api.addGlobalMultiplier("or_plus", () => ({ gold: 1.25 }));

// Nouvel effet de compétence
api.registerSkillEffect("chaos_bolt", (u, b) => {
  for (let i = 0; i < 5; i++) {
    const foes = b.enemiesOf(u);
    if (!foes.length) break;
    b.damage(u, foes[Math.floor(Math.random() * foes.length)], b.atkOf(u) * 0.5);
  }
});

api.toast("Mod chargé : vol de vie critique", "success");`,

      regle: `// Règle maison : chaque victoire donne 3 gemmes de plus
api.on("stage:complete", () => {
  api.addGems(3);
  api.toast("+3 💎 (mod règle maison)", "info");
});

// Et on rend le gacha plus généreux
api.registerContent({ config: { summon: { weights: { rare: 40, epic: 40, legendary: 20 } } } });`,
    };

    const screen = h('section', { className: 'screen' }, [
      h('div', { className: 'sect-head' }, [h('h1', { text: 'Mods' }), h('span', { className: 'pill', text: 'moddable à l’infini' })]),
      h('p', { className: 'muted small', text: 'Active un mod, importe un pack JSON, ou écris ta mécanique dans le Labo.' }),
      h('div', { className: 'sect-head' }, [h('h3', { text: 'Installés' })]),
      list,
      h('div', { className: 'sect-head' }, [h('h3', { text: 'Laboratoire' })]),
      h('div', { className: 'lab' }, [
        h('div', { className: 'row' }, [nameIn, idIn]),
        codeIn,
        h('div', { className: 'chips' }, [
          h('button', { className: 'chip', text: '🧙 Héros', onClick: () => fill('heros', 'Pack héros', 'pack-heros') }),
          h('button', { className: 'chip', text: '⚙️ Mécanique', onClick: () => fill('meca', 'Vol de vie critique', 'crit-lifesteal') }),
          h('button', { className: 'chip', text: '📜 Règle maison', onClick: () => fill('regle', 'Règles maison', 'regles-maison') }),
        ]),
        h('div', { className: 'row' }, [
          h('button', { className: 'btn', text: '▶ Tester', onClick: test }),
          h('button', { className: 'btn primary grow', text: '💾 Enregistrer', onClick: save }),
        ]),
        out,
      ]),
      h('div', { className: 'row' }, [
        h('label', { className: 'btn ghost' }, ['📥 Importer un pack .json', h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: importer })]),
        h('button', { className: 'btn ghost', text: '📤 Exporter mes mods', onClick: exporter }),
        h('button', { className: 'btn ghost', text: '💾 Sauvegarde du jeu', onClick: () => game.exportSave() }),
      ]),
      h('div', { className: 'docs' }, [
        h('p', { className: 'muted small', text: 'Un mod = du JavaScript qui reçoit « api ».' }),
        h('p', { html: '<b>Contenu</b> <code>api.registerContent({ heroes, enemies, config })</code>' }),
        h('p', { html: '<b>Évènements</b> <code>api.on("hit", fn)</code> — ' + (api.EVENTS ?? []).join(' · ') }),
        h('p', { html: '<b>Mécaniques</b> <code>api.registerSkillEffect(nom, fn)</code> · <code>api.addGlobalMultiplier(nom, fn)</code>' }),
        h('p', { html: '<b>Récompenses</b> <code>api.addGold(n)</code> · <code>api.addGems(n)</code> · <code>api.setStage(n)</code>' }),
      ]),
    ]);

    const fill = (k, n, id) => { codeIn.value = TPL[k]; nameIn.value = n; idIn.value = id; };
    const log = (t, c = '') => { out.className = `console ${c}`; out.textContent = t; };

    function paintList() {
      list.innerHTML = '';
      for (const m of mods.list()) {
        list.append(h('div', { className: `mrow ${m.enabled ? 'on' : ''}` }, [
          h('div', {}, [
            h('div', { className: 'row' }, [h('b', { text: m.name ?? m.id }), h('span', { className: 'pill tiny', text: m.builtin ? 'fourni' : 'labo' })]),
            h('p', { className: 'muted tiny', text: m.description ?? '' }),
          ]),
          h('div', { className: 'row' }, [
            h('button', {
              className: `toggle ${m.enabled ? 'on' : ''}`,
              onClick: () => { mods.toggle(m.id); ui.toast('Recharge la page (F5) pour appliquer', 'info'); paintList(); },
            }),
            !m.builtin ? h('button', { className: 'icon-btn', text: '✎', onClick: () => { nameIn.value = m.name; idIn.value = m.id; codeIn.value = m.code ?? ''; } }) : null,
            !m.builtin ? h('button', { className: 'icon-btn danger', text: '🗑', onClick: () => { mods.removeCustom(m.id); paintList(); } }) : null,
          ]),
        ]));
      }
      if (!mods.list().length) list.append(h('div', { className: 'empty', text: 'Aucun mod installé' }));
    }

    function test() {
      const code = codeIn.value.trim();
      if (!code) return log('Écris du code d’abord.', 'err');
      try {
        new Function('api', `"use strict";\n${code}`)(api);
        log('✓ Exécuté sans erreur.', 'ok');
        api.toast('Mod testé ✓', 'success');
      } catch (err) { log(`✗ ${err.name} : ${err.message}`, 'err'); }
    }

    function save() {
      const code = codeIn.value.trim();
      const name = nameIn.value.trim() || 'Mon mod';
      const id = (idIn.value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 40);
      if (!code) return log('Rien à enregistrer.', 'err');
      try {
        mods.saveCustom({ id, name, code, description: `Créé le ${new Date().toLocaleDateString('fr-FR')}` });
        log('✓ Enregistré. F5 pour l’appliquer au démarrage.', 'ok');
        ui.toast(`« ${name} » enregistré`, 'success');
        paintList();
      } catch (err) { log(`✗ ${err.message}`, 'err'); }
    }

    async function importer(e) {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const def = JSON.parse(await f.text());
        mods.importPack(def);
        paintList();
        log('✓ Pack importé. F5.', 'ok');
      } catch (err) { log(`✗ Import : ${err.message}`, 'err'); }
      e.target.value = '';
    }

    function exporter() {
      const custom = game.state.mods.custom ?? [];
      if (!custom.length) return ui.toast('Aucun mod à exporter', 'warn');
      const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'mes-mods.json' });
      a.click();
    }

    // API UI pour les mods
    api.h = h;
    api.toast = (m, k) => ui.toast(m, k);
    api.addTab = (t) => ui.addTab(t);

    return {
      id: 'mods', label: 'Mods', icon: '🧩', el: screen,
      onShow() { paintList(); if (!codeIn.value) fill('meca', 'Vol de vie critique', 'crit-lifesteal'); },
      update() {},
    };
  }

  // ------------------------------------------------------------- coquille
  let mainEl = null;

  function mount() {
    screens.set('battle', buildBattle());
    screens.set('heroes', buildHeroes());
    screens.set('summon', buildSummon());
    screens.set('autel', buildAutel());
    screens.set('mods', buildMods());

    const main = h('main', { className: 'main' });
    mainEl = main;
    for (const v of screens.values()) main.append(v.el);

    const top = h('header', { className: 'topbar' }, [gold, gems, tickets]);
    document.body.append(top, main, nav);

    // les écrans de base deviennent des onglets (les mods peuvent en ajouter)
    const base = [...screens.values()].map((v) => ({ id: v.id, label: v.label, icon: v.icon }));
    ui.tabs = [...base, ...ui.tabs.filter((t) => !base.some((b) => b.id === t.id))];

    ui.onTabs = (tabs) => {
      nav.innerHTML = '';
      for (const t of tabs) nav.append(h('button', { className: 'tab', dataset: { id: t.id }, onClick: () => goTo(t.id) }, [
        h('span', { className: 'tico', text: t.icon }), h('span', { text: t.label }),
      ]));
      paintNav();
    };
    ui.onTabs(ui.tabs);

    function paintNav() {
      for (const b of nav.children) b.classList.toggle('active', b.dataset.id === current);
    }

    goTo('battle');
    refreshTop();
    setInterval(refreshTop, 400);
    return { goTo, update: (dt) => screens.get(current)?.update?.(dt) };
  }

  function goTo(id) {
    let v = screens.get(id);
    if (!v) {
      // onglet fourni par un mod : on construit son écran à la demande
      const tab = ui.tabs.find((t) => t.id === id);
      if (!tab?.render) return;
      const section = h('section', { className: 'screen' });
      try {
        const content = tab.render();
        if (content) section.append(content);
      } catch (err) {
        section.append(h('div', { className: 'empty', text: `Erreur dans l'onglet : ${err.message}` }));
      }
      v = { id, el: section, onShow: () => { if (tab.update) tab.update(); }, update: () => {} };
      screens.set(id, v);
      mainEl?.append(section);
    }
    for (const s of screens.values()) s.el.classList.toggle('active', s === v);
    current = id;
    for (const b of nav.children) b.classList.toggle('active', b.dataset.id === id);
    v.onShow?.();
    refreshTop();
  }

  return { mount, goTo, refreshTop, update: (dt) => screens.get(current)?.update?.(dt) };
}
