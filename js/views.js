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

  // ------------------------------------------------------------- accueil
  function buildLobby() {
    const showcase = h('div', { className: 'showcase' });
    const progress = h('div', { className: 'lobby-progress' });
    const actions = h('div', { className: 'lobby-grid' });
    const bottom = h('div', { className: 'lobby-bottom' });
    const screen = h('section', { className: 'screen lobby' }, [showcase, progress, actions, bottom]);

    const chapterOf = (stage) => {
      const i = Math.floor((stage - 1) / 8) % Math.max(1, DB.factions.length);
      return DB.factions[i] ?? { name: 'Campagne', tint: '#6a5cff' };
    };

    function paint() {
      const team = game.state.team.map((id) => game.stats(id)).filter(Boolean).sort((a, b) => b.power - a.power);
      const star = team[0];
      showcase.innerHTML = '';
      if (star) {
        showcase.style.setProperty('--r', RARITY[star.rarity]?.color ?? '#888');
        showcase.append(
          h('img', { className: 'showcase-art', src: star.art, alt: star.name, onError: (e) => e.target.remove() }),
          h('div', { className: 'showcase-shade' }),
          h('div', { className: 'showcase-info' }, [
            h('span', { className: 'sc-tag', text: RARITY[star.rarity]?.label ?? '' }),
            h('h2', { className: 'sc-name', text: star.name }),
            h('p', { className: 'sc-title', text: star.title }),
            h('div', { className: 'sc-stats' }, [
              h('span', { text: `⚡ ${fmt(game.teamPower())}` }),
              h('span', { text: `👥 ${team.length}/5` }),
            ]),
          ]),
          h('div', { className: 'showcase-team' }, team.map((t) => h('button', {
            className: `mini rar-${t.rarity}`,
            title: t.name,
            onClick: () => { goTo('heroes'); },
          }, [
            h('img', { src: t.art, alt: '', onError: (e) => { e.target.replaceWith(document.createTextNode(t.icon)); } }),
            h('span', { text: t.level }),
          ]))),
        );
      }

      const stage = game.state.stage;
      const ch = chapterOf(stage);
      const idx = ((stage - 1) % 8) + 1;
      progress.innerHTML = '';
      progress.style.setProperty('--tint', ch.tint ?? '#6a5cff');
      progress.append(
        h('div', { className: 'lp-head' }, [
          h('div', { className: 'lp-ch' }, [
            h('span', { className: 'lp-kicker', text: `CHAPITRE ${Math.floor((stage - 1) / 8) + 1}` }),
            h('b', { text: ch.name }),
          ]),
          h('span', { className: 'pill', text: `Étape ${stage}` }),
        ]),
        h('div', { className: 'bar chap' }, [h('div', { className: 'bar-fill', style: { width: `${(idx / 8) * 100}%` } })]),
        h('button', {
          className: 'btn primary cta',
          onClick: () => { game.startBattle(); goTo('battle'); },
        }, [
          h('span', { className: 'cta-ico', text: '⚔️' }),
          h('span', { className: 'cta-txt' }, [
            h('b', { text: stage % 5 === 0 ? 'AFFRONTER LE BOSS' : "COMBATTRE" }),
            h('span', { text: `Étape ${stage} · ${ch.name}` }),
          ]),
          h('span', { className: 'cta-ar', text: '›' }),
        ]),
      );

      actions.innerHTML = '';
      for (const a of [
        { icon: '🗺️', label: 'Campagne', sub: `Étape ${game.state.stats.best}`, go: 'campaign' },
        { icon: '🦸', label: 'Héros', sub: `${game.owned().length}/${DB.heroes.size}`, go: 'heroes' },
        { icon: '🔮', label: 'Invoquer', sub: `${game.state.tickets} 🎟️`, go: 'summon' },
        { icon: '🕯️', label: 'Autel', sub: `Nv ${(game.state.autel.atk ?? 0) + (game.state.autel.hp ?? 0) + (game.state.autel.gold ?? 0)}`, go: 'autel' },
        { icon: '🧩', label: 'Mods', sub: `${game.state.mods.enabled.length} actif(s)`, go: 'mods' },
        { icon: '💾', label: 'Sauvegarde', sub: 'exporter', on: () => game.exportSave() },
      ]) {
        actions.append(h('button', {
          className: 'lobby-tile',
          onClick: () => (a.on ? a.on() : goTo(a.go)),
        }, [
          h('span', { className: 'lt-ico', text: a.icon }),
          h('span', { className: 'lt-body' }, [h('b', { text: a.label }), h('span', { text: a.sub })]),
        ]));
      }

      bottom.innerHTML = '';
      bottom.append(h('div', { className: 'lobby-note' }, [
        h('b', { text: '0 € · 0 énergie · 0 attente' }),
        h('p', { className: 'muted tiny', text: 'Tu joues autant que tu veux. Tu bloques ? Tu farmes, tu montes, tu repasses.' }),
      ]));
    }

    return {
      id: 'lobby', label: 'Accueil', icon: '🏰', el: screen,
      onShow: paint, update() {},
    };
  }

  // ------------------------------------------------------------- campagne
  function buildCampaign() {
    const list = h('div', { className: 'chapters' });
    const head = h('div', { className: 'sect-head' }, [
      h('h1', { text: 'Campagne' }),
      h('span', { className: 'pill', text: `Record : étape ${game.state.stats.best}` }),
    ]);
    const screen = h('section', { className: 'screen' }, [head, list]);

    function paint() {
      list.innerHTML = '';
      DB.factions.forEach((f, ci) => {
        const from = ci * 8 + 1;
        const to = from + 7;
        const cleared = Math.max(0, Math.min(8, game.state.stats.best - (from - 1)));
        const nodes = h('div', { className: 'nodes' });
        for (let n = from; n <= to; n++) {
          const isBoss = n % 5 === 0;
          const done = n <= game.state.stats.best;
          const current = n === game.state.stage;
          const locked = n > game.state.stats.best + 1;
          nodes.append(h('button', {
            className: `node ${done ? 'done' : ''} ${current ? 'current' : ''} ${locked ? 'locked' : ''} ${isBoss ? 'boss' : ''}`,
            disabled: locked,
            onClick: () => {
              if (locked) return ui.toast('Termine d’abord l’étape précédente', 'warn');
              closeChapter();
              game.setStage(n);
              goTo('battle');
            },
          }, [
            h('span', { className: 'node-ico', text: locked ? '🔒' : isBoss ? '☠️' : done ? '✓' : '⚔️' }),
            h('span', { className: 'node-n', text: n }),
          ]));
        }
        const card = h('div', {
          className: 'chapter',
          style: { '--tint': f.tint ?? '#6a5cff' },
        }, [
          h('div', { className: 'chapter-hero' }, [
            h('img', {
              className: 'chapter-boss', src: `assets/sprites/${f.id}_boss.webp`, alt: '',
              onError: (e) => e.target.remove(),
            }),
            h('div', { className: 'chapter-shade' }),
            h('div', { className: 'chapter-id' }, [
              h('span', { className: 'chapter-n', text: `CHAPITRE ${ci + 1}` }),
              h('b', { text: f.name }),
              h('span', { className: 'chapter-sub', text: `${cleared}/8 étapes · boss à l’étape ${from + 4}` }),
            ]),
            h('div', { className: 'chapter-prog' }, [h('i', { style: { width: `${(cleared / 8) * 100}%` } })]),
          ]),
          nodes,
        ]);
        list.append(card);
      });
    }
    function closeChapter() {}
    return { id: 'campaign', label: 'Campagne', icon: '🗺️', el: screen, onShow: paint, update() {} };
  }

  // ------------------------------------------------------------- combat
  function buildBattle() {
    const actors = new Map();
    const enemyRow = h('div', { className: 'row enemy' });
    const allyRow = h('div', { className: 'row ally' });
    const fx = h('div', { className: 'fx' });
    const cutinBox = h('div', { className: 'cutin-box' });
    const overlay = h('div', { className: 'overlay' });
    const ultBar = h('div', { className: 'ult-bar' });
    const chapterLabel = h('span', { className: 'hud-chapter' });
    const waveTag = h('span', { className: 'hud-wave' });
    const timer = h('span', { className: 'timer' });

    const speedBtn = h('button', { className: 'chip sm', text: `×${game.state.settings.speed}`, onClick: () => cycleSpeed(speedBtn) });
    const autoBtn = h('button', { className: `chip sm ${game.state.settings.autoCast ? 'on' : ''}`, text: 'AUTO', onClick: () => toggleAuto(autoBtn) });

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
      ui.toast(game.state.settings.autoCast ? 'Ultimes automatiques' : 'Ultimes manuels : touche les portraits', 'info');
    }

    const stageEl = h('div', { className: 'stage' }, [
      h('div', { className: 'stage-bg' }),
      h('div', { className: 'stage-fog' }),
      h('div', { className: 'stage-vig' }),
      h('div', { className: 'hud' }, [
        h('button', { className: 'hud-btn', text: '‹', onClick: () => goTo('campaign') }),
        h('div', { className: 'hud-mid' }, [chapterLabel, waveTag]),
        h('div', { className: 'hud-right' }, [timer, speedBtn, autoBtn]),
      ]),
      enemyRow,
      allyRow,
      fx,
      cutinBox,
      overlay,
    ]);

    const controls = h('div', { className: 'battle-controls' }, [
      h('button', { className: 'btn sm', text: '⏭ +5', onClick: () => game.setStage(game.state.stage + 5) }),
      h('button', { className: 'btn sm', text: 'Retry', onClick: () => game.retry() }),
      h('button', { className: 'btn sm', text: '⚡ Passer', onClick: () => { if (game.battle) game.battle.finish('timeout'); } }),
    ]);

    const screen = h('section', { className: 'screen battle' }, [stageEl, ultBar, controls]);

    // ------------------------------------------------------- acteur
    function actorNode(u) {
      const spr = h('img', {
        className: 'spr', src: `assets/sprites/${u.id}.webp`, alt: u.name, draggable: false,
        onError: (ev) => {
          const wrap = ev.target.parentElement;
          ev.target.remove();
          wrap.classList.add('no-spr');
          if (u.art) {
            wrap.prepend(h('div', { className: 'bust' }, [
              h('img', {
                src: u.art, alt: u.name,
                onError: (e2) => { e2.target.remove(); wrap.classList.add('no-img'); },
              }),
              h('span', { className: 'bust-glyph', text: u.icon }),
            ]));
          } else {
            wrap.prepend(h('span', { className: 'token', text: u.icon }));
          }
        },
      });
      const node = h('div', {
        className: `actor ${u.side} ${u.isBoss ? 'boss' : ''} rar-${u.rarity ?? 'rare'}`,
      }, [
        h('div', { className: 'spr-wrap' }, [
          h('div', { className: 'ground' }),
          spr,
          h('div', { className: 'aura' }),
          h('div', { className: 'flash' }),
          h('span', { className: 'crown', text: '👑' }),
          h('div', { className: 'bar hp' }, [h('div', { className: 'bar-fill' })]),
          h('div', { className: 'status' }),
        ]),
        h('div', { className: 'nm', text: u.isBoss ? u.name.replace(' — ÉLITE', '') : u.name }),
      ]);
      node.style.setProperty('--el', ELEMENTS[u.element]?.color ?? '#fff');
      node.querySelector('.crown').style.display = u.isBoss ? '' : 'none';
      const refs = {
        u, node,
        spr: spr,
        hp: node.querySelector('.bar.hp .bar-fill'),
        status: node.querySelector('.status'),
        key: '',
      };
      actors.set(u.uid, refs);
      return node;
    }

    function ultButton(u) {
      const btn = h('button', { className: 'ult', onClick: () => { if (game.battle) game.battle.castNow(u); } }, [
        h('img', { src: u.art, alt: u.name, onError: (e) => { e.target.replaceWith(h('span', { className: 'ult-glyph', text: u.icon })); } }),
        h('i', { className: 'fill' }),
        h('span', { className: 'ult-name', text: u.name }),
      ]);
      btn.dataset.uid = u.uid;
      return btn;
    }

    function paint() {
      actors.clear();
      enemyRow.innerHTML = '';
      allyRow.innerHTML = '';
      ultBar.innerHTML = '';
      const b = game.battle;
      if (!b) return;
      const f = b.faction;
      stageEl.style.setProperty('--tint', f?.tint ?? '#6a5cff');
      chapterLabel.textContent = f?.name ?? 'Combat';
      waveTag.textContent = b.stage % 5 === 0 ? `BOSS · Étape ${b.stage}` : `Étape ${b.stage}`;
      b.team('enemy').forEach((u) => enemyRow.append(actorNode(u)));
      b.team('ally').forEach((u) => allyRow.append(actorNode(u)));
      b.team('ally').forEach((u) => ultBar.append(ultButton(u)));
      sync();
    }

    function sync() {
      const b = game.battle;
      for (const r of actors.values()) {
        const { u } = r;
        if (!u?.maxHp) continue;
        const pct = Math.max(0, u.hp / u.maxHp);
        r.hp.style.width = `${pct * 100}%`;
        r.hp.classList.toggle('low', pct < 0.3);
        r.node.classList.toggle('dead', u.hp <= 0);
        r.node.classList.toggle('ready', u.side === 'ally' && u.alive && u.energy >= 100);
        r.node.classList.toggle('shielded', u.shield > 0);
        const key = (u.statuses ?? []).map((s) => s.id).join();
        if (key !== r.key) {
          r.key = key;
          r.status.innerHTML = '';
          for (const s of u.statuses ?? []) r.status.append(h('span', { className: `dot ${s.kind}`, title: s.name }));
        }
      }
      for (const btn of ultBar.children) {
        const r = actors.get(Number(btn.dataset.uid));
        if (!r) continue;
        const u = r.u;
        btn.classList.toggle('ready', u.alive && u.energy >= 100);
        btn.classList.toggle('off', !u.alive);
        btn.querySelector('.fill').style.height = `${Math.min(100, u.energy)}%`;
      }
      const left = b ? Math.max(0, b.duration - b.time) : 0;
      timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    }

    // ------------------------------------------------------- effets
    function center(node) {
      const c = fx.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2, w: r.width, h: r.height };
    }

    function burst(node, color, scale = 1) {
      if (!node?.isConnected) return;
      const p = center(node);
      const d = h('div', { className: 'vfx burst', style: {
        left: `${p.x}px`, top: `${p.y}px`, '--c': color, '--s': String(scale),
      } });
      fx.append(d);
      setTimeout(() => d.remove(), 520);
    }

    function slash(node, color) {
      if (!node?.isConnected) return;
      const p = center(node);
      const d = h('div', { className: 'vfx slash', style: { left: `${p.x}px`, top: `${p.y}px`, '--c': color } });
      fx.append(d);
      setTimeout(() => d.remove(), 420);
    }

    function particles(node, color, n = 8) {
      if (!node?.isConnected) return;
      const p = center(node);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random();
        const dist = 26 + Math.random() * 26;
        const d = h('div', { className: 'vfx spark', style: {
          left: `${p.x}px`, top: `${p.y}px`, '--c': color,
          '--dx': `${Math.cos(a) * dist}px`, '--dy': `${Math.sin(a) * dist}px`,
        } });
        fx.append(d);
        setTimeout(() => d.remove(), 600);
      }
    }

    function projectile(fromNode, toNode, color) {
      if (!fromNode?.isConnected || !toNode?.isConnected) return;
      const a = center(fromNode);
      const b = center(toNode);
      const d = h('div', { className: 'vfx bolt', style: { left: `${a.x}px`, top: `${a.y - 8}px`, '--c': color } });
      fx.append(d);
      requestAnimationFrame(() => {
        d.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y + 8}px)`;
      });
      setTimeout(() => { d.remove(); burst(toNode, color, 0.8); }, 240);
    }

    function hitShake(power = 1) {
      stageEl.classList.remove('shake');
      void stageEl.offsetWidth;
      stageEl.style.setProperty('--shake', String(power));
      stageEl.classList.add('shake');
      setTimeout(() => stageEl.classList.remove('shake'), 260);
    }

    let lastCut = 0;
    function cutIn(unit) {
      const now = performance.now();
      if (now - lastCut < 800) return;
      lastCut = now;
      const node = h('div', { className: 'cutin' }, [
        h('img', { className: 'cutin-art', src: unit.art, alt: '', onError: (e) => e.target.remove() }),
        h('div', { className: 'cutin-veil' }),
        h('div', { className: 'cutin-txt' }, [
          h('span', { className: 'cutin-who', text: unit.name }),
          h('b', { className: 'cutin-skill', text: unit.skill?.name ?? 'ULTIME' }),
        ]),
      ]);
      cutinBox.append(node);
      stageEl.style.setProperty('--flash', ELEMENTS[unit.element]?.color ?? '#fff');
      stageEl.classList.add('flash');
      setTimeout(() => stageEl.classList.remove('flash'), 420);
      setTimeout(() => node.remove(), 1000);
    }

    function animate(node, cls, ms = 400) {
      if (!node) return;
      node.classList.remove(cls);
      void node.offsetWidth;
      node.classList.add(cls);
      setTimeout(() => node.classList.remove(cls), ms);
    }

    function showResult(r) {
      overlay.innerHTML = '';
      if (!r) return;
      const win = r.result === 'win';
      const rw = r.rewards ?? { gold: 0, gems: 0, tickets: 0 };
      overlay.append(h('div', { className: `result ${win ? 'win' : 'lose'}` }, [
        h('div', { className: 'result-rays' }),
        h('div', { className: 'emoji', text: win ? '🏆' : r.result === 'timeout' ? '⌛' : '💀' }),
        h('h2', { text: win ? 'VICTOIRE' : r.result === 'timeout' ? 'TEMPS ÉCOULÉ' : 'DÉFAITE' }),
        h('p', { className: 'muted small', text: win ? `Étape ${r.stage} · ${fmtTime(r.duration)}` : 'Monte tes héros, puis retente' }),
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
      const r = actors.get(unit.uid);
      if (r) animate(r.node, 'attacking', 380);
    });
    hooks.on('damage', ({ source, target, amount, crit, affinity }) => {
      if (current !== 'battle') return;
      const r = actors.get(target.uid);
      if (!r) return;
      const color = ELEMENTS[source?.element]?.color ?? '#fff';
      const cls = crit ? 'crit' : affinity > 0 ? 'super' : affinity < 0 ? 'weak' : '';
      ui.float(fx, r.node.querySelector('.spr-wrap'), `-${fmt(amount)}`, cls);
      animate(r.node, 'hurt', 340);
      slash(r.node.querySelector('.spr-wrap'), color);
      particles(r.node.querySelector('.spr-wrap'), color, crit ? 10 : 5);
      if (crit) { burst(r.node.querySelector('.spr-wrap'), color, 1.25); hitShake(1.6); }
      else if (target.isBoss) hitShake(0.9);
      if (source && r.u.side !== source.side) projectile(actors.get(source.uid)?.node.querySelector('.spr-wrap'), r.node.querySelector('.spr-wrap'), color);
    });
    hooks.on('heal', ({ target, amount }) => {
      if (current !== 'battle') return;
      const r = actors.get(target.uid);
      if (!r) return;
      ui.float(fx, r.node.querySelector('.spr-wrap'), `+${fmt(amount)}`, 'heal');
      burst(r.node.querySelector('.spr-wrap'), '#6ee7a0', 1.1);
    });
    hooks.on('shield', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (r) { burst(r.node.querySelector('.spr-wrap'), '#7bd0ff', 1); ui.float(fx, r.node.querySelector('.spr-wrap'), 'BOUCLIER', 'shielded'); }
    });
    hooks.on('stun', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (r) ui.float(fx, r.node.querySelector('.spr-wrap'), 'ÉTOURDI', 'status');
    });
    hooks.on('death', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (r) { animate(r.node, 'dying', 700); burst(r.node.querySelector('.spr-wrap'), '#ff7a7a', 1.3); }
    });
    hooks.on('skill:cast', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (!r) return;
      animate(r.node, 'casting', 620);
      burst(r.node.querySelector('.spr-wrap'), ELEMENTS[unit.element]?.color ?? '#fff', 1.2);
      if (unit.side === 'ally') cutIn(unit);
    });
    hooks.on('battle:end', (r) => { if (current === 'battle') { showResult(r); sync(); } });

    const view = {
      id: 'battle', label: 'Combat', icon: '⚔️', el: screen,
      onShow() {
        if (game.pending) { paint(); showResult(game.pending); return; }
        if (!game.battle) game.startBattle();
        paint();
        if (game.pending) showResult(game.pending);
      },
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
    screens.set('lobby', buildLobby());
    screens.set('campaign', buildCampaign());
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
    const TAB_ORDER = ['lobby', 'campaign', 'heroes', 'summon', 'autel', 'mods'];
    const base = TAB_ORDER.map((id) => screens.get(id)).filter(Boolean)
      .map((v) => ({ id: v.id, label: v.label, icon: v.icon }));
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

    goTo('lobby');
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
