// ============================================================================
// Moteur Graphique HTML5 Canvas 60fps — Citadelle Céleste d'Astria
// Rendu panoramique avec parallaxe, rayons lumineux atmosphériques, shaders
// runiques par bâtiment, système de particules additif et survols animés.
// ============================================================================

import { CITADEL_BUILDINGS } from './data.js';

function createGlowSprite(innerColor, midColor, outerRgba = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const gctx = c.getContext('2d');
  const grad = gctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.32, midColor);
  grad.addColorStop(1, outerRgba);
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 64, 64);
  return c;
}

function pointInPolygon(u, v, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = (yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export class CitadelCanvas {
  constructor({ canvas, labelsContainer, state, sound, onSelectBuilding, onFpsUpdate }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.labelsContainer = labelsContainer;
    this.state = state;
    this.sound = sound;
    this.onSelectBuilding = onSelectBuilding;
    this.onFpsUpdate = onFpsUpdate;

    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    // Image panoramique haute résolution de la Citadelle
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.imgW = 1672;
    this.imgH = 941;
    this.bgImage.onload = () => {
      this.imgW = this.bgImage.naturalWidth || 1672;
      this.imgH = this.bgImage.naturalHeight || 941;
      this.bgLoaded = true;
    };
    this.bgImage.src = 'assets/bg/citadel.jpg';

    // Sprites de lueur pré-calculés (zéro allocation GC par frame)
    this.sprites = {
      gold: createGlowSprite('#FFFDF0', 'rgba(255, 215, 0, 0.72)'),
      cyan: createGlowSprite('#E8FFFF', 'rgba(0, 229, 255, 0.72)'),
      amber: createGlowSprite('#FFF4D2', 'rgba(255, 145, 40, 0.72)'),
      violet: createGlowSprite('#F8E8FF', 'rgba(192, 132, 252, 0.68)'),
    };

    // Caméra & Parallaxe
    this.pointer = { x: this.vw * 0.5, y: this.vh * 0.5, nx: 0, ny: 0, active: false };
    this.cam = { panX: 0, panY: 0, dragOffsetX: 0, zoom: 1.045, targetZoom: 1.045 };
    this.drag = { down: false, moved: false, startX: 0, startDragOffset: 0 };

    // États d'animation des 6 bâtiments
    this.hoveredId = null;
    this.activeModalId = null;
    this.hoverMix = new Map(CITADEL_BUILDINGS.map((b) => [b.id, 0]));
    this.labelNodes = new Map();

    // Systèmes VFX : Rayons Célestes, Particules de Mana, Étincelles & Ondes de clic
    this.time = 0;
    this.ambientParticles = [];
    this.localizedSparks = [];
    this.cursorTrail = [];
    this.ripples = [];
    this.godRays = this._createGodRays();

    // Mesure FPS
    this._fpsFrames = 0;
    this._fpsClock = 0;

    this._buildFloatingLabels();
    this._seedAmbientParticles();
    this._bindEvents();
    this.resize();
  }

  _createGodRays() {
    return [
      { u: 0.16, angle: 0.24, width: 0.085, speed: 0.35, phase: 0.2, color: 'rgba(120, 210, 255, 0.075)' },
      { u: 0.31, angle: 0.20, width: 0.095, speed: 0.42, phase: 1.5, color: 'rgba(0, 229, 255, 0.09)' },
      { u: 0.52, angle: 0.14, width: 0.135, speed: 0.28, phase: 2.8, color: 'rgba(255, 215, 0, 0.10)' },
      { u: 0.68, angle: -0.14, width: 0.085, speed: 0.38, phase: 4.1, color: 'rgba(90, 195, 255, 0.075)' },
      { u: 0.84, angle: -0.20, width: 0.105, speed: 0.31, phase: 5.3, color: 'rgba(255, 215, 0, 0.07)' },
    ];
  }

  _targetParticleCount() {
    const density = this.state.data.settings.particleDensity;
    if (density === 'low') return 55;
    if (density === 'ultra') return 190;
    return 120;
  }

  _seedAmbientParticles() {
    const count = this._targetParticleCount();
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this._makeAmbientParticle(true));
    }
  }

  _makeAmbientParticle(randomY = false) {
    const paletteRoll = Math.random();
    const sprite = paletteRoll < 0.46 ? 'cyan' : paletteRoll < 0.86 ? 'gold' : 'violet';
    return {
      u: Math.random(),
      v: randomY ? Math.random() : 0.98 + Math.random() * 0.08,
      vy: -(0.008 + Math.random() * 0.022),
      vx: (Math.random() - 0.5) * 0.009,
      size: 4 + Math.random() * 13,
      alpha: 0.22 + Math.random() * 0.62,
      swayAmp: 0.003 + Math.random() * 0.008,
      swayFreq: 0.8 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      sprite,
    };
  }

  _buildFloatingLabels() {
    this.labelsContainer.innerHTML = '';
    CITADEL_BUILDINGS.forEach((b, idx) => {
      const anchor = document.createElement('div');
      anchor.className = 'building-tag-anchor';

      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'building-tag';
      tag.dataset.buildingId = b.id;
      tag.style.setProperty('--tag-accent', b.accent);

      tag.innerHTML = `
        <span class="tag-aura" aria-hidden="true"></span>
        <span class="tag-icon">${b.icon}</span>
        <span class="tag-body">
          <strong class="tag-title">${b.name}</strong>
          <small class="tag-sub" data-role="sub">${b.subtitle}</small>
        </span>
        <span class="tag-pip" data-role="pip"></span>
        <span class="tag-pointer" aria-hidden="true"></span>
      `;

      tag.addEventListener('pointerenter', () => {
        if (this.hoveredId !== b.id) {
          this.hoveredId = b.id;
          this.sound.playHover(idx);
        }
      });
      tag.addEventListener('pointerleave', () => {
        if (this.hoveredId === b.id) this.hoveredId = null;
      });
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const pt = this.worldToScreen(b.center.u, b.center.v);
        this.spawnRipple(pt.x, pt.y, b.accent);
        this.onSelectBuilding?.(b.id);
      });

      anchor.appendChild(tag);
      this.labelsContainer.appendChild(anchor);
      this.labelNodes.set(b.id, {
        anchorEl: anchor,
        el: tag,
        subEl: tag.querySelector('[data-role="sub"]'),
        pipEl: tag.querySelector('[data-role="pip"]'),
      });
    });
  }

  updateBuildingDynamicBadges() {
    const d = this.state.data;
    const statusByBuilding = {
      temple: d.pity.freeDailyReady
        ? '1 Invocation Gratuite !'
        : `Pity 5★ : ${d.pity.legendaryCount}/${d.pity.legendaryMax}`,
      barracks: `${d.squad.length}/5 Escouade · ${Object.values(d.heroes).filter((h) => h.owned).length} Héros`,
      forge: `${d.inventory.length} Reliques · Jusqu’à +15`,
      portal: `Étape ${d.campaign.stage} · Tour Étage ${d.campaign.towerFloor}`,
      coliseum: `${this.state.getColiseumRank()} · ${d.coliseum.points} pts`,
      console: d.autobot.active ? `Auto-Bot ×${d.autobot.speed} Actif ∞` : 'Auto-Bot en Pause',
    };
    const pipAlert = {
      temple: d.pity.freeDailyReady || d.currencies.crystals >= 100,
      barracks: d.currencies.gold >= 2500,
      forge: d.currencies.gold >= 4500,
      portal: true,
      coliseum: d.currencies.honor >= 120,
      console: d.autobot.active,
    };

    for (const b of CITADEL_BUILDINGS) {
      const ref = this.labelNodes.get(b.id);
      if (!ref) continue;
      if (statusByBuilding[b.id]) ref.subEl.textContent = statusByBuilding[b.id];
      ref.pipEl.classList.toggle('on', Boolean(pipAlert[b.id]));
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => {
      this.drag.down = true;
      this.drag.moved = false;
      this.drag.startX = e.clientX;
      this.drag.startDragOffset = this.cam.dragOffsetX;
    });

    window.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.nx = (e.clientX / Math.max(1, this.vw)) * 2 - 1;
      this.pointer.ny = (e.clientY / Math.max(1, this.vh)) * 2 - 1;
      this.pointer.active = true;

      if (this.drag.down) {
        const dx = e.clientX - this.drag.startX;
        if (Math.abs(dx) > 6) this.drag.moved = true;
        const maxPan = this._getMaxPanX();
        this.cam.dragOffsetX = Math.max(-maxPan, Math.min(maxPan, this.drag.startDragOffset + dx));
      }

      // Sillage subtil de poussière d'étoile sous le curseur
      if (!this.activeModalId && Math.random() < 0.45) {
        this.cursorTrail.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 18,
          vy: -12 - Math.random() * 20,
          life: 0.55,
          maxLife: 0.55,
          size: 5 + Math.random() * 7,
          sprite: this.hoveredId ? 'gold' : 'cyan',
        });
      }

      if (e.target === this.canvas && !this.activeModalId) {
        this._checkCanvasHover(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', (e) => {
      const wasMoved = this.drag.moved;
      this.drag.down = false;
      this.drag.moved = false;

      if (!wasMoved && e.target === this.canvas && !this.activeModalId) {
        const hit = this._hitTestScreen(e.clientX, e.clientY);
        if (hit) {
          this.spawnRipple(e.clientX, e.clientY, hit.accent);
          this.onSelectBuilding?.(hit.id);
        } else {
          this.spawnRipple(e.clientX, e.clientY, '#00E5FF', 0.55);
        }
      }
    });
  }

  resize() {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
    this.canvas.style.width = `${this.vw}px`;
    this.canvas.style.height = `${this.vh}px`;

    const maxPan = this._getMaxPanX();
    this.cam.dragOffsetX = Math.max(-maxPan, Math.min(maxPan, this.cam.dragOffsetX));
  }

  setModalFocus(buildingId) {
    this.activeModalId = buildingId;
    this.cam.targetZoom = buildingId ? 1.075 : 1.045;
    if (buildingId) {
      const b = CITADEL_BUILDINGS.find((item) => item.id === buildingId);
      if (b) {
        const maxPan = this._getMaxPanX();
        const desiredOffset = (0.5 - b.center.u) * this.vw * 0.55;
        this.cam.dragOffsetX = Math.max(-maxPan, Math.min(maxPan, desiredOffset));
      }
    }
  }

  _getRenderTransform() {
    const baseScale = Math.max(this.vw / this.imgW, this.vh / this.imgH) * this.cam.zoom;
    const drawW = this.imgW * baseScale;
    const drawH = this.imgH * baseScale;
    const drawX = (this.vw - drawW) * 0.5 + this.cam.panX + this.cam.dragOffsetX;
    const drawY = (this.vh - drawH) * 0.5 + this.cam.panY;
    return { drawX, drawY, drawW, drawH, scale: baseScale };
  }

  _getMaxPanX() {
    const baseScale = Math.max(this.vw / this.imgW, this.vh / this.imgH) * this.cam.zoom;
    const drawW = this.imgW * baseScale;
    return Math.max(0, (drawW - this.vw) * 0.48);
  }

  worldToScreen(u, v) {
    const t = this._getRenderTransform();
    return {
      x: t.drawX + u * t.drawW,
      y: t.drawY + v * t.drawH,
      drawW: t.drawW,
      drawH: t.drawH,
    };
  }

  screenToWorld(x, y) {
    const t = this._getRenderTransform();
    return {
      u: (x - t.drawX) / Math.max(1, t.drawW),
      v: (y - t.drawY) / Math.max(1, t.drawH),
    };
  }

  _hitTestScreen(sx, sy) {
    // Ignore uniquement la barre supérieure (aucune barre inférieure !)
    if (sy < 78) return null;
    const { u, v } = this.screenToWorld(sx, sy);
    for (let i = CITADEL_BUILDINGS.length - 1; i >= 0; i--) {
      const b = CITADEL_BUILDINGS[i];
      if (pointInPolygon(u, v, b.polygon)) return b;
      const dx = (u - b.center.u) / b.radius.rx;
      const dy = (v - b.center.v) / b.radius.ry;
      if (dx * dx + dy * dy <= 0.76) return b;
    }
    return null;
  }

  _checkCanvasHover(sx, sy) {
    const hit = this._hitTestScreen(sx, sy);
    const nextId = hit ? hit.id : null;
    if (nextId !== this.hoveredId) {
      this.hoveredId = nextId;
      this.canvas.style.cursor = nextId ? 'pointer' : this._getMaxPanX() > 40 ? 'grab' : 'default';
      if (hit) {
        const idx = CITADEL_BUILDINGS.indexOf(hit);
        this.sound.playHover(idx);
      }
    }
  }

  spawnRipple(x, y, color = '#FFD700', intensity = 1) {
    this.ripples.push({
      x,
      y,
      r: 8,
      maxR: 130 * intensity,
      alpha: 0.92,
      color,
    });
    for (let i = 0; i < Math.round(14 * intensity); i++) {
      const ang = (Math.PI * 2 * i) / Math.round(14 * intensity) + Math.random() * 0.3;
      const spd = 45 + Math.random() * 115;
      this.cursorTrail.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.65,
        maxLife: 0.65,
        size: 7 + Math.random() * 10,
        sprite: color === '#00E5FF' ? 'cyan' : 'gold',
      });
    }
  }

  // -------------------- Mise à jour Physique 60fps --------------------

  update(dt) {
    this.time += dt;

    // Compteur FPS
    this._fpsFrames += 1;
    this._fpsClock += dt;
    if (this._fpsClock >= 0.5) {
      const fps = Math.min(60, Math.round(this._fpsFrames / this._fpsClock));
      this._fpsFrames = 0;
      this._fpsClock = 0;
      this.onFpsUpdate?.(fps);
    }

    // Adaptation dynamique du nombre de particules selon les paramètres
    const wanted = this._targetParticleCount();
    while (this.ambientParticles.length < wanted) {
      this.ambientParticles.push(this._makeAmbientParticle(true));
    }
    if (this.ambientParticles.length > wanted) {
      this.ambientParticles.length = wanted;
    }

    // Parallaxe fluide de la caméra
    const parallaxOn = this.state.data.settings.parallax && !this.activeModalId;
    const targetX = parallaxOn ? -this.pointer.nx * 24 : 0;
    const targetY = parallaxOn ? -this.pointer.ny * 13 : 0;
    const ease = 1 - Math.exp(-5.5 * dt);
    this.cam.panX += (targetX - this.cam.panX) * ease;
    this.cam.panY += (targetY - this.cam.panY) * ease;
    this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * ease;

    // Interpolation fluide du survol par bâtiment (hoverMix 0..1)
    for (const b of CITADEL_BUILDINGS) {
      const isHovered = this.hoveredId === b.id || this.activeModalId === b.id;
      const cur = this.hoverMix.get(b.id) || 0;
      const target = isHovered ? 1 : 0;
      const next = cur + (target - cur) * (1 - Math.exp(-11 * dt));
      this.hoverMix.set(b.id, Math.abs(next - target) < 0.002 ? target : next);

      // Émission enrichie de particules d'aura magique sur le bâtiment survolé
      if (isHovered && Math.random() < 0.88) {
        const spriteById = {
          temple: Math.random() < 0.55 ? 'gold' : 'cyan',
          portal: 'cyan',
          forge: Math.random() < 0.7 ? 'amber' : 'gold',
          coliseum: Math.random() < 0.5 ? 'violet' : 'gold',
          barracks: Math.random() < 0.5 ? 'cyan' : 'gold',
          console: 'cyan',
        };
        const ang = Math.random() * Math.PI * 2;
        const rad = 0.25 + Math.random() * 0.75;
        this.localizedSparks.push({
          u: b.center.u + Math.cos(ang) * b.radius.rx * rad,
          v: b.center.v + Math.sin(ang) * b.radius.ry * rad * 0.65,
          vu: (Math.random() - 0.5) * 0.018,
          vv: -(0.032 + Math.random() * 0.052),
          life: 0.95 + Math.random() * 0.55,
          maxLife: 1.45,
          size: 8 + Math.random() * 13,
          sprite: spriteById[b.id] || 'gold',
        });
      }
    }

    // Braises continues de la Forge & brume de cascade de mana
    if (Math.random() < 0.55) {
      const furnaces = [
        [0.092, 0.665],
        [0.155, 0.692],
        [0.198, 0.658],
      ];
      const f = furnaces[Math.floor(Math.random() * furnaces.length)];
      this.localizedSparks.push({
        u: f[0] + (Math.random() - 0.5) * 0.024,
        v: f[1],
        vu: (Math.random() - 0.35) * 0.014,
        vv: -(0.025 + Math.random() * 0.04),
        life: 1.1,
        maxLife: 1.1,
        size: 5 + Math.random() * 8,
        sprite: 'amber',
      });
    }

    if (Math.random() < 0.5) {
      // Cascades de mana cyan
      this.localizedSparks.push({
        u: 0.394 + (Math.random() - 0.5) * 0.022,
        v: 0.58 + Math.random() * 0.14,
        vu: (Math.random() - 0.5) * 0.008,
        vv: 0.018 + Math.random() * 0.022,
        life: 0.95,
        maxLife: 0.95,
        size: 6 + Math.random() * 9,
        sprite: 'cyan',
      });
    }

    // Déplacement des particules ambiantes
    for (const p of this.ambientParticles) {
      p.v += p.vy * dt;
      p.u += p.vx * dt + Math.sin(this.time * p.swayFreq + p.phase) * p.swayAmp * dt;
      if (p.v < -0.04 || p.u < -0.05 || p.u > 1.05) {
        Object.assign(p, this._makeAmbientParticle(false));
      }
    }

    // Étincelles localisées
    for (let i = this.localizedSparks.length - 1; i >= 0; i--) {
      const s = this.localizedSparks[i];
      s.u += s.vu * dt;
      s.v += s.vv * dt;
      s.life -= dt;
      if (s.life <= 0) this.localizedSparks.splice(i, 1);
    }

    // Sillage du curseur
    for (let i = this.cursorTrail.length - 1; i >= 0; i--) {
      const c = this.cursorTrail[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= dt;
      if (c.life <= 0) this.cursorTrail.splice(i, 1);
    }

    // Ondes de clic
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += (r.maxR - r.r) * (1 - Math.exp(-8 * dt));
      r.alpha -= dt * 1.45;
      if (r.alpha <= 0.01) this.ripples.splice(i, 1);
    }
  }

  // -------------------- Rendu Graphique 60fps --------------------

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const tr = this._getRenderTransform();

    // 1. Panorama de la Citadelle (ou fond astral procédural instantané)
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImage, tr.drawX, tr.drawY, tr.drawW, tr.drawH);
    } else {
      this._drawProceduralFallback(ctx);
    }

    // 2. Rayons Célestes Volumétriques (God Rays)
    if (this.state.data.settings.godRays) {
      this._drawGodRays(ctx, tr);
    }

    // 3. Shaders architecturaux vivants par quartier
    this._drawDistrictVfx(ctx, tr);

    // 4. Surbrillance interactive, zoom local subtil & contours runiques des bâtiments
    this._drawBuildingHighlights(ctx, tr);

    // 5. Particules de mana flottantes & étincelles (fusion additive)
    this._drawParticles(ctx, tr);

    // 6. Ondes de choc au clic
    this._drawRipples(ctx);

    ctx.restore();

    // 7. Synchronisation GPU des étiquettes flottantes HTML
    this._syncFloatingLabels(tr);
  }

  _drawProceduralFallback(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.vh);
    g.addColorStop(0, '#050918');
    g.addColorStop(0.55, '#0F1E45');
    g.addColorStop(1, '#070B16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  _drawGodRays(ctx, tr) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const ray of this.godRays) {
      const breathe = 0.62 + 0.38 * Math.sin(this.time * ray.speed + ray.phase);
      const topX = tr.drawX + (ray.u + Math.sin(this.time * 0.14 + ray.phase) * 0.015) * tr.drawW;
      const topY = tr.drawY - 40;
      const botX = topX + Math.tan(ray.angle) * (tr.drawH * 0.86);
      const botY = tr.drawY + tr.drawH * 0.86;
      const halfWTop = tr.drawW * ray.width * 0.24;
      const halfWBot = tr.drawW * ray.width * 0.85;

      const grad = ctx.createLinearGradient(topX, topY, botX, botY);
      grad.addColorStop(0, ray.color);
      grad.addColorStop(0.55, ray.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.globalAlpha = breathe;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(topX - halfWTop, topY);
      ctx.lineTo(topX + halfWTop, topY);
      ctx.lineTo(botX + halfWBot, botY);
      ctx.lineTo(botX - halfWBot, botY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _drawDistrictVfx(ctx, tr) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. TEMPLE D'INVOCATION : Cercles runiques en perspective 3D sur la grande place
    const plazaX = tr.drawX + 0.528 * tr.drawW;
    const plazaY = tr.drawY + 0.508 * tr.drawH;
    const ringRadius = tr.drawW * 0.072;
    const templeBoost = 1 + (this.hoverMix.get('temple') || 0) * 0.65;

    ctx.save();
    ctx.translate(plazaX, plazaY);
    ctx.scale(1, 0.33); // Raccourci perspectif isométrique de l'esplanade

    ctx.rotate(this.time * 0.26);
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.24 * templeBoost})`;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-this.time * 0.52);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.28 * templeBoost})`;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Faisceau vertical du cristal d'invocation central
    const crystalX = tr.drawX + 0.528 * tr.drawW;
    const crystalY = tr.drawY + 0.455 * tr.drawH;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 2.6);
    const beamH = tr.drawH * 0.19;
    const beamGrad = ctx.createLinearGradient(crystalX, plazaY, crystalX, crystalY - beamH);
    beamGrad.addColorStop(0, `rgba(0, 229, 255, ${0.32 * pulse * templeBoost})`);
    beamGrad.addColorStop(0.5, `rgba(255, 215, 0, ${0.16 * pulse * templeBoost})`);
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(crystalX - 7 * templeBoost, crystalY - beamH, 14 * templeBoost, beamH + (plazaY - crystalY));

    // B. PORTAIL DE COMBAT : Vortex dimensionnel en rotation
    const portalX = tr.drawX + 0.289 * tr.drawW;
    const portalY = tr.drawY + 0.252 * tr.drawH;
    const portalRx = tr.drawW * 0.022;
    const portalRy = tr.drawH * 0.068;
    const portalBoost = 1 + (this.hoverMix.get('portal') || 0) * 0.8;

    ctx.save();
    ctx.translate(portalX, portalY);
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.scale(portalRx / 40, portalRy / 40);
      ctx.rotate(this.time * (0.9 + k * 0.45) * (k % 2 ? -1 : 1));
      ctx.strokeStyle = k === 1
        ? `rgba(255, 215, 0, ${0.22 * portalBoost})`
        : `rgba(0, 229, 255, ${(0.34 - k * 0.07) * portalBoost})`;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, 34 - k * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // C. CONSOLE AUTO-BOT : Cœur astral de la sphère armillaire
    const orbX = tr.drawX + 0.746 * tr.drawW;
    const orbY = tr.drawY + 0.142 * tr.drawH;
    const botActive = this.state.data.autobot.active ? 1.2 : 0.55;
    const orbSize = tr.drawW * 0.048 * (0.88 + 0.12 * Math.sin(this.time * 3.4)) * botActive;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(this.sprites.cyan, orbX - orbSize * 0.5, orbY - orbSize * 0.5, orbSize, orbSize);

    // D. FORGE & ATELIER : Lueurs de fournaise pulsantes
    const forgePulse = 0.7 + 0.3 * Math.sin(this.time * 4.7) * Math.cos(this.time * 2.3);
    const forgeGlowPoints = [
      [0.092, 0.665, 0.055],
      [0.155, 0.695, 0.068],
      [0.198, 0.658, 0.05],
    ];
    for (const [fu, fv, fsz] of forgeGlowPoints) {
      const fx = tr.drawX + fu * tr.drawW;
      const fy = tr.drawY + fv * tr.drawH;
      const d = tr.drawW * fsz * forgePulse;
      ctx.globalAlpha = 0.44 + (this.hoverMix.get('forge') || 0) * 0.35;
      ctx.drawImage(this.sprites.amber, fx - d * 0.5, fy - d * 0.5, d, d);
    }

    // E. GRAND COLISÉE : Faisceaux impériaux vers les étoiles
    const colX = tr.drawX + 0.855 * tr.drawW;
    const colY = tr.drawY + 0.445 * tr.drawH;
    const colMix = 0.25 + (this.hoverMix.get('coliseum') || 0) * 0.55;
    for (const sign of [-1, 1]) {
      const sway = Math.sin(this.time * 0.85 + sign) * 0.18;
      const rayLen = tr.drawH * 0.32;
      const endX = colX + sign * tr.drawW * 0.035 + Math.sin(sway) * rayLen;
      const endY = colY - rayLen;
      const cg = ctx.createLinearGradient(colX, colY, endX, endY);
      cg.addColorStop(0, `rgba(255, 215, 0, ${0.32 * colMix})`);
      cg.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = cg;
      ctx.lineWidth = tr.drawW * 0.016;
      ctx.beginPath();
      ctx.moveTo(colX + sign * tr.drawW * 0.03, colY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawBuildingHighlights(ctx, tr) {
    const auraSpriteById = {
      temple: 'gold',
      portal: 'cyan',
      forge: 'amber',
      coliseum: 'violet',
      barracks: 'cyan',
      console: 'cyan',
    };

    for (const b of CITADEL_BUILDINGS) {
      const mix = this.hoverMix.get(b.id) || 0;
      const cx = tr.drawX + b.center.u * tr.drawW;
      const cy = tr.drawY + b.center.v * tr.drawH;
      const auraSpr = this.sprites[auraSpriteById[b.id]] || this.sprites.gold;

      // Balise d'ambiance discrète au repos
      if (mix <= 0.01) {
        const idlePulse = 0.13 + 0.05 * Math.sin(this.time * 2.1 + b.center.u * 10);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = idlePulse;
        const sz = tr.drawW * b.radius.rx * 1.08;
        ctx.drawImage(auraSpr, cx - sz * 0.5, cy - sz * 0.5, sz, sz);
        ctx.restore();
        continue;
      }

      const hoverPulse = 0.84 + 0.16 * Math.sin(this.time * 4.4);

      // 1. Lueur pulsante douce en arrière-plan du bâtiment survolé
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const backW = tr.drawW * b.radius.rx * (2.25 + 0.22 * hoverPulse);
      const backH = tr.drawH * b.radius.ry * (2.15 + 0.22 * hoverPulse);
      ctx.globalAlpha = 0.34 * mix * hoverPulse;
      ctx.drawImage(auraSpr, cx - backW * 0.5, cy - backH * 0.5, backW, backH);
      ctx.globalAlpha = 0.26 * mix * hoverPulse;
      ctx.drawImage(this.sprites.gold, cx - backW * 0.38, cy - backH * 0.38, backW * 0.76, backH * 0.76);
      ctx.restore();

      // 2. Effet de zoom local fluide sur l'architecture du bâtiment
      if (this.bgLoaded) {
        ctx.save();
        ctx.beginPath();
        b.polygon.forEach(([pu, pv], idx) => {
          const px = tr.drawX + pu * tr.drawW;
          const py = tr.drawY + pv * tr.drawH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.clip();

        const localScale = 1 + 0.032 * mix;
        ctx.translate(cx, cy);
        ctx.scale(localScale, localScale);
        ctx.translate(-cx, -cy);
        ctx.drawImage(this.bgImage, tr.drawX, tr.drawY, tr.drawW, tr.drawH);
        ctx.restore();
      }

      // 3. Aura magique lumineuse : colonne éthérée + sceau runique rotatif + contour doré
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Colonne d'aura ascendante
      const pillarW = tr.drawW * b.radius.rx * 0.95;
      const pillarH = tr.drawH * b.radius.ry * 1.65;
      const pillarGrad = ctx.createLinearGradient(cx, cy + pillarH * 0.35, cx, cy - pillarH * 0.75);
      pillarGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
      pillarGrad.addColorStop(0.35, `rgba(255, 215, 0, ${(0.18 * mix * hoverPulse).toFixed(3)})`);
      pillarGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(cx - pillarW * 0.5, cy - pillarH * 0.75, pillarW, pillarH * 1.1);

      // Sceau magique en perspective autour du monument
      const sigilRx = tr.drawW * b.radius.rx * (0.92 + 0.05 * hoverPulse);
      ctx.save();
      ctx.translate(cx, cy + tr.drawH * b.radius.ry * 0.26);
      ctx.scale(1, 0.36);

      ctx.rotate(this.time * 0.55);
      ctx.strokeStyle = b.accent;
      ctx.globalAlpha = 0.58 * mix * hoverPulse;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, sigilRx, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-this.time * 1.1);
      ctx.strokeStyle = '#FFD700';
      ctx.globalAlpha = 0.65 * mix;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, sigilRx * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Contour polygonal illuminé avec pulsation
      ctx.globalAlpha = (0.78 + 0.16 * hoverPulse) * mix;
      ctx.beginPath();
      b.polygon.forEach(([pu, pv], idx) => {
        const px = tr.drawX + pu * tr.drawW;
        const py = tr.drawY + pv * tr.drawH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();

      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 2.3 * mix;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20 * mix * hoverPulse;
      ctx.setLineDash([12, 7]);
      ctx.lineDashOffset = -this.time * 30;
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255, 215, 0, ${(0.58 * mix * hoverPulse).toFixed(3)})`;
      ctx.lineWidth = 1.15;
      ctx.stroke();

      ctx.restore();
    }
  }

  _drawParticles(ctx, tr) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Particules ambiantes flottantes
    for (const p of this.ambientParticles) {
      const sx = tr.drawX + p.u * tr.drawW;
      const sy = tr.drawY + p.v * tr.drawH;
      if (sx < -30 || sx > this.vw + 30 || sy < -30 || sy > this.vh + 30) continue;
      const twinkle = 0.55 + 0.45 * Math.sin(this.time * 3.1 + p.phase);
      ctx.globalAlpha = p.alpha * twinkle;
      const img = this.sprites[p.sprite] || this.sprites.cyan;
      ctx.drawImage(img, sx - p.size * 0.5, sy - p.size * 0.5, p.size, p.size);
    }

    // Étincelles localisées (forge, cascades, survol bâtiment)
    for (const s of this.localizedSparks) {
      const sx = tr.drawX + s.u * tr.drawW;
      const sy = tr.drawY + s.v * tr.drawH;
      const ratio = Math.max(0, s.life / s.maxLife);
      ctx.globalAlpha = ratio * 0.9;
      const sz = s.size * (0.5 + ratio * 0.65);
      const img = this.sprites[s.sprite] || this.sprites.gold;
      ctx.drawImage(img, sx - sz * 0.5, sy - sz * 0.5, sz, sz);
    }

    // Sillage du curseur
    for (const c of this.cursorTrail) {
      const ratio = Math.max(0, c.life / c.maxLife);
      ctx.globalAlpha = ratio * 0.78;
      const sz = c.size * ratio;
      const img = this.sprites[c.sprite] || this.sprites.cyan;
      ctx.drawImage(img, c.x - sz * 0.5, c.y - sz * 0.5, sz, sz);
    }

    ctx.restore();
  }

  _drawRipples(ctx) {
    if (!this.ripples.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.ripples) {
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.68, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _syncFloatingLabels(tr) {
    const minX = 96;
    const maxX = this.vw - 96;
    const minY = 104;
    const maxY = this.vh - 46;

    for (const b of CITADEL_BUILDINGS) {
      const ref = this.labelNodes.get(b.id);
      if (!ref) continue;

      const rawX = tr.drawX + b.labelAnchor.u * tr.drawW;
      const rawY = tr.drawY + b.labelAnchor.v * tr.drawH;
      const isHovered = this.hoveredId === b.id;
      const floatBob = Math.sin(this.time * 2.2 + b.center.u * 9) * 3.2;

      // Masque élégamment l'étiquette si le bâtiment sort largement du cadre sur mobile
      const outOfView = rawX < -60 || rawX > this.vw + 60;
      const clampedX = Math.max(minX, Math.min(maxX, rawX));
      const clampedY = Math.max(minY, Math.min(maxY, rawY + floatBob));

      ref.anchorEl.style.opacity = this.activeModalId || outOfView ? '0' : '1';
      ref.anchorEl.style.pointerEvents = this.activeModalId || outOfView ? 'none' : 'auto';
      ref.anchorEl.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0)`;
      ref.el.classList.toggle('is-hovered', isHovered);
    }
  }
}
