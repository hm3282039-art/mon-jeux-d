import { ZenithAudio } from './audio'
import type { UltimateSound } from './audio'
import { clamp, smooth } from './math'
import { HERO_PRESENTATION } from './rig'
import type { HeroId } from './rig'
import { mapShortTime, shotAt, ZenithRenderer } from './renderer'
import type { UltimateMode } from './renderer'

export const TARGET_MAX_HP = 86400

export type EnginePhase = 'idle' | 'playing' | 'paused' | 'complete'
export type GameplayEvent = {
  id: number
  type: 'cast' | 'impact' | 'skip' | 'complete' | 'reset'
  text: string
  time: number
}

export type EngineSnapshot = {
  phase: EnginePhase
  mode: UltimateMode
  hero: HeroId
  damage: number
  time: number
  cinematicTime: number
  duration: number
  impactAt: number
  impactApplied: boolean
  damageEvents: number
  targetHp: number
  displayedHp: number
  energy: number
  status: string
  fps: number
  battleTime: number
  battleSuspended: boolean
  rate: number
  muted: boolean
  shotIndex: number
  shotName: string
  shotDetail: string
}

const MODE_SETTINGS: Record<UltimateMode, { duration: number; impactAt: number; label: string }> = {
  full: { duration: 8, impactAt: 4.5, label: 'Cinématique complète' },
  short: { duration: 2.4, impactAt: 1.35, label: 'Version courte' },
  instant: { duration: 0.7, impactAt: 0.32, label: 'Sans cinématique' },
}

const SOUND_EVENTS: Record<UltimateMode, Array<{ at: number; sound: UltimateSound }>> = {
  full: [
    { at: 0, sound: 'trigger' }, { at: 0.58, sound: 'charge' },
    { at: 1.47, sound: 'step' }, { at: 1.72, sound: 'step' },
    { at: 1.96, sound: 'leap' }, { at: 2.35, sound: 'aerial' },
    { at: 3.45, sound: 'dive' }, { at: 4.5, sound: 'impact' }, { at: 4.72, sound: 'roar' },
    { at: 5.12, sound: 'land' }, { at: 5.72, sound: 'recover' }, { at: 6.78, sound: 'return' },
  ],
  short: [
    { at: 0, sound: 'trigger' }, { at: 0.18, sound: 'charge' },
    { at: 0.64, sound: 'leap' }, { at: 0.87, sound: 'aerial' },
    { at: 1.07, sound: 'dive' }, { at: 1.35, sound: 'impact' }, { at: 1.42, sound: 'roar' },
    { at: 1.63, sound: 'land' }, { at: 1.96, sound: 'return' },
  ],
  instant: [
    { at: 0, sound: 'trigger' }, { at: 0.1, sound: 'dive' },
    { at: 0.32, sound: 'impact' }, { at: 0.56, sound: 'land' },
  ],
}

export class ZenithEngine {
  private readonly renderer: ZenithRenderer
  private readonly audio = new ZenithAudio()
  private animationFrame = 0
  private lastFrame = performance.now()
  private lastSnapshot = 0
  private ambient = 0
  private battleTime = 0
  private phase: EnginePhase = 'idle'
  private mode: UltimateMode = 'full'
  private hero: HeroId = 'kaelis'
  private time = 0
  private impactApplied = false
  private impactRealTime = 0
  private damageEvents = 0
  private targetHp = TARGET_MAX_HP
  private displayedHp = TARGET_MAX_HP
  private energy = 100
  private status = 'Aucun effet'
  private rate = 1
  private muted = false
  private fps = 60
  private fpsFrames = 0
  private fpsElapsed = 0
  private eventId = 0
  private firedSounds = new Set<string>()

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onSnapshot: (snapshot: EngineSnapshot) => void,
    private readonly onGameplayEvent: (event: GameplayEvent) => void,
  ) {
    this.renderer = new ZenithRenderer(canvas)
    this.animationFrame = requestAnimationFrame(this.frame)
    this.notify()
  }

  play(mode = this.mode, hero = this.hero) {
    if (this.phase === 'playing') return
    this.mode = mode
    this.hero = hero
    this.phase = 'playing'
    this.time = 0
    this.impactApplied = false
    this.impactRealTime = 0
    this.damageEvents = 0
    this.targetHp = TARGET_MAX_HP
    this.displayedHp = TARGET_MAX_HP
    this.energy = 0
    this.status = 'Aucun effet'
    this.firedSounds = new Set(['0:trigger'])
    this.lastFrame = performance.now()
    this.emit('cast', `${MODE_SETTINGS[mode].label} · ${HERO_PRESENTATION[this.hero].ultimate}`)
    void this.audio.start(this.hero).then(() => this.audio.event('trigger')).catch(() => {
      // Visuals and gameplay remain functional when WebAudio is unavailable.
    })
    this.notify()
  }

  pause() {
    if (this.phase === 'playing') {
      this.phase = 'paused'
      void this.audio.setPaused(true)
    } else if (this.phase === 'paused') {
      this.phase = 'playing'
      this.lastFrame = performance.now()
      void this.audio.setPaused(false)
    }
    this.notify()
  }

  skip() {
    if (this.phase !== 'playing' && this.phase !== 'paused') return
    if (!this.impactApplied) this.applyImpact()
    this.emit('skip', 'Cinématique passée · état post-impact restauré')
    this.finish()
  }

  reset() {
    this.resetCombatState()
    this.emit('reset', 'Cible et jauge d’ultime réinitialisées')
    this.notify()
  }

  setMode(mode: UltimateMode) {
    if (this.phase === 'playing' || this.phase === 'paused') return
    this.mode = mode
    this.time = 0
    this.notify()
  }

  setHero(hero: HeroId) {
    if (this.phase === 'playing' || this.phase === 'paused' || hero === this.hero) return
    this.hero = hero
    this.resetCombatState()
    this.emit('reset', `${HERO_PRESENTATION[hero].name} est prêt · ${HERO_PRESENTATION[hero].ultimate}`)
    this.notify()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.audio.setMuted(muted)
    this.notify()
  }

  setRate(rate: number) {
    this.rate = rate === 0.5 ? 0.5 : 1
    this.notify()
  }

  /** Deterministic inspection hook used by browser tests. */
  seek(time: number) {
    if (this.phase === 'playing') return
    this.mode = 'full'
    this.phase = 'paused'
    this.time = clamp(time, 0, MODE_SETTINGS.full.duration)
    this.energy = 0
    this.impactApplied = this.time >= MODE_SETTINGS.full.impactAt
    this.damageEvents = this.impactApplied ? 1 : 0
    const damage = HERO_PRESENTATION[this.hero].damage
    this.targetHp = this.impactApplied ? TARGET_MAX_HP - damage : TARGET_MAX_HP
    this.displayedHp = this.impactApplied
      ? Math.round(this.targetHp + damage * (1 - smooth(clamp((this.time - 4.5) / 0.35))))
      : TARGET_MAX_HP
    this.status = this.impactApplied ? HERO_PRESENTATION[this.hero].status : 'Aucun effet'
    this.notify()
  }

  getSnapshot(): EngineSnapshot {
    const settings = MODE_SETTINGS[this.mode]
    const cinematicTime = this.getCinematicTime()
    const shot = shotAt(cinematicTime, this.hero)
    return {
      phase: this.phase,
      mode: this.mode,
      hero: this.hero,
      damage: HERO_PRESENTATION[this.hero].damage,
      time: this.time,
      cinematicTime,
      duration: settings.duration,
      impactAt: settings.impactAt,
      impactApplied: this.impactApplied,
      damageEvents: this.damageEvents,
      targetHp: this.targetHp,
      displayedHp: this.displayedHp,
      energy: this.energy,
      status: this.status,
      fps: this.fps,
      battleTime: this.battleTime,
      battleSuspended: this.phase === 'playing' || this.phase === 'paused',
      rate: this.rate,
      muted: this.muted,
      shotIndex: shot.index,
      shotName: this.phase === 'idle' ? 'Arène des échos' : shot.name,
      shotDetail: this.phase === 'idle' ? 'Jauge pleine · ultime prêt' : shot.detail,
    }
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame)
    this.audio.destroy()
  }

  private resetCombatState() {
    this.phase = 'idle'
    this.time = 0
    this.impactApplied = false
    this.damageEvents = 0
    this.targetHp = TARGET_MAX_HP
    this.displayedHp = TARGET_MAX_HP
    this.energy = 100
    this.status = 'Aucun effet'
    this.firedSounds.clear()
    this.audio.finish()
    void this.audio.setPaused(false)
  }

  private frame = (now: number) => {
    const rawDelta = Math.max(0, (now - this.lastFrame) / 1000)
    const delta = Math.min(0.05, rawDelta)
    const sequenceDelta = Math.min(0.25, rawDelta)
    this.lastFrame = now
    this.ambient += delta
    this.fpsFrames += 1
    this.fpsElapsed += rawDelta
    if (this.fpsElapsed >= 0.6) {
      this.fps = Math.round(this.fpsFrames / this.fpsElapsed)
      this.fpsFrames = 0
      this.fpsElapsed = 0
    }

    if (this.phase === 'playing') {
      this.time = Math.min(MODE_SETTINGS[this.mode].duration, this.time + sequenceDelta * this.rate)
      this.updateSounds()
      if (!this.impactApplied && this.time >= MODE_SETTINGS[this.mode].impactAt) this.applyImpact()
      if (this.impactApplied) {
        const drain = smooth(clamp((this.time - this.impactRealTime) / 0.35))
        this.displayedHp = Math.round(TARGET_MAX_HP - HERO_PRESENTATION[this.hero].damage * drain)
      }
      if (this.time >= MODE_SETTINGS[this.mode].duration) this.finish()
    } else if (this.phase === 'idle' || this.phase === 'complete') {
      this.battleTime += sequenceDelta
    }

    this.renderer.render({
      time: this.getCinematicTime(),
      realTime: this.time,
      ambient: this.ambient,
      mode: this.mode,
      hero: this.hero,
      active: this.phase === 'playing' || this.phase === 'paused',
      impactApplied: this.impactApplied,
    })
    if (now - this.lastSnapshot > 70) this.notify()
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  private updateSounds() {
    SOUND_EVENTS[this.mode].forEach(event => {
      if (this.hero === 'nyxara' && event.sound === 'step') return
      const key = `${event.at}:${event.sound}`
      if (this.time >= event.at && !this.firedSounds.has(key)) {
        this.firedSounds.add(key)
        if (event.sound === 'impact') {
          if (this.impactApplied) this.audio.event(event.sound)
        } else {
          this.audio.event(event.sound)
        }
      }
    })
  }

  private applyImpact() {
    if (this.impactApplied) return
    this.impactApplied = true
    this.impactRealTime = this.time
    this.damageEvents += 1
    const presentation = HERO_PRESENTATION[this.hero]
    this.targetHp = Math.max(0, TARGET_MAX_HP - presentation.damage)
    this.status = presentation.status
    this.audio.event('impact')
    this.firedSounds.add(`${MODE_SETTINGS[this.mode].impactAt}:impact`)
    this.emit('impact', `ULT_IMPACT · ${presentation.damage.toLocaleString('fr-FR')} dégâts · ${presentation.status}`)
  }

  private finish() {
    const settings = MODE_SETTINGS[this.mode]
    if (!this.impactApplied) this.applyImpact()
    this.time = settings.duration
    this.displayedHp = this.targetHp
    this.phase = 'complete'
    this.audio.finish()
    void this.audio.setPaused(false)
    this.emit('complete', 'Contrôles restitués · timers de combat repris')
    this.notify()
  }

  private getCinematicTime() {
    if (this.phase === 'idle' || this.phase === 'complete') return 8
    if (this.mode === 'short') return mapShortTime(this.time)
    if (this.mode === 'instant') return this.time
    return this.time
  }

  private emit(type: GameplayEvent['type'], text: string) {
    this.onGameplayEvent({ id: ++this.eventId, type, text, time: this.time })
  }

  private notify() {
    this.lastSnapshot = performance.now()
    this.onSnapshot(this.getSnapshot())
  }
}
