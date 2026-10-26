// ============================================================================
// Moteur Audio Procédural (Web Audio API)
// Synthèse temps réel : survols de bâtiments, clics UI, onglets, forge, gacha.
// ============================================================================

const PENTATONIC_HZ = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.65;
    this._lastHoverAt = 0;
    this._unlocked = false;

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this._unlocked = true;
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0));
  }

  _canPlay() {
    if (!this.enabled || this.volume <= 0.001) return false;
    if (!this.ctx) this.unlock();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx.state === 'running';
  }

  _tone({ freq = 440, freqEnd = null, type = 'sine', gain = 0.12, attack = 0.006, duration = 0.14, delay = 0 }) {
    if (!this._canPlay()) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    }

    const peak = Math.max(0.0001, gain * this.volume);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Effet cristallin au survol d'un bâtiment de la Citadelle */
  playHover(index = 0) {
    const now = performance.now();
    if (now - this._lastHoverAt < 65) return;
    this._lastHoverAt = now;

    const root = PENTATONIC_HZ[Math.abs(index) % PENTATONIC_HZ.length];
    this._tone({ freq: root, freqEnd: root * 1.015, type: 'sine', gain: 0.075, attack: 0.008, duration: 0.19 });
    this._tone({ freq: root * 2, type: 'triangle', gain: 0.028, attack: 0.005, duration: 0.13, delay: 0.018 });
  }

  /** Clic tactile obsidienne & or */
  playClick() {
    this._tone({ freq: 680, freqEnd: 340, type: 'triangle', gain: 0.11, attack: 0.002, duration: 0.065 });
    this._tone({ freq: 1360, freqEnd: 980, type: 'sine', gain: 0.055, attack: 0.002, duration: 0.09, delay: 0.01 });
  }

  /** Changement d'onglet runique */
  playTab() {
    this._tone({ freq: 540, freqEnd: 810, type: 'sine', gain: 0.085, attack: 0.004, duration: 0.11 });
    this._tone({ freq: 1080, type: 'triangle', gain: 0.035, attack: 0.004, duration: 0.13, delay: 0.025 });
  }

  /** Ouverture d'une modale de bâtiment */
  playModalOpen() {
    this._tone({ freq: 392.0, type: 'sine', gain: 0.09, attack: 0.01, duration: 0.28 });
    this._tone({ freq: 587.33, type: 'sine', gain: 0.08, attack: 0.012, duration: 0.3, delay: 0.045 });
    this._tone({ freq: 783.99, type: 'triangle', gain: 0.06, attack: 0.015, duration: 0.34, delay: 0.09 });
  }

  /** Fermeture d'une modale */
  playModalClose() {
    this._tone({ freq: 587.33, freqEnd: 330, type: 'sine', gain: 0.075, attack: 0.005, duration: 0.16 });
  }

  /** Fanfare d'invocation Gacha */
  playSummon(isLegendary = false) {
    const notes = isLegendary
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
      : [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      this._tone({
        freq: f,
        type: idx === notes.length - 1 ? 'triangle' : 'sine',
        gain: isLegendary ? 0.11 : 0.085,
        attack: 0.008,
        duration: 0.28 + idx * 0.05,
        delay: idx * 0.06,
      });
    });
  }

  /** Coup de marteau runique à la Forge */
  playForge(success = true) {
    this._tone({ freq: 240, freqEnd: 110, type: 'sawtooth', gain: 0.075, attack: 0.002, duration: 0.11 });
    if (success) {
      this._tone({ freq: 880, freqEnd: 1320, type: 'sine', gain: 0.09, attack: 0.005, duration: 0.26, delay: 0.05 });
      this._tone({ freq: 1760, type: 'triangle', gain: 0.045, attack: 0.005, duration: 0.24, delay: 0.09 });
    } else {
      this._tone({ freq: 290, freqEnd: 185, type: 'triangle', gain: 0.08, attack: 0.005, duration: 0.22, delay: 0.05 });
    }
  }

  /** Victoire en Combat / Colisée */
  playVictory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this._tone({ freq: f, type: 'triangle', gain: 0.085, attack: 0.006, duration: 0.24, delay: i * 0.055 });
    });
  }

  /** Tintement léger de devise */
  playCoin() {
    this._tone({ freq: 1174.66, freqEnd: 1567.98, type: 'sine', gain: 0.05, attack: 0.003, duration: 0.1 });
  }
}
