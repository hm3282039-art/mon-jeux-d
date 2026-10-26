// ============================================================================
// Système de Modales & Panneaux Interactifs des 6 Bâtiments de la Citadelle
// ============================================================================

import {
  CITADEL_BUILDINGS,
  HERO_CATALOG,
  FORGE_BLUEPRINTS,
  CAMPAIGN_CHAPTERS,
  COLISEUM_OPPONENTS,
  HONOR_SHOP_ITEMS,
  AUTOBOT_PROTOCOLS,
} from './data.js';
import { PATCH_NOTES, ROADMAP_PHASES, CURRENT_VERSION } from './roadmap.js';
import { formatNum } from './state.js';

const RARITY_LABELS = {
  legendary: 'Légendaire 5★',
  epic: 'Épique 4★',
  rare: 'Rare 3★',
};

export class ModalController {
  constructor({ state, sound, onToast, onModalChange }) {
    this.state = state;
    this.sound = sound;
    this.onToast = onToast;
    this.onModalChange = onModalChange;

    this.backdrop = document.getElementById('modal-backdrop');
    this.modalEl = document.getElementById('building-modal');
    this.emblemEl = document.getElementById('modal-emblem');
    this.kickerEl = document.getElementById('modal-kicker');
    this.titleEl = document.getElementById('modal-title');
    this.tabsEl = document.getElementById('modal-tabs');
    this.contentEl = document.getElementById('modal-content');
    this.closeBtn = document.getElementById('modal-close-btn');

    this.activeBuildingId = null;
    this.activeTabIndex = 0;
    this.selectedHeroId = 'titania';
    this.selectedGearUid = null;
    this.lastSummonPulls = [];

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeBuildingId) {
        this.close();
      }
    });

    // Rafraîchit le journal Auto-Bot en direct si l'onglet Console est ouvert
    this.state.subscribe((topic) => {
      if (topic === 'botlog' && this.activeBuildingId === 'console' && this.activeTabIndex === 0) {
        const logBox = this.contentEl.querySelector('#live-bot-terminal');
        if (logBox) {
          logBox.innerHTML = this.state.botLogs
            .slice(0, 12)
            .map((line) => `<div class="term-line">${line}</div>`)
            .join('');
        }
      }
    });
  }

  open(buildingId, initialTab = 0) {
    const meta =
      buildingId === 'roadmap'
        ? {
            id: 'roadmap',
            accent: '#FFD700',
            icon: '📜',
            kicker: `ARCHIVES ROYALES · VERSION ${CURRENT_VERSION}`,
            name: 'Feuille de Route & Mises à Jour',
          }
        : CITADEL_BUILDINGS.find((item) => item.id === buildingId);
    if (!meta) return;

    this.activeBuildingId = meta.id;
    this.activeTabIndex = initialTab;

    this.modalEl.style.setProperty('--modal-accent', meta.accent);
    this.emblemEl.textContent = meta.icon;
    this.kickerEl.textContent = meta.kicker;
    this.titleEl.textContent = meta.name;

    this.backdrop.classList.add('is-open');
    this.backdrop.setAttribute('aria-hidden', 'false');

    this.sound.playModalOpen();
    this.onModalChange?.(meta.id === 'roadmap' ? null : meta.id);
    this._renderCurrentBuilding();
  }

  close() {
    if (!this.activeBuildingId) return;
    this.activeBuildingId = null;
    this.backdrop.classList.remove('is-open');
    this.backdrop.setAttribute('aria-hidden', 'true');
    this.sound.playModalClose();
    this.onModalChange?.(null);
  }

  _getTabsForBuilding(id) {
    switch (id) {
      case 'temple':
        return [
          { label: '✨ Bannière Céleste', render: () => this._renderTempleSummon() },
          { label: '📜 Archive & Taux Astraux', render: () => this._renderTempleRates() },
        ];
      case 'barracks':
        return [
          { label: '🛡️ Escouade & Héros', render: () => this._renderBarracksRoster() },
          { label: '⚔️ Arsenal & Reliques', render: () => this._renderBarracksGear() },
        ];
      case 'forge':
        return [
          { label: '🔨 Renforcement (+0 → +15)', render: () => this._renderForgeUpgrade() },
          { label: '🔥 Forge Astrale (Artisanat)', render: () => this._renderForgeCraft() },
        ];
      case 'portal':
        return [
          { label: '🗺️ Campagne Continentale', render: () => this._renderPortalCampaign() },
          { label: '🗼 Tour de l’Infini', render: () => this._renderPortalTower() },
        ];
      case 'coliseum':
        return [
          { label: '⚔️ Arène Classée & Bots', render: () => this._renderColiseumArena() },
          { label: '🏅 Boutique d’Honneur', render: () => this._renderColiseumShop() },
        ];
      case 'console':
        return [
          { label: '🤖 Console Auto-Bot (∞)', render: () => this._renderConsoleBot() },
          { label: '🔊 Audio & Effets VFX', render: () => this._renderConsoleSettings() },
          { label: '👑 Profil du Seigneur', render: () => this._renderConsoleProfile() },
          { label: '📜 Feuille de Route & MAJ', render: () => this._renderPatchNotes() },
        ];
      case 'roadmap':
        return [
          { label: '📝 Journal des Mises à Jour (MAJ)', render: () => this._renderPatchNotes() },
          { label: '🗺️ Feuille de Route du Jeu', render: () => this._renderRoadmapPhases() },
        ];
      default:
        return [];
    }
  }

  _renderCurrentBuilding() {
    if (!this.activeBuildingId) return;
    const tabs = this._getTabsForBuilding(this.activeBuildingId);
    this.tabsEl.innerHTML = '';

    tabs.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'tab';
      btn.className = `modal-tab ${idx === this.activeTabIndex ? 'active' : ''}`;
      btn.setAttribute('aria-selected', idx === this.activeTabIndex ? 'true' : 'false');
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        if (this.activeTabIndex === idx) return;
        this.activeTabIndex = idx;
        this.sound.playTab();
        this._renderCurrentBuilding();
      });
      this.tabsEl.appendChild(btn);
    });

    this.contentEl.innerHTML = '';
    const activeTab = tabs[this.activeTabIndex] || tabs[0];
    if (activeTab) {
      activeTab.render();
    }
  }

  // ==========================================================================
  // 1. TEMPLE D'INVOCATION (SYSTÈME GACHA)
  // ==========================================================================

  _renderTempleSummon() {
    const d = this.state.data;
    const pityPct = Math.min(100, (d.pity.legendaryCount / d.pity.legendaryMax) * 100);

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="gacha-banner">
        <img src="assets/heroes/titania.jpg" alt="Titania" class="gacha-banner-art" />
        <div class="gacha-banner-veil"></div>
        <div class="gacha-banner-copy">
          <span class="rarity-pill legendary">TAUX AUGMENTÉ · 5★ LÉGENDAIRE</span>
          <h3>Titania — Impératrice de Lumière</h3>
          <p>Invoquez les Champions Célestes d’Astria. Chaque doublon éveille automatiquement la puissance stellaire du héros.</p>
          <div class="pity-box">
            <div class="pity-labels">
              <span>Garantie 5★ Légendaire</span>
              <strong>${d.pity.legendaryCount} / ${d.pity.legendaryMax} invocations</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill gold" style="width: ${pityPct}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="summon-actions-grid">
        <button type="button" class="action-card-btn free-btn" id="btn-summon-free" ${!d.pity.freeDailyReady ? 'disabled' : ''}>
          <span class="act-title">${d.pity.freeDailyReady ? '✦ Invocation Astrale Gratuite' : '✓ Tirage Gratuit Réclamé'}</span>
          <span class="act-cost">0 Cristal · Cadeau du Sanctuaire</span>
        </button>

        <button type="button" class="action-card-btn" id="btn-summon-1">
          <span class="act-title">Invocation ×1</span>
          <span class="act-cost">💎 100 Cristaux Astraux</span>
        </button>

        <button type="button" class="action-card-btn gold-cta" id="btn-summon-10">
          <span class="act-title">Invocation ×10 (4★+ Garanti)</span>
          <span class="act-cost">💎 900 Cristaux Astraux (-10%)</span>
        </button>
      </div>

      <div class="summon-results-wrap" id="summon-results">
        ${this.lastSummonPulls.length
          ? `<div class="summon-grid">${this.lastSummonPulls
              .map(
                (p, idx) => `
              <div class="pull-card rarity-${p.rarity}" style="animation-delay:${idx * 45}ms">
                <div class="pull-portrait">
                  <img src="${p.hero.art}" alt="${p.hero.name}" />
                  <span class="pull-badge">${p.isNew ? 'NOUVEAU' : 'ÉVEIL +'}</span>
                </div>
                <strong>${p.hero.name}</strong>
                <small>${'★'.repeat(p.stars)}</small>
              </div>
            `,
              )
              .join('')}</div>`
          : `<div class="placeholder-hint">Sélectionnez un rituel d’invocation ci-dessus pour matérialiser des Héros dans la Citadelle.</div>`}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    const handlePull = (count, isFree = false) => {
      const res = this.state.summon(count, isFree);
      if (!res.ok) {
        this.sound.playClick();
        this.onToast?.(res.reason, 'warn');
        return;
      }
      this.lastSummonPulls = res.pulls;
      const gotLeg = res.pulls.some((p) => p.rarity === 'legendary');
      this.sound.playSummon(gotLeg);
      this.onToast?.(
        gotLeg
          ? '✨ APPARITION LÉGENDAIRE 5★ au Temple d’Invocation !'
          : `${count} invocation(s) accomplie(s) avec succès !`,
        gotLeg ? 'gold' : 'info',
      );
      this._renderCurrentBuilding();
    };

    wrap.querySelector('#btn-summon-free')?.addEventListener('click', () => handlePull(1, true));
    wrap.querySelector('#btn-summon-1')?.addEventListener('click', () => handlePull(1, false));
    wrap.querySelector('#btn-summon-10')?.addEventListener('click', () => handlePull(10, false));
  }

  _renderTempleRates() {
    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="info-banner">
        <div>
          <h4>Probabilités Officielles du Sanctuaire</h4>
          <p>Légendaire 5★ : <strong>7,5 %</strong> (Garanti à 50 tirages) · Épique 4★ : <strong>28,5 %</strong> (Garanti sur chaque ×10) · Rare 3★ : <strong>64,0 %</strong></p>
        </div>
      </div>
      <div class="catalog-grid">
        ${HERO_CATALOG.map((h) => {
          const owned = this.state.data.heroes[h.id]?.owned;
          return `
            <div class="catalog-card rarity-${h.rarity} ${owned ? 'is-owned' : ''}">
              <img src="${h.art}" alt="${h.name}" />
              <div class="catalog-meta">
                <span class="rarity-pill ${h.rarity}">${RARITY_LABELS[h.rarity]}</span>
                <strong>${h.name}</strong>
                <small>${h.role} · ${h.element}</small>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    this.contentEl.appendChild(wrap);
  }

  // ==========================================================================
  // 2. CASERNE DES HÉROS (INVENTAIRE, ÉQUIPEMENT & NIVEAUX)
  // ==========================================================================

  _renderBarracksRoster() {
    const allStats = HERO_CATALOG.map((h) => this.state.getHeroStats(h.id));
    if (!this.selectedHeroId) this.selectedHeroId = 'titania';
    const selected = this.state.getHeroStats(this.selectedHeroId) || allStats[0];
    const inSquad = this.state.data.squad.includes(selected.id);
    const cost1 = this.state.getLevelUpCost(selected.id, 1);
    const cost5 = this.state.getLevelUpCost(selected.id, 5);

    const wrap = document.createElement('div');
    wrap.className = 'barracks-layout';
    wrap.innerHTML = `
      <div class="roster-column">
        <div class="section-mini-head">
          <span>Escouade Active : ${this.state.data.squad.length}/5</span>
          <strong>PC Total : ⚡ ${formatNum(this.state.getTotalTeamCp())}</strong>
        </div>
        <div class="roster-grid">
          ${allStats
            .map((h) => {
              const active = h.id === selected.id;
              const sq = this.state.data.squad.includes(h.id);
              return `
                <button type="button" class="hero-tile rarity-${h.rarity} ${active ? 'selected' : ''} ${!h.owned ? 'locked' : ''}" data-hero-id="${h.id}">
                  <img src="${h.art}" alt="${h.name}" />
                  ${sq ? '<span class="tile-squad-tag">ÉQUIPE</span>' : ''}
                  ${!h.owned ? '<span class="tile-lock">🔒</span>' : `<span class="tile-lv">Niv.${h.level}</span>`}
                  <span class="tile-name">${h.name}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="inspector-column">
        <div class="hero-showcase rarity-${selected.rarity}">
          <img src="${selected.art}" alt="${selected.name}" class="showcase-art" />
          <div class="showcase-gradient"></div>
          <div class="showcase-header">
            <span class="rarity-pill ${selected.rarity}">${RARITY_LABELS[selected.rarity]} · ${selected.element}</span>
            <h3>${selected.name}</h3>
            <p>${selected.title} · ${selected.role}</p>
            <div class="star-row">${'★'.repeat(selected.stars)}</div>
          </div>
          <div class="showcase-cp">⚡ ${formatNum(selected.cp)} PC</div>
        </div>

        <div class="stats-quad">
          <div class="stat-cell"><span>ATQ</span><strong>${formatNum(selected.atk)}</strong></div>
          <div class="stat-cell"><span>PV MAX</span><strong>${formatNum(selected.hp)}</strong></div>
          <div class="stat-cell"><span>DÉFENSE</span><strong>${formatNum(selected.def)}</strong></div>
          <div class="stat-cell"><span>VITESSE</span><strong>${selected.spd}</strong></div>
        </div>

        <div class="skill-card">
          <strong>✦ Ultime : ${selected.skill}</strong>
          <p>${selected.skillDesc}</p>
        </div>

        <div class="hero-controls">
          <button type="button" class="gold-btn" id="btn-lv-1" ${!selected.owned ? 'disabled' : ''}>
            Niveau +1 <small>🪙 ${formatNum(cost1)}</small>
          </button>
          <button type="button" class="gold-btn" id="btn-lv-5" ${!selected.owned ? 'disabled' : ''}>
            Niveau +5 <small>🪙 ${formatNum(cost5)}</small>
          </button>
          <button type="button" class="cyan-btn" id="btn-toggle-squad" ${!selected.owned ? 'disabled' : ''}>
            ${inSquad ? 'Retirer de l’Escouade' : 'Déployer dans l’Escouade'}
          </button>
        </div>
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-hero-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedHeroId = btn.dataset.heroId;
        this.sound.playClick();
        this._renderCurrentBuilding();
      });
    });

    wrap.querySelector('#btn-lv-1')?.addEventListener('click', () => {
      const r = this.state.levelUpHero(selected.id, 1);
      if (!r.ok) return this.onToast?.(r.reason, 'warn');
      this.sound.playCoin();
      this.onToast?.(`${selected.name} passe au Niveau ${r.newLevel} !`, 'gold');
      this._renderCurrentBuilding();
    });

    wrap.querySelector('#btn-lv-5')?.addEventListener('click', () => {
      const r = this.state.levelUpHero(selected.id, 5);
      if (!r.ok) return this.onToast?.(r.reason, 'warn');
      this.sound.playVictory();
      this.onToast?.(`${selected.name} bondit au Niveau ${r.newLevel} !`, 'gold');
      this._renderCurrentBuilding();
    });

    wrap.querySelector('#btn-toggle-squad')?.addEventListener('click', () => {
      const r = this.state.toggleSquadHero(selected.id);
      if (!r.ok) return this.onToast?.(r.reason, 'warn');
      this.sound.playClick();
      this.onToast?.(
        r.action === 'added'
          ? `${selected.name} rejoint l’escouade active !`
          : `${selected.name} est mis en réserve.`,
        'info',
      );
      this._renderCurrentBuilding();
    });
  }

  _renderBarracksGear() {
    const ownedHeroes = HERO_CATALOG.filter((h) => this.state.data.heroes[h.id]?.owned);
    const inv = this.state.data.inventory;

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="info-banner">
        <div>
          <h4>Reliques & Équipements Forgés (${inv.length})</h4>
          <p>Assignez vos armes et armures forgées aux héros de votre escouade pour démultiplier leur Puissance de Combat (PC).</p>
        </div>
      </div>
      <div class="gear-list">
        ${inv.length === 0 ? '<div class="placeholder-hint">Aucun équipement en stock. Visitez la Forge & Atelier pour en créer !</div>' : ''}
        ${inv
          .map((item) => {
            const bp = FORGE_BLUEPRINTS.find((b) => b.id === item.blueprintId);
            if (!bp) return '';
            const statVal = bp.baseStat + item.plus * bp.perPlus;
            const totalCp = bp.cpValue + item.plus * 460;
            return `
              <div class="gear-row rarity-${bp.rarity}">
                <div class="gear-icon">${bp.icon}</div>
                <div class="gear-info">
                  <strong>${bp.name} <span class="plus-tag">+${item.plus}</span></strong>
                  <small>${bp.slot} · +${statVal} ${bp.statLabel} · ⚡ +${formatNum(totalCp)} PC</small>
                </div>
                <select class="obsidian-select" data-equip-uid="${item.uid}">
                  <option value="">— Non équipé —</option>
                  ${ownedHeroes
                    .map(
                      (h) =>
                        `<option value="${h.id}" ${item.equippedHeroId === h.id ? 'selected' : ''}>Équipé : ${h.name}</option>`,
                    )
                    .join('')}
                </select>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-equip-uid]').forEach((sel) => {
      sel.addEventListener('change', () => {
        this.state.equipGear(sel.dataset.equipUid, sel.value || null);
        this.sound.playClick();
        this.onToast?.('Équipement mis à jour — PC d’équipe recalculé !', 'info');
        this._renderCurrentBuilding();
      });
    });
  }

  // ==========================================================================
  // 3. FORGE & ATELIER (ARTISANAT & RENFORCEMENT +15)
  // ==========================================================================

  _renderForgeUpgrade() {
    const inv = this.state.data.inventory;
    if (!this.selectedGearUid || !inv.some((g) => g.uid === this.selectedGearUid)) {
      this.selectedGearUid = inv[0]?.uid || null;
    }
    const current = inv.find((g) => g.uid === this.selectedGearUid);
    const bp = current ? FORGE_BLUEPRINTS.find((b) => b.id === current.blueprintId) : null;

    const wrap = document.createElement('div');
    wrap.className = 'forge-layout';

    if (!current || !bp) {
      wrap.innerHTML = `<div class="placeholder-hint">Votre inventaire est vide. Ouvrez l’onglet « Forge Astrale » pour forger votre première arme légendaire !</div>`;
      this.contentEl.appendChild(wrap);
      return;
    }

    const cost = this.state.getGearUpgradeCost(current);
    const statNow = bp.baseStat + current.plus * bp.perPlus;
    const statNext = bp.baseStat + Math.min(15, current.plus + 1) * bp.perPlus;
    const chancePct = current.plus >= 15 ? 100 : current.plus < 6 ? 100 : current.plus < 11 ? 85 : 70;

    wrap.innerHTML = `
      <div class="anvil-stage rarity-${bp.rarity}">
        <div class="anvil-aura"></div>
        <div class="anvil-item-icon">${bp.icon}</div>
        <h3>${bp.name} <span class="plus-tag large">+${current.plus}</span></h3>
        <p>${bp.desc}</p>
        <div class="upgrade-comparison">
          <div><span>${bp.statLabel} actuel</span><strong>+${statNow}</strong></div>
          <span class="arrow">➔</span>
          <div><span>Palier suivant</span><strong class="cyan-txt">+${statNext}</strong></div>
        </div>
        <div class="forge-chance">Chances d’harmonisation runique : <strong>${chancePct} %</strong> (Aucune destruction)</div>
        <button type="button" class="gold-btn wide-btn" id="btn-strike-anvil" ${current.plus >= 15 ? 'disabled' : ''}>
          ${current.plus >= 15 ? '✦ Niveau Divin +15 Atteint' : `⚒️ Frapper sur l’Enclume · 🪙 ${formatNum(cost)}`}
        </button>
      </div>

      <div class="forge-inventory-list">
        <h4>Sélectionner une pièce à renforcer</h4>
        ${inv
          .map((g) => {
            const b = FORGE_BLUEPRINTS.find((x) => x.id === g.blueprintId);
            const owner = HERO_CATALOG.find((h) => h.id === g.equippedHeroId);
            return `
              <button type="button" class="forge-pick-btn ${g.uid === current.uid ? 'active' : ''}" data-pick-gear="${g.uid}">
                <span class="fp-ico">${b?.icon || '⚔️'}</span>
                <span class="fp-meta">
                  <strong>${b?.name || 'Relique'} +${g.plus}</strong>
                  <small>${owner ? `Porté par ${owner.name}` : 'En réserve'}</small>
                </span>
                <span class="fp-cp">+${formatNum((b?.cpValue || 1500) + g.plus * 460)} PC</span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-pick-gear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedGearUid = btn.dataset.pickGear;
        this.sound.playClick();
        this._renderCurrentBuilding();
      });
    });

    wrap.querySelector('#btn-strike-anvil')?.addEventListener('click', () => {
      const r = this.state.upgradeGear(current.uid);
      if (!r.ok) return this.onToast?.(r.reason, 'warn');
      this.sound.playForge(r.success);
      if (r.success) {
        this.onToast?.(`🔥 Renforcement réussi ! ${bp.name} passe à +${r.plus} !`, 'gold');
      } else {
        this.onToast?.('Le métal résiste mais reste intact — retentez la frappe !', 'info');
      }
      this._renderCurrentBuilding();
    });
  }

  _renderForgeCraft() {
    const wrap = document.createElement('div');
    wrap.className = 'blueprint-grid';
    wrap.innerHTML = FORGE_BLUEPRINTS.map(
      (bp) => `
      <div class="blueprint-card rarity-${bp.rarity}">
        <div class="bp-top">
          <span class="bp-icon">${bp.icon}</span>
          <div>
            <span class="rarity-pill ${bp.rarity}">${RARITY_LABELS[bp.rarity]} · ${bp.slot}</span>
            <h4>${bp.name}</h4>
          </div>
        </div>
        <p>${bp.desc}</p>
        <div class="bp-stats">
          <span>Base : +${bp.baseStat} ${bp.statLabel}</span>
          <span>⚡ +${formatNum(bp.cpValue)} PC</span>
        </div>
        <button type="button" class="gold-btn" data-craft-id="${bp.id}">
          ⚒️ Forger · 🪙 ${formatNum(bp.craftCost)} Or
        </button>
      </div>
    `,
    ).join('');

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-craft-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = this.state.craftGear(btn.dataset.craftId);
        if (!res.ok) return this.onToast?.(res.reason, 'warn');
        this.selectedGearUid = res.item.uid;
        this.sound.playForge(true);
        this.onToast?.(`⚒️ ${res.blueprint.name} forgée avec succès !`, 'gold');
        this.activeTabIndex = 0;
        this._renderCurrentBuilding();
      });
    });
  }

  // ==========================================================================
  // 4. PORTAIL DE COMBAT (CAMPAGNE & TOUR INFINIE — SANS ÉNERGIE)
  // ==========================================================================

  _renderPortalCampaign() {
    const d = this.state.data;
    const squadHeroes = d.squad.map((id) => this.state.getHeroStats(id)).filter(Boolean);

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="battle-vista">
        <img src="assets/bg/arena.jpg" alt="Champ de bataille" class="vista-bg" />
        <div class="vista-veil"></div>
        <div class="vista-content">
          <div class="vista-left">
            <span class="unlimited-tag">⚡ 0 ÉNERGIE · ACCÈS ILLIMITÉ</span>
            <h3>Étape Continentale ${d.campaign.stage}</h3>
            <p>Votre escouade affronte les légions corrompues au-delà du Portail. Aucune limite d’endurance ne freine votre conquête.</p>
            <div class="vista-squad">
              ${squadHeroes.map((h) => `<img src="${h.art}" alt="${h.name}" title="${h.name} (Niv.${h.level})" />`).join('')}
            </div>
          </div>
          <div class="vista-boss">
            <img src="assets/sprites/foret_boss.webp" alt="Boss ennemi" />
          </div>
        </div>
      </div>

      <div class="chapter-cards">
        ${CAMPAIGN_CHAPTERS.map(
          (ch) => `
          <div class="chapter-card">
            <div class="ch-info">
              <span class="ch-tag">${ch.chapter} · Coût : 0 Énergie</span>
              <h4>${ch.name}</h4>
              <small>Boss : ${ch.bossName} · PC conseillé : ${formatNum(ch.recommendedCp)}</small>
              <div class="ch-rewards">
                <span>🪙 +${formatNum(ch.goldReward)} Or</span>
                <span>💎 +${ch.crystalReward} Cristaux</span>
              </div>
            </div>
            <button type="button" class="cyan-btn" data-fight-chapter="${ch.id}">
              ⚔️ Lancer l’Assaut
            </button>
          </div>
        `,
        ).join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-fight-chapter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = CAMPAIGN_CHAPTERS.find((c) => c.id === btn.dataset.fightChapter);
        const res = this.state.runBattleStage('campaign', ch);
        this.sound.playVictory();
        this.onToast?.(
          `🏆 Étape ${res.stageCleared} conquise ! +${formatNum(res.gold)} Or & +${res.crystals} Cristaux Astraux`,
          'gold',
        );
        this._renderCurrentBuilding();
      });
    });
  }

  _renderPortalTower() {
    const floor = this.state.data.campaign.towerFloor;
    const goldNext = 1900 + floor * 145;
    const crysNext = 18 + Math.floor(floor / 4);

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="tower-hero-panel">
        <div class="tower-floor-badge">ÉTAGE ${floor}</div>
        <h3>Tour Astrale de l’Infini</h3>
        <p>Gravissez les paliers célestes sans aucune jauge de stamina. Chaque étage offre davantage de Cristaux Astraux et d’Or Impérial.</p>
        <div class="tower-rewards-preview">
          <span>Récompense d’étage : <strong>🪙 +${formatNum(goldNext)} Or</strong></span>
          <span><strong>💎 +${crysNext} Cristaux Astraux</strong></span>
        </div>
        <button type="button" class="gold-btn wide-btn" id="btn-climb-tower">
          🌀 Conquérir l’Étage ${floor} (Illimité)
        </button>
      </div>
    `;
    this.contentEl.appendChild(wrap);

    wrap.querySelector('#btn-climb-tower')?.addEventListener('click', () => {
      const res = this.state.runBattleStage('tower');
      this.sound.playVictory();
      this.onToast?.(
        `🗼 Étage ${res.stageCleared} franchi ! +${formatNum(res.gold)} Or & +${res.crystals} Cristaux !`,
        'gold',
      );
      this._renderCurrentBuilding();
    });
  }

  // ==========================================================================
  // 5. GRAND COLISÉE (JCJ & COMPÉTITION DE BOTS)
  // ==========================================================================

  _renderColiseumArena() {
    const c = this.state.data.coliseum;
    const myCp = this.state.getTotalTeamCp();

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="coliseum-banner">
        <div>
          <span class="rarity-pill legendary">LIGUE ACTUELLE : ${this.state.getColiseumRank()}</span>
          <h3>Classement Impérial : ${formatNum(c.points)} pts</h3>
          <p>Victoires : ${c.wins} · Série actuelle : 🔥 ${c.streak} · Votre PC : ⚡ ${formatNum(myCp)}</p>
        </div>
        <div class="honor-balance-chip">🏅 ${formatNum(this.state.data.currencies.honor)} Honneur</div>
      </div>

      <div class="opponents-list">
        ${COLISEUM_OPPONENTS.map((opp) => {
          const advantage = myCp >= opp.cp;
          return `
            <div class="opponent-card">
              <img src="${opp.avatar}" alt="${opp.name}" class="opp-avatar" />
              <div class="opp-meta">
                <div class="opp-top">
                  <strong>${opp.name}</strong>
                  <span class="league-chip">${opp.league}</span>
                </div>
                <span class="opp-cp ${advantage ? 'favorable' : 'challenging'}">
                  ⚡ ${formatNum(opp.cp)} PC · ${advantage ? 'Avantage Tactique' : 'Défi Élevé'}
                </span>
                <small>Butin : 🏅 +${opp.honorReward} Honneur · 🪙 +${formatNum(opp.goldReward)} Or</small>
              </div>
              <button type="button" class="gold-btn" data-duel-id="${opp.id}">⚔️ Défier</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-duel-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const opp = COLISEUM_OPPONENTS.find((o) => o.id === btn.dataset.duelId);
        if (!opp) return;
        const res = this.state.challengeOpponent(opp);
        if (res.victory) {
          this.sound.playVictory();
          this.onToast?.(`⚔️ Triomphe face à ${opp.name} ! +${res.honor} Insignes d’Honneur`, 'gold');
        } else {
          this.sound.playForge(false);
          this.onToast?.(`Duel intense contre ${opp.name} — +${res.honor} Honneur de bravoure`, 'info');
        }
        this._renderCurrentBuilding();
      });
    });
  }

  _renderColiseumShop() {
    const wrap = document.createElement('div');
    wrap.className = 'blueprint-grid';
    wrap.innerHTML = HONOR_SHOP_ITEMS.map(
      (it) => `
      <div class="blueprint-card rarity-legendary">
        <div class="bp-top">
          <span class="bp-icon">${it.icon}</span>
          <div>
            <span class="rarity-pill epic">TRÉSORERIE D’HONNEUR</span>
            <h4>${it.name}</h4>
          </div>
        </div>
        <p>${it.desc}</p>
        <button type="button" class="cyan-btn" data-buy-honor="${it.id}">
          Échanger · 🏅 ${it.costHonor} Insignes d’Honneur
        </button>
      </div>
    `,
    ).join('');

    this.contentEl.appendChild(wrap);

    wrap.querySelectorAll('[data-buy-honor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = this.state.buyHonorItem(btn.dataset.buyHonor);
        if (!res.ok) return this.onToast?.(res.reason, 'warn');
        this.sound.playCoin();
        this.onToast?.(`🏅 Récompense obtenue : ${res.item.name} !`, 'gold');
        this._renderCurrentBuilding();
      });
    });
  }

  // ==========================================================================
  // 6. CONSOLE AUTO-BOT & PARAMÈTRES
  // ==========================================================================

  _renderConsoleBot() {
    const bot = this.state.data.autobot;
    const gps = this.state.getGoldPerSecond();

    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="bot-master-bar ${bot.active ? 'online' : 'offline'}">
        <div>
          <span class="unlimited-tag">NOYAU ASTROLABE · 0 STAMINA</span>
          <h3>Automate de Farm Illimité : ${bot.active ? 'EN LIGNE' : 'EN PAUSE'}</h3>
          <p>Rendement actuel : <strong>+${formatNum(gps)} Or / sec</strong> · Vagues complétées : <strong>${formatNum(bot.cyclesCompleted)}</strong></p>
        </div>
        <button type="button" class="${bot.active ? 'cyan-btn' : 'gold-btn'}" id="btn-toggle-bot">
          ${bot.active ? '⏸ Mettre en Pause' : '▶ Activer l’Auto-Bot'}
        </button>
      </div>

      <div class="bot-controls-row">
        <div class="speed-group">
          <span>Cadence de simulation :</span>
          ${[1, 2, 4]
            .map(
              (spd) => `
            <button type="button" class="chip-btn ${bot.speed === spd ? 'active' : ''}" data-bot-speed="${spd}">
              ×${spd}
            </button>
          `,
            )
            .join('')}
        </div>

        <label class="check-pill">
          <input type="checkbox" id="chk-autoforge" ${bot.autoForge ? 'checked' : ''} />
          <span>Auto-Renforcement Forge (si Or &gt; 9 500)</span>
        </label>
      </div>

      <div class="protocol-grid">
        ${AUTOBOT_PROTOCOLS.map(
          (p) => `
          <button type="button" class="protocol-card ${bot.protocolId === p.id ? 'active' : ''}" data-proto-id="${p.id}">
            <strong>${p.name}</strong>
            <p>${p.desc}</p>
          </button>
        `,
        ).join('')}
      </div>

      <div class="bot-terminal" id="live-bot-terminal">
        ${this.state.botLogs
          .slice(0, 12)
          .map((line) => `<div class="term-line">${line}</div>`)
          .join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelector('#btn-toggle-bot')?.addEventListener('click', () => {
      bot.active = !bot.active;
      this.sound.playClick();
      this.state.pushBotLog(
        bot.active ? '[AUTO-BOT] Reprise de la boucle infinie.' : '[AUTO-BOT] Mise en veille manuelle.',
      );
      this.state.save();
      this.state.emit('autobot');
      this._renderCurrentBuilding();
    });

    wrap.querySelectorAll('[data-bot-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        bot.speed = Number(btn.dataset.botSpeed);
        this.sound.playClick();
        this.state.save();
        this.state.emit('autobot');
        this._renderCurrentBuilding();
      });
    });

    wrap.querySelector('#chk-autoforge')?.addEventListener('change', (e) => {
      bot.autoForge = e.target.checked;
      this.sound.playClick();
      this.state.save();
    });

    wrap.querySelectorAll('[data-proto-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        bot.protocolId = btn.dataset.protoId;
        this.sound.playTab();
        this.state.pushBotLog(`[AUTO-BOT] Nouveau protocole assigné : ${btn.querySelector('strong').textContent}`);
        this.state.save();
        this.state.emit('autobot');
        this._renderCurrentBuilding();
      });
    });
  }

  _renderConsoleSettings() {
    const s = this.state.data.settings;
    const wrap = document.createElement('div');
    wrap.className = 'settings-grid';
    wrap.innerHTML = `
      <div class="setting-card">
        <h4>🔊 Moteur Audio Procédural (Web Audio API)</h4>
        <div class="setting-row">
          <span>Effets sonores interactifs</span>
          <button type="button" class="chip-btn ${s.audioEnabled ? 'active' : ''}" id="set-audio-toggle">
            ${s.audioEnabled ? 'Activés' : 'Coupés'}
          </button>
        </div>
        <div class="setting-row">
          <span>Volume principal (${Math.round(s.volume * 100)} %)</span>
          <input type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" id="set-volume" />
        </div>
        <div class="setting-row">
          <span>Banc d’essai Web Audio</span>
          <div class="mini-btn-group">
            <button type="button" class="chip-btn" id="test-sfx-hover">Survol</button>
            <button type="button" class="chip-btn" id="test-sfx-click">Clic</button>
            <button type="button" class="chip-btn" id="test-sfx-fanfare">Invocation</button>
          </div>
        </div>
      </div>

      <div class="setting-card">
        <h4>✨ Rendu Canvas 60fps & Particules VFX</h4>
        <div class="setting-row">
          <span>Densité de particules de mana</span>
          <div class="mini-btn-group">
            ${[
              ['low', 'Faible'],
              ['high', 'Élevée'],
              ['ultra', 'Ultra'],
            ]
              .map(
                ([val, lbl]) =>
                  `<button type="button" class="chip-btn ${s.particleDensity === val ? 'active' : ''}" data-density="${val}">${lbl}</button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="setting-row">
          <span>Rayons lumineux célestes (God Rays)</span>
          <button type="button" class="chip-btn ${s.godRays ? 'active' : ''}" id="set-godrays">
            ${s.godRays ? 'Oui' : 'Non'}
          </button>
        </div>
        <div class="setting-row">
          <span>Parallaxe dynamique de la caméra</span>
          <button type="button" class="chip-btn ${s.parallax ? 'active' : ''}" id="set-parallax">
            ${s.parallax ? 'Oui' : 'Non'}
          </button>
        </div>
        <div class="setting-row">
          <span>Afficher le moniteur 60 FPS</span>
          <button type="button" class="chip-btn ${s.showFps ? 'active' : ''}" id="set-fps">
            ${s.showFps ? 'Oui' : 'Non'}
          </button>
        </div>
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelector('#set-audio-toggle')?.addEventListener('click', () => {
      s.audioEnabled = !s.audioEnabled;
      this.sound.setEnabled(s.audioEnabled);
      this.sound.playClick();
      this.state.save();
      this.state.emit('settings');
      this._renderCurrentBuilding();
    });

    wrap.querySelector('#set-volume')?.addEventListener('input', (e) => {
      s.volume = Number(e.target.value) / 100;
      this.sound.setVolume(s.volume);
      this.state.save();
      this.state.emit('settings');
    });

    wrap.querySelector('#test-sfx-hover')?.addEventListener('click', () => this.sound.playHover(2));
    wrap.querySelector('#test-sfx-click')?.addEventListener('click', () => this.sound.playClick());
    wrap.querySelector('#test-sfx-fanfare')?.addEventListener('click', () => this.sound.playSummon(true));

    wrap.querySelectorAll('[data-density]').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.particleDensity = btn.dataset.density;
        this.sound.playClick();
        this.state.save();
        this.state.emit('settings');
        this._renderCurrentBuilding();
      });
    });

    wrap.querySelector('#set-godrays')?.addEventListener('click', () => {
      s.godRays = !s.godRays;
      this.sound.playClick();
      this.state.save();
      this._renderCurrentBuilding();
    });

    wrap.querySelector('#set-parallax')?.addEventListener('click', () => {
      s.parallax = !s.parallax;
      this.sound.playClick();
      this.state.save();
      this._renderCurrentBuilding();
    });

    wrap.querySelector('#set-fps')?.addEventListener('click', () => {
      s.showFps = !s.showFps;
      this.sound.playClick();
      this.state.save();
      this.state.emit('settings');
      this._renderCurrentBuilding();
    });
  }

  _renderConsoleProfile() {
    const p = this.state.data.player;
    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="setting-card">
        <h4>👑 Identité du Seigneur d’Astria</h4>
        <div class="profile-edit-row">
          <input type="text" class="obsidian-input" id="inp-player-name" maxlength="22" />
          <button type="button" class="gold-btn" id="btn-save-name">Renommer</button>
        </div>

        <h4>Portrait d’Avatar dans la Barre Supérieure</h4>
        <div class="avatar-picker-grid">
          ${HERO_CATALOG.map(
            (h) => `
            <button type="button" class="avatar-choice ${p.avatarId === h.id ? 'active' : ''}" data-avatar-id="${h.id}" title="${h.name}">
              <img src="${h.art}" alt="${h.name}" />
            </button>
          `,
          ).join('')}
        </div>
      </div>

      <div class="setting-card danger-zone">
        <div>
          <h4>Archives Locales</h4>
          <p>Progression sauvegardée automatiquement dans votre navigateur.</p>
        </div>
        <button type="button" class="danger-btn" id="btn-reset-save">Réinitialiser la Sauvegarde</button>
      </div>
    `;

    this.contentEl.appendChild(wrap);

    const nameInput = wrap.querySelector('#inp-player-name');
    if (nameInput) nameInput.value = p.name;

    wrap.querySelector('#btn-save-name')?.addEventListener('click', () => {
      const val = wrap.querySelector('#inp-player-name')?.value.trim();
      if (val) {
        p.name = val;
        this.state.save();
        this.state.emit('profile');
        this.sound.playClick();
        this.onToast?.(`Bienvenue, ${val} !`, 'gold');
      }
    });

    wrap.querySelectorAll('[data-avatar-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        p.avatarId = btn.dataset.avatarId;
        this.state.save();
        this.state.emit('profile');
        this.sound.playClick();
        this._renderCurrentBuilding();
      });
    });

    wrap.querySelector('#btn-reset-save')?.addEventListener('click', () => {
      this.state.reset();
      this.sound.playClick();
      this.onToast?.('Sauvegarde restaurée aux valeurs initiales.', 'info');
      this._renderCurrentBuilding();
    });
  }

  // ==========================================================================
  // 7. FEUILLE DE ROUTE & JOURNAL DES MISES À JOUR (PATCH NOTES)
  // ==========================================================================

  _renderPatchNotes() {
    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="info-banner roadmap-intro">
        <div>
          <h4>📜 Registre Officiel des Mises à Jour d’Astria</h4>
          <p>Retrouvez ici le détail complet de chaque mise à jour appliquée au jeu, de la plus récente à la fondation de la Citadelle.</p>
        </div>
        <button type="button" class="gold-btn" id="btn-goto-roadmap-tab">
          🗺️ Voir la Feuille de Route
        </button>
      </div>

      <div class="patch-timeline">
        ${PATCH_NOTES.map(
          (entry) => `
          <article class="patch-card ${entry.isLatest ? 'patch-latest' : ''}">
            <div class="patch-head">
              <div class="patch-title-row">
                <span class="patch-version">${entry.version}</span>
                <span class="rarity-pill ${entry.isLatest ? 'legendary' : 'rare'}">${entry.tag}</span>
              </div>
              <span class="patch-date">${entry.date}</span>
            </div>
            <h3 class="patch-title">${entry.title}</h3>
            <ul class="patch-list">
              ${entry.changes.map((c) => `<li>${c}</li>`).join('')}
            </ul>
          </article>
        `,
        ).join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelector('#btn-goto-roadmap-tab')?.addEventListener('click', () => {
      this.sound.playTab();
      this.open('roadmap', 1);
    });
  }

  _renderRoadmapPhases() {
    const wrap = document.createElement('div');
    wrap.className = 'panel-stack';
    wrap.innerHTML = `
      <div class="info-banner roadmap-intro">
        <div>
          <h4>🗺️ Feuille de Route de Développement — Chroniques d’Astria</h4>
          <p>Vision d’évolution continue de la Capitale Céleste. Chaque nouvelle demande vient enrichir ce codex et les versions déployées.</p>
        </div>
        <button type="button" class="cyan-btn" id="btn-goto-patch-tab">
          📝 Journal des MAJ
        </button>
      </div>

      <div class="roadmap-phases-grid">
        ${ROADMAP_PHASES.map(
          (ph) => `
          <article class="roadmap-phase-card status-${ph.status}">
            <div class="rp-top">
              <span class="rp-phase">${ph.phase}</span>
              <span class="rp-badge status-${ph.status}">${ph.statusLabel}</span>
            </div>
            <h4>${ph.title}</h4>
            <div class="rp-bar-row">
              <div class="progress-track">
                <div class="progress-fill gold" style="width: ${ph.progress}%"></div>
              </div>
              <span class="rp-pct">${ph.progress}%</span>
            </div>
            <ul class="patch-list">
              ${ph.items.map((it) => `<li>${it}</li>`).join('')}
            </ul>
          </article>
        `,
        ).join('')}
      </div>
    `;

    this.contentEl.appendChild(wrap);

    wrap.querySelector('#btn-goto-patch-tab')?.addEventListener('click', () => {
      this.sound.playTab();
      this.open('roadmap', 0);
    });
  }
}
