import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  Flame,
  Gauge,
  Heart,
  MoonStar,
  Orbit,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Sun,
  Swords,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const numberFormat = new Intl.NumberFormat('fr-FR')
const TARGET_MAX_HP = 86400

type HeroId = 'kaelis' | 'nyxara'

type Skill = {
  id: string
  name: string
  description: string
  damage: number
  cooldown: number
  energy: number
  status: string
  icon: LucideIcon
}

type CinematicShot = {
  at: number
  label: string
  line: string
}

type Hero = {
  id: HeroId
  name: string
  title: string
  element: string
  role: string
  image: string
  poster: string
  video: string
  power: string
  stats: { hp: string; atk: string; def: string; speed: string }
  passive: { name: string; description: string }
  skills: Skill[]
  ultimate: { name: string; damage: number; description: string }
  shots: CinematicShot[]
}

const HEROES: Record<HeroId, Hero> = {
  kaelis: {
    id: 'kaelis',
    name: 'Kaelis',
    title: 'La Lame de l’Aube',
    element: 'Lumière',
    role: 'Guerrier · Feu sacré',
    image: 'assets/heroes/kaelis-portrait.webp',
    poster: 'assets/heroes/kaelis-ult-poster.webp',
    video: 'assets/heroes/kaelis-ultimate.mp4',
    power: '32 840',
    stats: { hp: '18 420', atk: '4 860', def: '1 240', speed: '112' },
    passive: { name: 'Serment du Phénix', description: 'Après trois capacités, la prochaine attaque inflige un coup critique garanti.' },
    skills: [
      { id: 'kaelis-slash', name: 'Entaille solaire', description: 'Une lame de feu sacré qui applique Brûlure pendant 3 tours.', damage: 2840, cooldown: 0, energy: 20, status: 'Brûlure · 3 tours', icon: Flame },
      { id: 'kaelis-rush', name: 'Charge du Zénith', description: 'Une percussion ascensionnelle qui ignore 30 % de la défense.', damage: 5120, cooldown: 3, energy: 25, status: 'Fracas solaire', icon: Swords },
      { id: 'kaelis-judgment', name: 'Jugement du Phénix', description: 'Le phénix frappe la cible et réduit sa défense pendant 2 tours.', damage: 7890, cooldown: 5, energy: 35, status: 'Brise-déf. · 2 tours', icon: Sun },
    ],
    ultimate: { name: 'Aube Incarnée', damage: 32600, description: 'Kaelis invoque les ailes du phénix et abat le soleil sur sa cible.' },
    shots: [
      { at: 0, label: 'I · LE SERMENT S’ÉVEILLE', line: '« Le ciel se souvient de mon serment. »' },
      { at: 2, label: 'II · L’ENVOL DU PHÉNIX', line: '« Aucune ombre ne survit à l’aube. »' },
      { at: 4, label: 'III · AUBE INCARNÉE', line: '« Brille avec moi ! »' },
      { at: 6, label: 'IV · APRÈS L’IMPACT', line: 'Aube Incarnée' },
    ],
  },
  nyxara: {
    id: 'nyxara',
    name: 'Nyxara',
    title: 'L’Oracle du Néant',
    element: 'Cosmos',
    role: 'Mage · Contrôle stellaire',
    image: 'assets/heroes/nyxara-portrait.webp',
    poster: 'assets/heroes/nyxara-ult-poster.webp',
    video: 'assets/heroes/nyxara-ultimate.mp4',
    power: '33 120',
    stats: { hp: '15 980', atk: '5 140', def: '980', speed: '108' },
    passive: { name: 'Cartographie du Néant', description: 'Chaque effet appliqué augmente de 8 % les dégâts de la capacité suivante.' },
    skills: [
      { id: 'nyxara-star', name: 'Éclat stellaire', description: 'Une étoile filante qui marque la cible dans la carte céleste.', damage: 2670, cooldown: 0, energy: 20, status: 'Marque astrale', icon: Sparkles },
      { id: 'nyxara-orbit', name: 'Chaîne orbitale', description: 'Les anneaux célestes entravent la cible et réduisent sa vitesse.', damage: 4980, cooldown: 3, energy: 25, status: 'Lenteur · 2 tours', icon: Orbit },
      { id: 'nyxara-collapse', name: 'Effondrement astral', description: 'Une singularité fracture la défense et aspire les éclats d’obsidienne.', damage: 7640, cooldown: 5, energy: 35, status: 'Brise-déf. · 2 tours', icon: MoonStar },
    ],
    ultimate: { name: 'Requiem des Constellations', damage: 33400, description: 'Nyxara libère le serpent astral et précipite les constellations sur l’arène.' },
    shots: [
      { at: 0, label: 'I · LA CARTE CÉLESTE', line: '« Chaque étoile connaît déjà ta fin. »' },
      { at: 2, label: 'II · LE SERPENT ASTRAL', line: '« Que le ciel courbe sa trajectoire. »' },
      { at: 4, label: 'III · REQUIEM DES CONSTELLATIONS', line: '« Tombez, étoiles. »' },
      { at: 6, label: 'IV · SILENCE COSMIQUE', line: 'Requiem des Constellations' },
    ],
  },
}

type Cast = {
  id: number
  heroId: HeroId
  skillIndex: number
  name: string
}

type FloatingDamage = {
  id: number
  value: number
  critical: boolean
}

function TrainingGolem({ hit, destroyed }: { hit: boolean; destroyed: boolean }) {
  return (
    <div className={`training-golem ${hit ? 'hit' : ''} ${destroyed ? 'destroyed' : ''}`}>
      <svg viewBox="0 0 190 220" role="img" aria-label="Golem d’entraînement en obsidienne">
        <defs>
          <linearGradient id="obsidian" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#39425c" />
            <stop offset=".5" stopColor="#171d33" />
            <stop offset="1" stopColor="#090e20" />
          </linearGradient>
          <radialGradient id="core">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".22" stopColor="#8fffff" />
            <stop offset=".62" stopColor="#24b9e8" />
            <stop offset="1" stopColor="#245078" />
          </radialGradient>
        </defs>
        <g stroke="#596581" strokeWidth="2" strokeLinejoin="round">
          <path d="m95 8 30 12 9 33-19 20H75L56 53l9-33L95 8Z" fill="url(#obsidian)" />
          <path d="m65 69 30-9 30 9 25 31-13 68-23 27H76l-23-27-13-68 25-31Z" fill="url(#obsidian)" />
          <path d="m43 82-25 7-13 44 17 46 25-8 5-55-9-34ZM147 82l25 7 13 44-17 46-25-8-5-55 9-34Z" fill="url(#obsidian)" />
          <path d="m72 184-17 15-7 17h45l2-24-23-8ZM118 184l17 15 7 17H97l-2-24 23-8Z" fill="url(#obsidian)" />
          <path d="m74 36 14-5-5 15H69l5-10ZM116 36l-14-5 5 15h14l-5-10Z" fill="#8ffaff" stroke="none" />
          <path d="m95 89 26 23-9 42-17 17-17-17-9-42 26-23Z" fill="#102c48" stroke="#4acfe8" />
          <path d="m95 100 16 16-6 29-10 11-10-11-6-29 16-16Z" fill="url(#core)" stroke="#a9ffff" />
          <path d="m57 104-18 8 7 24 18-6-7-26ZM133 104l18 8-7 24-18-6 7-26Z" fill="#24304a" />
        </g>
      </svg>
      <i className="golem-shadow" />
    </div>
  )
}

export default function HeroLab() {
  const [heroId, setHeroId] = useState<HeroId>('kaelis')
  const [targetHp, setTargetHp] = useState(TARGET_MAX_HP)
  const [energy, setEnergy] = useState(40)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [cast, setCast] = useState<Cast | null>(null)
  const [floatingDamage, setFloatingDamage] = useState<FloatingDamage | null>(null)
  const [targetStatus, setTargetStatus] = useState('Aucun effet')
  const [combatLog, setCombatLog] = useState<string[]>(['Cible d’entraînement initialisée.'])
  const [soundOn, setSoundOn] = useState(true)
  const [cinemaOpen, setCinemaOpen] = useState(false)
  const [cinemaReady, setCinemaReady] = useState(false)
  const [cinemaEnded, setCinemaEnded] = useState(false)
  const [cinemaError, setCinemaError] = useState(false)
  const [needsPlay, setNeedsPlay] = useState(false)
  const [shotIndex, setShotIndex] = useState(0)
  const [cinemaProgress, setCinemaProgress] = useState(0)
  const [lastUltimateDamage, setLastUltimateDamage] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const serialRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ultimateAppliedRef = useRef(false)
  const hero = HEROES[heroId]

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  useEffect(() => {
    const active = Object.values(cooldowns).some((value) => value > 0)
    if (!active) return
    const timer = window.setTimeout(() => {
      setCooldowns((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, Math.max(0, value - 1)])))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [cooldowns])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    void audioContextRef.current?.close()
  }, [])

  useEffect(() => {
    if (!cinemaOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCinema(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!cinemaOpen || !videoRef.current) return
    const video = videoRef.current
    video.currentTime = 0
    video.play().catch(() => setNeedsPlay(true))
  }, [cinemaOpen, heroId])

  const playCastSound = (index: number, selectedHero: HeroId) => {
    if (!soundOn) return
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      void context.resume()
      const now = context.currentTime
      const gain = context.createGain()
      const oscillator = context.createOscillator()
      const overtone = context.createOscillator()
      const overtoneGain = context.createGain()
      const base = selectedHero === 'kaelis' ? 155 + index * 45 : 260 + index * 70
      oscillator.type = selectedHero === 'kaelis' ? 'sawtooth' : 'sine'
      overtone.type = 'sine'
      oscillator.frequency.setValueAtTime(base, now)
      oscillator.frequency.exponentialRampToValueAtTime(base * 2.8, now + 0.22)
      overtone.frequency.setValueAtTime(base * 2, now)
      overtone.frequency.exponentialRampToValueAtTime(base * 4, now + 0.3)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
      overtoneGain.gain.setValueAtTime(0.025, now)
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
      oscillator.connect(gain).connect(context.destination)
      overtone.connect(overtoneGain).connect(context.destination)
      oscillator.start(now)
      overtone.start(now)
      oscillator.stop(now + 0.44)
      overtone.stop(now + 0.44)
    } catch {
      // Visual testing remains available if WebAudio is not supported.
    }
  }

  const resetBattle = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
    setTargetHp(TARGET_MAX_HP)
    setEnergy(40)
    setCooldowns({})
    setCast(null)
    setFloatingDamage(null)
    setTargetStatus('Aucun effet')
    setCombatLog(['Nouvelle cible d’entraînement initialisée.'])
  }

  const selectHero = (id: HeroId) => {
    if (id === heroId || cast) return
    setHeroId(id)
    resetBattle()
  }

  const castSkill = (skill: Skill, skillIndex: number) => {
    if (cast || targetHp <= 0 || (cooldowns[skill.id] ?? 0) > 0) return
    const id = ++serialRef.current
    const critical = id % 3 === 0
    const damage = Math.round(skill.damage * (critical ? 1.5 : 1))
    setCast({ id, heroId, skillIndex, name: skill.name })
    setEnergy((value) => Math.min(100, value + skill.energy))
    if (skill.cooldown) setCooldowns((current) => ({ ...current, [skill.id]: skill.cooldown }))
    playCastSound(skillIndex, heroId)

    later(() => {
      setTargetHp((value) => Math.max(0, value - damage))
      setFloatingDamage({ id, value: damage, critical })
      setTargetStatus(skill.status)
      setCombatLog((current) => [`${skill.name} · ${numberFormat.format(damage)} dégâts${critical ? ' critiques' : ''}.`, ...current].slice(0, 3))
    }, 470)
    later(() => setCast(null), 920)
    later(() => setFloatingDamage(null), 1450)
  }

  const applyUltimate = () => {
    if (ultimateAppliedRef.current) return
    ultimateAppliedRef.current = true
    const damage = Math.min(hero.ultimate.damage, targetHp)
    setLastUltimateDamage(damage)
    setTargetHp((value) => Math.max(0, value - hero.ultimate.damage))
    setEnergy(0)
    setFloatingDamage({ id: ++serialRef.current, value: damage, critical: true })
    setTargetStatus(heroId === 'kaelis' ? 'Incinération céleste' : 'Oblitération astrale')
    setCombatLog((current) => [`${hero.ultimate.name} · ${numberFormat.format(damage)} dégâts.`, ...current].slice(0, 3))
    later(() => setFloatingDamage(null), 1450)
  }

  const openCinema = () => {
    if (cast) return
    ultimateAppliedRef.current = false
    setCinemaOpen(true)
    setCinemaReady(false)
    setCinemaEnded(false)
    setCinemaError(false)
    setNeedsPlay(false)
    setShotIndex(0)
    setCinemaProgress(0)
    setLastUltimateDamage(0)
  }

  const closeCinema = (applyDamage: boolean) => {
    if (applyDamage) applyUltimate()
    videoRef.current?.pause()
    setCinemaOpen(false)
    setCinemaEnded(false)
    setNeedsPlay(false)
    if (applyDamage) {
      setBanner(`${hero.ultimate.name} · ${numberFormat.format(Math.min(hero.ultimate.damage, targetHp))} dégâts`)
      later(() => setBanner(null), 3200)
    }
  }

  const replayCinema = () => {
    const video = videoRef.current
    if (!video) return
    ultimateAppliedRef.current = false
    setCinemaEnded(false)
    setCinemaProgress(0)
    setShotIndex(0)
    video.currentTime = 0
    video.play().catch(() => setNeedsPlay(true))
  }

  const onVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCinemaProgress(Math.min(1, video.currentTime / 8))
    const nextShot = Math.min(3, Math.floor(video.currentTime / 2))
    setShotIndex(nextShot)
  }

  const hpPercent = (targetHp / TARGET_MAX_HP) * 100

  return (
    <div className={`hero-lab theme-${heroId}`}>
      <header className="lab-header">
        <a className="back-hub" href="./index.html"><ArrowLeft size={17} /><span>Retour à la cité</span></a>
        <div className="lab-brand"><span>ASTRÉA</span><i /><strong>LABORATOIRE DES HÉROS</strong><small>PAGE TEST 02</small></div>
        <div className="lab-header-actions">
          <span className="protocol-status"><i /> Protocole libre</span>
          <button type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}>{soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
        </div>
      </header>

      <div className="lab-layout">
        <aside className="hero-roster" aria-label="Sélection du héros">
          <div className="panel-kicker"><span>HÉROS DISPONIBLES</span><strong>02</strong></div>
          <div className="roster-cards">
            {Object.values(HEROES).map((item) => (
              <button type="button" key={item.id} className={`roster-card ${item.id} ${heroId === item.id ? 'active' : ''}`} onClick={() => selectHero(item.id)} disabled={Boolean(cast)}>
                <span className="roster-portrait"><img src={item.image} alt="" /></span>
                <span className="roster-copy"><small>{item.element} · SSR</small><strong>{item.name}</strong><i>{item.title}</i></span>
                <span className="roster-check">{heroId === item.id ? <Check size={13} /> : <ChevronRight size={14} />}</span>
              </button>
            ))}
          </div>
          <div className="test-protocol">
            <span><Crosshair size={17} /></span>
            <small>PROTOCOLE DE TEST</small>
            <strong>Capacités & cinématiques</strong>
            <p>Testez les trois actives, leurs cooldowns et l’ultime sans restriction de charge.</p>
            <i>Version isolée · non intégrée au hub</i>
          </div>
        </aside>

        <main className="hero-stage">
          <div className="stage-heading">
            <div><small>FICHE DU HÉROS · NIVEAU 60</small><h1>{hero.name}<span>{hero.title}</span></h1></div>
            <div className="hero-power"><Activity size={15} /><span><small>PUISSANCE</small><strong>{hero.power}</strong></span></div>
          </div>

          <div className={`hero-art-frame ${heroId}`} key={heroId}>
            <img src={hero.image} alt={`${hero.name}, ${hero.title}`} fetchPriority="high" />
            <span className="hero-element">{hero.id === 'kaelis' ? <Sun size={14} /> : <MoonStar size={14} />}{hero.element}</span>
            <span className="hero-rarity">SSR</span>
            <div className="hero-art-caption"><span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} fill="currentColor" />)}</span><small>{hero.role}</small></div>
          </div>

          <section className="target-panel" aria-label="Cible d’entraînement">
            <div className="target-heading"><span><Crosshair size={14} /> CIBLE D’ENTRAÎNEMENT</span><strong>GOLEM · NV. 60</strong></div>
            <div className="target-hp"><span><i style={{ width: `${hpPercent}%` }} /></span><strong>{numberFormat.format(targetHp)} <small>/ {numberFormat.format(TARGET_MAX_HP)}</small></strong></div>
            <div className="golem-wrap" key={cast?.id ?? (targetHp === 0 ? 'destroyed' : 'idle')}>
              <TrainingGolem hit={Boolean(cast)} destroyed={targetHp === 0} />
            </div>
            <div className="target-status"><small>EFFET ACTIF</small><strong>{targetHp === 0 ? 'Cible détruite' : targetStatus}</strong></div>
            <button type="button" className="reset-target" onClick={resetBattle}><RotateCcw size={13} /> Réinitialiser</button>
          </section>

          {cast ? (
            <div className={`skill-effects ${cast.heroId} skill-${cast.skillIndex + 1}`} key={`cast-${cast.id}`} aria-hidden="true">
              <span className="skill-projectile"><i /><b /></span>
              <span className="impact-burst">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--angle': `${index * (360 / 14)}deg` } as CSSProperties} />)}</span>
              <span className="impact-ring" />
            </div>
          ) : null}
          {floatingDamage ? <div className={`floating-damage ${floatingDamage.critical ? 'critical' : ''}`} key={`damage-${floatingDamage.id}`}><small>{floatingDamage.critical ? 'CRITIQUE' : 'DÉGÂTS'}</small><strong>-{numberFormat.format(floatingDamage.value)}</strong></div> : null}

          <div className="stage-log">
            <span className="energy-orb"><Zap size={15} /></span>
            <div><small>CHARGE D’ULTIME · LIBRE EN MODE TEST</small><span className="energy-track"><i style={{ width: `${energy}%` }} /></span></div>
            <strong>{energy}<small>%</small></strong>
          </div>
          <div className="combat-log">{combatLog.map((entry, index) => <span key={`${entry}-${index}`} className={index === 0 ? 'latest' : ''}><i />{entry}</span>)}</div>
        </main>

        <aside className="skills-panel">
          <div className="panel-kicker"><span>COMPÉTENCES</span><strong>03 + ULT</strong></div>
          <div className="hero-stats">
            <span><Heart size={13} /><small>PV</small><strong>{hero.stats.hp}</strong></span>
            <span><Swords size={13} /><small>ATQ</small><strong>{hero.stats.atk}</strong></span>
            <span><Shield size={13} /><small>DÉF</small><strong>{hero.stats.def}</strong></span>
            <span><Gauge size={13} /><small>VIT</small><strong>{hero.stats.speed}</strong></span>
          </div>

          <div className="skill-list">
            {hero.skills.map((skill, index) => {
              const Icon = skill.icon
              const cooldown = cooldowns[skill.id] ?? 0
              const disabled = Boolean(cast) || targetHp <= 0 || cooldown > 0
              return (
                <button type="button" className={`skill-card ${cast?.name === skill.name ? 'casting' : ''}`} key={skill.id} onClick={() => castSkill(skill, index)} disabled={disabled}>
                  <span className="skill-icon"><Icon size={23} />{cooldown > 0 ? <i>{cooldown}</i> : <b>{index + 1}</b>}</span>
                  <span className="skill-copy"><span><strong>{skill.name}</strong><small>{skill.cooldown ? `${skill.cooldown} tours` : 'Sans cooldown'}</small></span><p>{skill.description}</p><span className="skill-numbers"><i>{numberFormat.format(skill.damage)} dégâts</i><i>+{skill.energy}<Zap size={10} /></i></span></span>
                  <span className="skill-play">{cooldown > 0 ? <Clock3 size={15} /> : <Play size={15} />}</span>
                </button>
              )
            })}
          </div>

          <button type="button" className="ultimate-card" onClick={openCinema} disabled={Boolean(cast)}>
            <span className="ultimate-icon">{heroId === 'kaelis' ? <Sun size={29} /> : <MoonStar size={29} />}<i /></span>
            <span className="ultimate-copy"><small>ULTIME · CINÉMATIQUE 8 SECONDES</small><strong>{hero.ultimate.name}</strong><p>{hero.ultimate.description}</p><span><i>{numberFormat.format(hero.ultimate.damage)} dégâts</i><i>60 FPS · AUDIO</i></span></span>
            <span className="ultimate-play"><Play size={20} fill="currentColor" /></span>
          </button>

          <div className="passive-card"><Sparkles size={16} /><span><small>PASSIF · {hero.passive.name}</small><p>{hero.passive.description}</p></span></div>
        </aside>
      </div>

      <footer className="lab-footer"><span><i /> Moteur de combat visuel</span><span>Vidéos 960 × 540 · 60 FPS · audio stéréo</span><span>ESC pour passer l’ultime</span></footer>

      {banner ? <div className="battle-banner" role="status"><Sparkles size={16} />{banner}</div> : null}

      {cinemaOpen ? (
        <div
          className={`ultimate-cinema ${heroId}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Cinématique : ${hero.ultimate.name}`}
          style={{ '--cinema-poster': `url("${hero.poster}")` } as CSSProperties}
        >
          <video
            ref={videoRef}
            className="cinema-video"
            poster={hero.poster}
            muted={!soundOn}
            playsInline
            autoPlay
            preload="auto"
            onCanPlay={() => setCinemaReady(true)}
            onPlay={() => setNeedsPlay(false)}
            onTimeUpdate={onVideoTimeUpdate}
            onEnded={() => { applyUltimate(); setCinemaEnded(true) }}
            onError={() => { setCinemaError(true); setCinemaReady(true) }}
          >
            <source src={hero.video} type="video/mp4" />
          </video>
          <div className="cinema-vignette" aria-hidden="true" />
          <div className="cinema-bars" aria-hidden="true"><i /><i /></div>
          <header className="cinema-header">
            <div><small>{hero.name.toUpperCase()} · ULTIME</small><strong>{hero.ultimate.name}</strong></div>
            <span className="cinema-format">60 FPS <i /> AUDIO STÉRÉO</span>
            <div className="cinema-controls">
              <button type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}>{soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
              <button type="button" className="skip-cinema" onClick={() => closeCinema(true)}>Passer <X size={16} /></button>
            </div>
          </header>

          {!cinemaEnded && !cinemaError ? <div className="cinema-caption" key={shotIndex}><small>{hero.shots[shotIndex].label}</small><strong>{hero.shots[shotIndex].line}</strong></div> : null}
          {!cinemaReady && !cinemaError ? <div className="cinema-loading"><span><i /><i /><i /></span><strong>Synchronisation du Nexus</strong><small>Chargement de la cinématique</small></div> : null}
          {needsPlay && !cinemaEnded ? <button type="button" className="cinema-resume" onClick={() => videoRef.current?.play().catch(() => setCinemaError(true))}><Play size={24} fill="currentColor" /> Lancer la cinématique</button> : null}
          {cinemaError ? <div className="cinema-end-card"><small>ERREUR DE LECTURE</small><h2>La vidéo n’a pas pu être chargée.</h2><p>Le reste du laboratoire reste disponible.</p><button type="button" onClick={() => closeCinema(false)}>Retour au test</button></div> : null}
          {cinemaEnded ? (
            <div className="cinema-end-card">
              <small>ULTIME TERMINÉ</small>
              <h2>{hero.ultimate.name}</h2>
              <span><strong>{numberFormat.format(lastUltimateDamage)}</strong><small>DÉGÂTS INFLIGÉS</small></span>
              <div><button type="button" onClick={replayCinema}><RotateCcw size={16} /> Rejouer</button><button type="button" onClick={() => closeCinema(false)}>Retour au test <ChevronRight size={16} /></button></div>
            </div>
          ) : null}
          <div className="cinema-progress"><span><i style={{ width: `${cinemaProgress * 100}%` }} /></span><small>{Math.min(8, Math.floor(cinemaProgress * 8))} / 8 s</small></div>
        </div>
      ) : null}
    </div>
  )
}
