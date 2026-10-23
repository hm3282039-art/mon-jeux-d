import type { HeroId } from './rig'

export type UltimateSound =
  | 'trigger'
  | 'charge'
  | 'step'
  | 'leap'
  | 'aerial'
  | 'dive'
  | 'impact'
  | 'roar'
  | 'land'
  | 'recover'
  | 'return'

/** Original procedural score and sound design: no external audio assets. */
export class ZenithAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private score: GainNode | null = null
  private sustained: OscillatorNode[] = []
  private muted = false
  private hero: HeroId = 'kaelis'

  async start(hero: HeroId = 'kaelis') {
    this.hero = hero
    this.stopScore()
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 0.7
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
    const now = this.context.currentTime
    this.score = this.context.createGain()
    this.score.gain.setValueAtTime(0.0001, now)
    this.score.gain.exponentialRampToValueAtTime(0.12, now + 0.5)
    this.score.connect(this.master!)

    // A slow, original suspended chord under the action.
    const chord = this.hero === 'kaelis' ? [55, 82.41, 110, 164.81] : [61.74, 92.5, 123.47, 185]
    chord.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator()
      const gain = this.context!.createGain()
      const filter = this.context!.createBiquadFilter()
      oscillator.type = index < 2 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      oscillator.detune.value = index % 2 ? 4 : -4
      filter.type = 'lowpass'
      filter.frequency.value = 520 + index * 160
      gain.gain.value = index < 2 ? 0.18 : 0.07
      oscillator.connect(filter)
      filter.connect(gain)
      gain.connect(this.score!)
      oscillator.start(now)
      this.sustained.push(oscillator)
    })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.context.currentTime, 0.025)
    }
  }

  async setPaused(paused: boolean) {
    if (!this.context) return
    if (paused && this.context.state === 'running') await this.context.suspend()
    if (!paused && this.context.state === 'suspended') await this.context.resume()
  }

  event(sound: UltimateSound) {
    if (!this.context || !this.master || this.context.state !== 'running') return
    switch (sound) {
      case 'trigger':
        this.tone(92, 0.42, 'sine', 0.25, 46)
        this.tone(440, 0.18, 'triangle', 0.07, 660)
        break
      case 'charge':
        ;[330, 495, 660, 990].forEach((frequency, index) => {
          this.tone(frequency, 0.5, 'sine', 0.055, frequency * 1.5, index * 0.07)
        })
        this.noise(0.65, 1800, 0.06, 5200)
        break
      case 'step':
        this.noise(0.09, 240, 0.12, 900)
        this.tone(105, 0.08, 'sine', 0.07, 72)
        break
      case 'leap':
        this.noise(0.42, 900, 0.11, 4200)
        this.tone(180, 0.35, 'triangle', 0.08, 520)
        break
      case 'aerial':
        const notes = this.hero === 'kaelis' ? [220, 277.18, 329.63, 440] : [246.94, 311.13, 369.99, 493.88]
        notes.forEach((frequency, index) => {
          this.tone(frequency, 0.9, index === 0 ? 'triangle' : 'sine', 0.065, frequency * 1.01, index * 0.025)
        })
        break
      case 'dive':
        this.noise(0.8, 5000, 0.13, 500)
        this.tone(620, 0.8, 'sawtooth', 0.045, 95)
        break
      case 'impact':
        this.tone(74, 0.85, 'sine', 0.52, 30)
        this.tone(148, 0.35, 'square', 0.11, 52)
        this.noise(0.75, 3800, 0.34, 160)
        ;[1240, 1860, 2480].forEach((frequency, index) => {
          this.tone(frequency, 0.4, 'sine', 0.045, frequency * 0.55, index * 0.012)
        })
        break
      case 'roar':
        this.tone(96, 0.82, 'sawtooth', 0.12, 43)
        this.tone(143, 0.64, 'square', 0.045, 61, 0.035)
        this.noise(0.72, 620, 0.12, 145)
        break
      case 'land':
        this.noise(0.2, 420, 0.16, 120)
        this.tone(82, 0.24, 'sine', 0.16, 45)
        break
      case 'recover':
        this.tone(220, 0.5, 'triangle', 0.07, 440)
        this.tone(660, 0.6, 'sine', 0.04, 880, 0.08)
        break
      case 'return':
        ;[329.63, 440, 554.37].forEach((frequency, index) => {
          this.tone(frequency, 0.65, 'sine', 0.04, frequency, index * 0.08)
        })
        break
    }
  }

  finish() {
    if (!this.context || !this.score) return
    const now = this.context.currentTime
    this.score.gain.cancelScheduledValues(now)
    this.score.gain.setTargetAtTime(0.0001, now, 0.18)
    const oldNodes = this.sustained
    this.sustained = []
    window.setTimeout(() => oldNodes.forEach(node => {
      try { node.stop() } catch { /* already stopped */ }
    }), 900)
  }

  destroy() {
    this.stopScore()
    if (this.context) void this.context.close()
    this.context = null
    this.master = null
  }

  private stopScore() {
    this.sustained.forEach(node => {
      try { node.stop() } catch { /* already stopped */ }
    })
    this.sustained = []
    this.score = null
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFrequency: number,
    delay = 0,
  ) {
    if (!this.context || !this.master) return
    const now = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.025, duration * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  private noise(duration: number, startFrequency: number, volume: number, endFrequency: number) {
    if (!this.context || !this.master) return
    const sampleCount = Math.ceil(this.context.sampleRate * duration)
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < sampleCount; index += 1) data[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    source.buffer = buffer
    filter.type = 'bandpass'
    filter.Q.value = 0.65
    filter.frequency.setValueAtTime(startFrequency, now)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start(now)
  }
}
