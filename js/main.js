// ============================================================================
// Point d'Entrée Principal — Chroniques d'Astria : Citadelle Céleste
// Boucle 60fps, Compteurs de Devises Animés, Barre du Haut, Dock & Audio.
// ============================================================================

import { SoundEngine } from './audio.js';
import { CITADEL_BUILDINGS, HERO_CATALOG } from './data.js';
import { CitadelState, formatNum } from './state.js';
import { CitadelCanvas } from './citadel-canvas.js';
import { ModalController } from './modals.js';

/** Interpolation fluide des nombres affichés dans le HUD */
class RollingCounter {
  constructor(el, pillEl, initialValue = 0) {
    this.el = el;
    this.pillEl = pillEl;
    this.current = initialValue;
    this.target = initialValue;
    this._lastText = '';
    this._renderNow(initialValue);
  }

  setTarget(val) {
    const next = Number(val) || 0;
    if (next > this.target + 25 && this.pillEl) {
      this.pillEl.classList.remove('bump');
      void this.pillEl.offsetWidth;
      this.pillEl.classList.add('bump');
    }
    this.target = next;
  }

  update(dt) {
    const diff = this.target - this.current;
    if (Math.abs(diff) < 0.45) {
      this.current = this.target;
    } else {
      this.current += diff * (1 - Math.exp(-9.5 * dt));
    }
    this._renderNow(Math.round(this.current));
  }

  _renderNow(intVal) {
    const txt = formatNum(intVal);
    if (txt !== this._lastText && this.el) {
      this._lastText = txt;
      this.el.textContent = txt;
    }
  }
}

function showToast(message, kind = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast-item toast-${kind}`;
  item.textContent = message;
  stack.appendChild(item);

  setTimeout(() => {
    item.classList.add('leaving');
    setTimeout(() => item.remove(), 280);
  }, 2900);
}

function bootstrap() {
  const state = new CitadelState();
  const sound = new SoundEngine();
  sound.setEnabled(state.data.settings.audioEnabled);
  sound.setVolume(state.data.settings.volume);

  const canvasEl = document.getElementById('citadel-canvas');
  const labelsEl = document.getElementById('building-labels');
  const fpsEl = document.getElementById('fps-readout');

  let citadelCanvas = null;

  const modals = new ModalController({
    state,
    sound,
    onToast: showToast,
    onModalChange: (buildingId) => {
      citadelCanvas?.setModalFocus(buildingId);
      syncQuickDockActive(buildingId);
    },
  });

  citadelCanvas = new CitadelCanvas({
    canvas: canvasEl,
    labelsContainer: labelsEl,
    state,
    sound,
    onSelectBuilding: (buildingId) => {
      sound.playClick();
      modals.open(buildingId);
    },
    onFpsUpdate: (fps) => {
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
    },
  });

  // -------------------- Compteurs Dynamiques Animés (Barre du Haut) --------------------

  const goldRoller = new RollingCounter(
    document.getElementById('val-gold'),
    document.getElementById('pill-gold'),
    state.data.currencies.gold,
  );
  const crystalsRoller = new RollingCounter(
    document.getElementById('val-crystals'),
    document.getElementById('pill-crystals'),
    state.data.currencies.crystals,
  );
  const honorRoller = new RollingCounter(
    document.getElementById('val-honor'),
    document.getElementById('pill-honor'),
    state.data.currencies.honor,
  );
  const cpRoller = new RollingCounter(
    document.getElementById('player-cp'),
    document.getElementById('profile-card-btn'),
    state.getTotalTeamCp(),
  );

  const avatarImg = document.getElementById('player-avatar');
  const levelEl = document.getElementById('player-level');
  const nameEl = document.getElementById('player-name');
  const titleEl = document.getElementById('player-title');
  const xpFillEl = document.getElementById('player-xp-fill');
  const goldRateEl = document.getElementById('gold-rate');
  const audioIconEl = document.getElementById('audio-icon');
  const botPulseEl = document.getElementById('bot-pulse-dot');
  const botBadgeEl = document.getElementById('bot-status-badge');
  const botLineEl = document.getElementById('bot-live-line');

  function syncHudFromState() {
    const d = state.data;
    goldRoller.setTarget(d.currencies.gold);
    crystalsRoller.setTarget(d.currencies.crystals);
    honorRoller.setTarget(d.currencies.honor);
    cpRoller.setTarget(state.getTotalTeamCp());

    const avatarHero = HERO_CATALOG.find((h) => h.id === d.player.avatarId) || HERO_CATALOG[0];
    if (avatarImg && avatarImg.getAttribute('src') !== avatarHero.art) {
      avatarImg.src = avatarHero.art;
    }
    if (levelEl) levelEl.textContent = `Niv. ${d.player.level}`;
    if (nameEl) nameEl.textContent = d.player.name;
    if (titleEl) titleEl.textContent = d.player.title.split(' ')[0];
    if (xpFillEl) xpFillEl.style.width = `${Math.min(100, d.player.xp)}%`;
    if (goldRateEl) goldRateEl.textContent = `+${formatNum(state.getGoldPerSecond())}/s`;
    if (audioIconEl) audioIconEl.textContent = d.settings.audioEnabled ? '🔊' : '🔇';
    if (fpsEl) fpsEl.style.display = d.settings.showFps ? '' : 'none';

    if (botPulseEl) botPulseEl.classList.toggle('paused', !d.autobot.active);
    if (botBadgeEl) {
      botBadgeEl.textContent = d.autobot.active
        ? `AUTO-BOT ×${d.autobot.speed} ACTIF · ∞ SANS ÉNERGIE`
        : 'AUTO-BOT EN VEILLE · ∞ SANS ÉNERGIE';
    }
    if (botLineEl && state.botLogs[0]) {
      botLineEl.textContent = state.botLogs[0];
    }

    citadelCanvas.updateBuildingDynamicBadges();
  }

  state.subscribe(() => syncHudFromState());
  syncHudFromState();

  // -------------------- Construction du Dock d'Accès Rapide --------------------

  const quickDock = document.getElementById('quick-dock');
  CITADEL_BUILDINGS.forEach((b, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-btn';
    btn.dataset.dockId = b.id;
    btn.style.setProperty('--dock-accent', b.accent);
    btn.innerHTML = `
      <span class="dock-ico">${b.icon}</span>
      <span class="dock-lbl">${b.name}</span>
      <kbd class="dock-key">${b.shortcut}</kbd>
    `;

    btn.addEventListener('pointerenter', () => {
      citadelCanvas.hoveredId = b.id;
      sound.playHover(idx);
    });
    btn.addEventListener('pointerleave', () => {
      if (citadelCanvas.hoveredId === b.id) citadelCanvas.hoveredId = null;
    });
    btn.addEventListener('click', () => {
      sound.playClick();
      const pt = citadelCanvas.worldToScreen(b.center.u, b.center.v);
      citadelCanvas.spawnRipple(pt.x, pt.y, b.accent);
      modals.open(b.id);
    });
    quickDock.appendChild(btn);
  });

  function syncQuickDockActive(activeId) {
    quickDock.querySelectorAll('.dock-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.dockId === activeId);
    });
  }

  // -------------------- Liaisons des Boutons de la Barre du Haut --------------------

  document.querySelectorAll('[data-open-building]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.playClick();
      modals.open(btn.dataset.openBuilding);
    });
  });

  document.getElementById('profile-card-btn')?.addEventListener('click', () => {
    sound.playClick();
    modals.open('console', 2); // Ouvre directement l'onglet Profil du Seigneur
  });

  document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
    const next = !state.data.settings.audioEnabled;
    state.data.settings.audioEnabled = next;
    sound.setEnabled(next);
    if (next) sound.playClick();
    state.save();
    syncHudFromState();
    showToast(next ? '🔊 Audio Web Audio API activé' : '🔇 Effets sonores coupés', 'info');
  });

  // Raccourcis Clavier (1..6 pour ouvrir les bâtiments, M pour l'audio)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.key.toLowerCase() === 'm') {
      document.getElementById('btn-audio-toggle')?.click();
      return;
    }
    const found = CITADEL_BUILDINGS.find((b) => b.shortcut === e.key);
    if (found) {
      sound.playClick();
      modals.open(found.id);
    }
  });

  // -------------------- Boucle Principale 60fps --------------------

  let prevTime = performance.now();
  function animationLoop(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - prevTime) / 1000));
    prevTime = now;

    state.tick(dt);
    goldRoller.update(dt);
    crystalsRoller.update(dt);
    honorRoller.update(dt);
    cpRoller.update(dt);

    citadelCanvas.update(dt);
    citadelCanvas.render();

    requestAnimationFrame(animationLoop);
  }
  requestAnimationFrame(animationLoop);

  // Masquage élégant du rideau de démarrage
  const bootEl = document.getElementById('boot-screen');
  setTimeout(() => {
    bootEl?.classList.add('fade-out');
    setTimeout(() => bootEl?.remove(), 550);
  }, 420);
}

bootstrap();
