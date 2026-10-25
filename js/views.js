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
  const RANKS = [
    [0, 'Recrue'], [8, 'Écuyer'], [16, 'Chevalier'], [24, 'Chevalier d’élite'],
    [32, 'Champion'], [48, 'Maître'], [64, 'Légende'], [96, 'Mythe'],
  ];
  const rankOf = (best) => [...RANKS].reverse().find(([n]) => best >= n)?.[1] ?? 'Recrue';

  function buildLobby() {
    const art = h('img', { className: 'hub-art', alt: '' });
    const glow = h('div', { className: 'hub-glow' });
    const profile = h('div', { className: 'hub-profile' });
    const rail = h('div', { className: 'hub-rail' });
    const bottom = h('div', { className: 'hub-bottom' });

    const screen = h('section', { className: 'screen hub' }, [
      art, glow, h('div', { className: 'hub-vig' }), h('div', { className: 'hub-dust' }),
      profile, rail, bottom,
    ]);

    const chapterOf = (stage) => {
      const i = Math.floor((stage - 1) / 8) % Math.max(1, DB.factions.length);
      return DB.factions[i] ?? { name: 'Campagne', tint: '#6a5cff' };
    };

    function paint() {
      const team = game.state.team.map((id) => game.stats(id)).filter(Boolean)
        .sort((a, b) => b.power - a.power);
      const star = team[0];
      if (star) {
        art.src = star.art;
        art.onerror = () => { art.style.display = 'none'; };
        screen.style.setProperty('--r', RARITY[star.rarity]?.color ?? '#e9b95e');
      }

      // carte de profil (haut gauche)
      profile.innerHTML = '';
      const best = game.state.stats.best;
      profile.append(
        h('div', { className: 'pf-ava' }, star ? h('img', { src: star.art, alt: '', onError: (e) => e.target.remove() }) : null),
        h('div', { className: 'pf-id' }, [
          h('b', { text: (star?.name ?? 'Invité') }),
          h('span', { className: 'pf-rank', text: `${rankOf(best)} · Îlot ${Math.max(1, Math.floor(best / 8) + 1)}` }),
          h('div', { className: 'pf-xp' }, [h('i', { style: { width: `${((best % 8) / 8) * 100}%` } })]),
        ]),
      );

      // rail d'icônes (droite)
      rail.innerHTML = '';
      for (const a of [
        { icon: '🗺️', label: 'Campagne', go: 'campaign' },
        { icon: '🦸', label: 'Héros', go: 'heroes' },
        { icon: '🔮', label: 'Invocation', go: 'summon' },
        { icon: '🕯️', label: 'Autel', go: 'autel' },
        { icon: '🧩', label: 'Mods', go: 'mods' },
      ]) {
        rail.append(h('button', { className: 'rail-btn', onClick: () => goTo(a.go), title: a.label }, [
          h('span', { className: 'rb-ico', text: a.icon }),
          h('span', { className: 'rb-lbl', text: a.label }),
        ]));
      }

      // bas : nom du héros, chapitre, CTA, équipe
      const stage = game.state.stage;
      const ch = chapterOf(stage);
      const idx = ((stage - 1) % 8) + 1;
      bottom.innerHTML = '';
      bottom.style.setProperty('--tint', ch.tint ?? '#6a5cff');
      bottom.append(
        h('div', { className: 'hub-hero' }, [
          h('span', { className: 'hub-tag', text: RARITY[star?.rarity ?? 'rare']?.label ?? '' }),
          h('h2', { className: 'hub-name', text: star?.name ?? 'Ton équipe' }),
          h('p', { className: 'hub-title', text: star?.title ?? '' }),
        ]),
        h('div', { className: 'hub-chapter' }, [
          h('div', { className: 'hc-line' }, [
            h('span', { className: 'hc-k', text: `CHAPITRE ${Math.floor((stage - 1) / 8) + 1}` }),
            h('b', { text: ch.name }),
            h('span', { className: 'pill', text: `Étape ${stage}` }),
          ]),
          h('div', { className: 'bar chap' }, [h('i', { style: { width: `${(idx / 8) * 100}%` } })]),
        ]),
        h('button', {
          className: 'hub-cta',
          onClick: () => { game.startBattle(); goTo('battle'); },
        }, [
          h('span', { className: 'cta-ico', text: stage % 5 === 0 ? '☠️' : '⚔️' }),
          h('span', { className: 'cta-txt' }, [
            h('b', { text: stage % 5 === 0 ? 'BOSS' : 'COMBATTRE' }),
            h('span', { text: `Étape ${stage} · ${fmt(game.teamPower())} ⚡` }),
          ]),
          h('span', { className: 'cta-ar', text: '›' }),
        ]),
        h('div', { className: 'hub-team' }, team.map((t) => h('button', {
          className: `mini rar-${t.rarity}`,
          title: `${t.name} · Nv ${t.level}`,
          onClick: () => goTo('heroes'),
        }, [
          h('img', { src: t.art, alt: '', onError: (e) => e.target.remove() }),
          h('span', { text: t.level }),
        ]))),
        h('div', { className: 'hub-note', text: '0 € · 0 énergie · 0 attente' }),
      );
    }

    return { id: 'lobby', label: 'Accueil', icon: '🏰', el: screen, onShow: paint, update() {} };
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
  // Formation en perspective : alliés à gauche, ennemis à droite (x, y = pieds, échelle)
  const ALLY_SLOTS = [
    { x: 34, y: 71, s: 0.98 },
    { x: 34, y: 91, s: 1.08 },
    { x: 14, y: 57, s: 0.80 },
    { x: 14, y: 74, s: 0.88 },
    { x: 14, y: 92, s: 0.98 },
  ];
  const ENEMY_SLOTS = [
    { x: 66, y: 71, s: 0.98 },
    { x: 66, y: 91, s: 1.08 },
    { x: 86, y: 57, s: 0.80 },
    { x: 86, y: 74, s: 0.88 },
    { x: 86, y: 92, s: 0.98 },
  ];

  function buildBattle() {
    const actors = new Map();
    const field = h('div', { className: 'field' });
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
      h('div', { className: 'stage-floor' }),
      h('div', { className: 'stage-fog' }),
      h('div', { className: 'stage-vig' }),
      h('div', { className: 'hud' }, [
        h('button', { className: 'hud-btn', text: '‹', onClick: () => goTo('campaign') }),
        h('div', { className: 'hud-mid' }, [chapterLabel, waveTag]),
        h('div', { className: 'hud-right' }, [timer, speedBtn, autoBtn]),
      ]),
      field,
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
    function actorNode(u, slotIndex) {
      const slots = u.side === 'ally' ? ALLY_SLOTS : ENEMY_SLOTS;
      const slot = slots[slotIndex % slots.length];
      const scale = slot.s * (u.isBoss ? 1.22 : 1);

      const makeImg = (src, cls) => h('img', {
        className: `spr ${cls}`, src, alt: u.name, draggable: false,
        onError: (ev) => ev.target.remove(),
      });

      const idle = makeImg(`assets/sprites/${u.id}.webp`, 'p-idle');
      const atk = makeImg(`assets/sprites/${u.id}_atk.webp`, 'p-atk');

      idle.addEventListener('error', () => {
        // pas de sprite : médaillon du portrait, sinon emoji
        const wrap = idle.parentElement.parentElement;
        wrap.classList.add('no-spr');
        if (u.art) {
          wrap.prepend(h('div', { className: 'bust' }, [
            h('img', { src: u.art, alt: u.name, onError: (e2) => { e2.target.remove(); wrap.classList.add('no-img'); } }),
            h('span', { className: 'bust-glyph', text: u.icon }),
          ]));
        } else {
          wrap.prepend(h('span', { className: 'token', text: u.icon }));
        }
      });

      const hpFill = h('i', { className: 'bar-fill' });
      const status = h('div', { className: 'status' });

      const body = h('div', { className: 'actor-body' }, [
        h('div', { className: 'head-ui' }, [
          h('div', { className: 'nm', text: u.isBoss ? u.name.replace(' — ÉLITE', '') : u.name }),
          h('div', { className: 'bar hp' }, [hpFill]),
          status,
        ]),
        h('div', { className: 'spr-wrap' }, [
          h('div', { className: 'ground' }),
          h('div', { className: 'flipper' }, [idle, atk]),
          h('div', { className: 'aura' }),
          h('div', { className: 'flash' }),
          h('span', { className: 'crown', text: '👑' }),
        ]),
      ]);

      const node = h('div', {
        className: `actor ${u.side} ${u.isBoss ? 'boss' : ''} rar-${u.rarity ?? 'rare'}`,
      }, [body]);

      node.style.setProperty('--x', `${slot.x}%`);
      node.style.setProperty('--y', `${slot.y}%`);
      node.style.setProperty('--s', String(scale));
      node.style.setProperty('--dir', u.side === 'ally' ? '1' : '-1');
      node.style.setProperty('--el', ELEMENTS[u.element]?.color ?? '#fff');
      node.style.zIndex = String(100 + Math.round(slot.y));
      node.querySelector('.crown').style.display = u.isBoss ? '' : 'none';

      // la pose d'attaque n'existe pas pour tout le monde : on ne masque
      // la pose de repos que si elle est réellement disponible
      atk.addEventListener('load', () => node.classList.add('has-atk'), { once: true });

      const refs = { u, node, body, idle, atk, hp: hpFill, status, key: '' };
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
      field.innerHTML = '';
      ultBar.innerHTML = '';
      const b = game.battle;
      if (!b) return;
      const f = b.faction;
      stageEl.style.setProperty('--tint', f?.tint ?? '#6a5cff');
      chapterLabel.textContent = f?.name ?? 'Combat';
      waveTag.textContent = b.stage % 5 === 0 ? `BOSS · Étape ${b.stage}` : `Étape ${b.stage}`;
      b.team('enemy').forEach((u, i) => field.append(actorNode(u, i)));
      b.team('ally').forEach((u, i) => field.append(actorNode(u, i)));
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
    function at(node) {
      const c = fx.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height * 0.45, w: r.width, h: r.height };
    }
    const push = (el, ms) => { fx.append(el); setTimeout(() => el.remove(), ms); };

    function slash(node, color, dir = 1) {
      if (!node?.isConnected) return;
      const p = at(node);
      const size = Math.max(90, p.w * 1.5);
      const el = h('div', {
        className: 'vfx slash2',
        style: { left: `${p.x}px`, top: `${p.y}px`, width: `${size}px`, height: `${size}px`, '--c': color, '--d': String(dir) },
        html: `<svg viewBox="0 0 100 100" aria-hidden="true">
          <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".95"/>
            <stop offset="45%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="M12,78 C34,10 74,6 92,26" fill="none" stroke="url(#sg)" stroke-width="9" stroke-linecap="round"/>
          <path d="M16,86 C40,26 70,18 90,34" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
        </svg>`,
      });
      push(el, 460);
    }

    function impact(node, color, power = 1) {
      if (!node?.isConnected) return;
      const p = at(node);
      const size = 80 * power;
      const el = h('div', {
        className: 'vfx impact',
        style: { left: `${p.x}px`, top: `${p.y}px`, width: `${size}px`, height: `${size}px`, '--c': color },
        html: `<svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="26" fill="none" stroke="${color}" stroke-width="3" opacity=".9"/>
          <circle cx="50" cy="50" r="12" fill="#fff" opacity=".95"/>
          <g stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".95">
            <line x1="50" y1="6" x2="50" y2="26"/><line x1="50" y1="74" x2="50" y2="94"/>
            <line x1="6" y1="50" x2="26" y2="50"/><line x1="74" y1="50" x2="94" y2="50"/>
            <line x1="19" y1="19" x2="33" y2="33"/><line x1="67" y1="67" x2="81" y2="81"/>
            <line x1="81" y1="19" x2="67" y2="33"/><line x1="33" y1="67" x2="19" y2="81"/>
          </g>
        </svg>`,
      });
      push(el, 520);
    }

    function dust(node, dir = 1) {
      if (!node?.isConnected) return;
      const p = at(node);
      for (let i = 0; i < 4; i++) {
        const el = h('div', {
          className: 'vfx puff',
          style: {
            left: `${p.x + (Math.random() * 24 - 12)}px`,
            top: `${p.y + p.h * 0.42}px`,
            '--dx': `${(-dir * (16 + Math.random() * 26))}px`,
            '--dy': `${-6 - Math.random() * 10}px`,
            '--sz': `${10 + Math.random() * 12}px`,
          },
        });
        push(el, 620);
      }
    }

    function projectile(fromNode, toNode, color) {
      if (!fromNode?.isConnected || !toNode?.isConnected) return;
      const a = at(fromNode), b = at(toNode);
      const el = h('div', { className: 'vfx bolt', style: { left: `${a.x}px`, top: `${a.y}px`, '--c': color } });
      fx.append(el);
      requestAnimationFrame(() => { el.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px)`; });
      setTimeout(() => { el.remove(); impact(toNode, color, 0.8); }, 230);
    }

    function burst(node, color, scale = 1) { impact(node, color, scale); }

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

    function pose(node, cls, ms) {
      if (!node) return;
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
      if (!r) return;
      pose(r.node, 'attacking', 420);
      dust(r.node.querySelector('.spr-wrap'), unit.side === 'ally' ? 1 : -1);
    });

    hooks.on('damage', ({ source, target, amount, crit, affinity }) => {
      if (current !== 'battle') return;
      const r = actors.get(target.uid);
      if (!r) return;
      const sr = source ? actors.get(source.uid) : null;
      const color = ELEMENTS[source?.element]?.color ?? '#fff';
      const cls = crit ? 'crit' : affinity > 0 ? 'super' : affinity < 0 ? 'weak' : '';
      const spot = r.node.querySelector('.spr-wrap');
      ui.float(fx, spot, `-${fmt(amount)}`, cls);
      pose(r.node, 'hurt', 340);
      if (source) {
        const dist = Math.abs((sr?.node.getBoundingClientRect().left ?? 0) - r.node.getBoundingClientRect().left);
        if (dist > 90) projectile(sr?.node.querySelector('.spr-wrap') ?? spot, spot, color);
        else { slash(spot, color, source.side === 'ally' ? 1 : -1); impact(spot, color, crit ? 1.4 : 1); }
      } else {
        impact(spot, color, 1);
      }
      if (crit) hitShake(1.6);
      else if (target.isBoss) hitShake(0.9);
    });

    hooks.on('heal', ({ target, amount }) => {
      if (current !== 'battle') return;
      const r = actors.get(target.uid);
      if (!r) return;
      const spot = r.node.querySelector('.spr-wrap');
      ui.float(fx, spot, `+${fmt(amount)}`, 'heal');
      impact(spot, '#6ee7a0', 0.9);
    });

    hooks.on('shield', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (!r) return;
      const spot = r.node.querySelector('.spr-wrap');
      impact(spot, '#7bd0ff', 1);
      ui.float(fx, spot, 'BOUCLIER', 'shielded');
    });

    hooks.on('stun', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (r) ui.float(fx, r.node.querySelector('.spr-wrap'), 'ÉTOURDI', 'status');
    });

    hooks.on('death', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (!r) return;
      pose(r.node, 'dying', 760);
      impact(r.node.querySelector('.spr-wrap'), '#ff7a7a', 1.3);
      dust(r.node.querySelector('.spr-wrap'), unit.side === 'ally' ? 1 : -1);
    });

    hooks.on('skill:cast', ({ unit }) => {
      if (current !== 'battle') return;
      const r = actors.get(unit?.uid);
      if (!r) return;
      pose(r.node, 'casting', 640);
      impact(r.node.querySelector('.spr-wrap'), ELEMENTS[unit.element]?.color ?? '#fff', 1.2);
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
