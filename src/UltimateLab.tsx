import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Check,
  ChevronRight,
  CircleGauge,
  Clock3,
  FastForward,
  Focus,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { TARGET_MAX_HP, ULTIMATE_DAMAGE, ZenithEngine } from './ultimate/engine'
import type { EngineSnapshot, GameplayEvent } from './ultimate/engine'
import type { UltimateMode } from './ultimate/renderer'
import { formatTime } from './ultimate/math'

const numberFormat = new Intl.NumberFormat('fr-FR')

const INITIAL_SNAPSHOT: EngineSnapshot = {
  phase: 'idle',
  mode: 'full',
  time: 0,
  cinematicTime: 8,
  duration: 8,
  impactAt: 4.5,
  impactApplied: false,
  damageEvents: 0,
  targetHp: TARGET_MAX_HP,
  displayedHp: TARGET_MAX_HP,
  energy: 100,
  status: 'Aucun effet',
  fps: 60,
  battleTime: 0,
  battleSuspended: false,
  rate: 1,
  muted: false,
  shotIndex: 1,
  shotName: 'Arène du Zénith',
  shotDetail: 'Jauge pleine · ultime prêt',
}

const MODES: Array<{ id: UltimateMode; name: string; duration: string; description: string }> = [
  { id: 'full', name: 'Complète', duration: '8 s', description: 'Les 7 plans' },
  { id: 'short', name: 'Courte', duration: '2,4 s', description: 'Pour les répétitions' },
  { id: 'instant', name: 'Directe', duration: '0,7 s', description: 'Sans cinématique' },
]

const STORYBOARD = [
  ['0,00 – 0,55', 'I', 'L’appel du Nexus', 'Anticipation, appui au sol et lumière retenue.'],
  ['0,55 – 1,35', 'II', 'Le serment s’éveille', 'Gros plan animé, regard et lance cristalline.'],
  ['1,35 – 2,35', 'III', 'L’élan céleste', 'Course, foulées, manteau et envol en traveling.'],
  ['2,35 – 3,45', 'IV', 'Au-dessus du Zénith', 'Rotation aérienne et caméra orbitale.'],
  ['3,45 – 4,50', 'V', 'La percée', 'Piqué accéléré, cible visible et caméra poursuite.'],
  ['4,50 – 5,65', 'VI', 'Impact du Nexus', 'Dégâts uniques, réaction du golem et réception.'],
  ['5,65 – 8,00', 'VII', 'Serment accompli', 'Récupération, caméra et contrôles restitués.'],
]

declare global {
  interface Window {
    __AELION_ULT__?: {
      seek: (time: number) => void
      play: (mode?: UltimateMode) => void
      pause: () => void
      skip: () => void
      reset: () => void
      getState: () => EngineSnapshot
    }
  }
}

export default function UltimateLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ZenithEngine | null>(null)
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT)
  const [events, setEvents] = useState<GameplayEvent[]>([
    { id: 0, type: 'reset', text: 'Arène prête · jauge Nexus chargée à 100 %', time: 0 },
  ])
  const [selectedMode, setSelectedMode] = useState<UltimateMode>('full')
  const [storyboardOpen, setStoryboardOpen] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new ZenithEngine(canvasRef.current, setSnapshot, event => {
      setEvents(current => [...current.slice(-5), event])
    })
    engineRef.current = engine
    window.__AELION_ULT__ = {
      seek: time => engine.seek(time),
      play: mode => engine.play(mode),
      pause: () => engine.pause(),
      skip: () => engine.skip(),
      reset: () => engine.reset(),
      getState: () => engine.getSnapshot(),
    }
    return () => {
      engine.destroy()
      engineRef.current = null
      delete window.__AELION_ULT__
    }
  }, [])

  const active = snapshot.phase === 'playing' || snapshot.phase === 'paused'
  const hpPercent = snapshot.displayedHp / TARGET_MAX_HP * 100
  const progress = snapshot.time / snapshot.duration * 100
  const impactProgress = snapshot.impactAt / snapshot.duration * 100
  const fullHudVisible = !active || snapshot.mode === 'instant' || snapshot.cinematicTime < 0.48 || snapshot.cinematicTime > 6.82

  const start = (mode = selectedMode) => {
    setSelectedMode(mode)
    engineRef.current?.play(mode)
  }

  return (
    <main className="ultimate-lab">
      <div className="lab-ambient lab-ambient-one" />
      <div className="lab-ambient lab-ambient-two" />
      <header className="lab-header">
        <a className="lab-brand" href="./index.html" aria-label="Retour au hub Astréa">
          <span className="brand-sigil"><Sparkles size={19} /></span>
          <span><strong>ASTRÉA</strong><small>LES ÉCHOS DU CIEL</small></span>
        </a>
        <div className="lab-breadcrumb">
          <span>LABORATOIRE DE COMBAT</span><ChevronRight size={14} /><strong>ULTIMES CINÉMA</strong>
        </div>
        <div className="prototype-badge"><i /> PROTOTYPE ISOLÉ · 03</div>
      </header>

      <section className="lab-title-row">
        <div>
          <p className="eyebrow"><Focus size={14} /> ANIMATION TEMPS RÉEL · PERSONNAGE ARTICULÉ</p>
          <h1>Serment du <em>Zénith</em></h1>
          <p>L’ultime cinéma d’Aelion, gardien du Nexus. Chaque mouvement est calculé image par image dans votre navigateur.</p>
        </div>
        <div className="tech-stamps" aria-label="Caractéristiques techniques">
          <span><Activity size={14} /> {snapshot.fps} FPS réels</span>
          <span><CircleGauge size={14} /> Canvas 2D · 60+ Hz</span>
          <span><Check size={14} /> Aucune vidéo</span>
        </div>
      </section>

      <div className="lab-layout">
        <section className="battle-column" aria-label="Zone de test de l’ultime">
          <div className={`battle-frame ${active ? 'is-active' : ''} ${snapshot.impactApplied ? 'has-impact' : ''}`}>
            <canvas ref={canvasRef} className="battle-canvas" aria-label="Aelion affronte un golem dans l’arène céleste" />

            <div className={`battle-hud ${fullHudVisible ? 'is-visible' : ''}`}>
              <div className="combatant hero-combatant">
                <img src="./assets/avatar-aelion.webp" alt="Portrait d’Aelion" />
                <div>
                  <span className="combatant-kicker">NEXUS · NIV. 80</span>
                  <strong>Aelion</strong>
                  <div className="hero-hp-track"><i /></div>
                </div>
              </div>
              <div className="combatant target-combatant">
                <div className="target-heading"><span>GOLEM D’ENTRAÎNEMENT</span><b>{Math.round(hpPercent)} %</b></div>
                <div className="target-hp-track"><i style={{ width: `${hpPercent}%` }} /></div>
                <div className="target-numbers"><strong>{numberFormat.format(snapshot.displayedHp)}</strong><span>/ {numberFormat.format(TARGET_MAX_HP)} PV</span></div>
                <div className={`target-status ${snapshot.impactApplied ? 'is-active' : ''}`}><Shield size={11} /> {snapshot.status}</div>
              </div>
            </div>

            {active && snapshot.mode !== 'instant' && (
              <div className="shot-indicator">
                <span>PLAN {String(snapshot.shotIndex).padStart(2, '0')} / 07</span>
                <strong>{snapshot.shotName}</strong>
              </div>
            )}

            {!active && (
              <button className="stage-play" onClick={() => start()} aria-label="Déclencher Serment du Zénith">
                <span><Play size={24} fill="currentColor" /></span>
                <strong>{snapshot.phase === 'complete' ? 'REJOUER L’ULTIME' : 'DÉCLENCHER L’ULTIME'}</strong>
                <small>Jauge Nexus · 100 / 100</small>
              </button>
            )}

            {active && (
              <div className="cinema-controls">
                <button onClick={() => engineRef.current?.pause()} aria-label={snapshot.phase === 'paused' ? 'Reprendre' : 'Pause'}>
                  {snapshot.phase === 'paused' ? <Play size={17} /> : <Pause size={17} />}
                  <span>{snapshot.phase === 'paused' ? 'Reprendre' : 'Pause'}</span>
                </button>
                <button onClick={() => engineRef.current?.skip()}><FastForward size={17} /><span>Passer</span></button>
                <button onClick={() => engineRef.current?.setMuted(!snapshot.muted)} aria-label={snapshot.muted ? 'Activer le son' : 'Couper le son'}>
                  {snapshot.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              </div>
            )}

            <div className="impact-event-marker" aria-live="polite">
              {snapshot.impactApplied && active && <span><Zap size={13} /> ULT_IMPACT · DÉGÂTS APPLIQUÉS</span>}
            </div>
          </div>

          <div className="timeline-panel">
            <div className="timeline-heading">
              <div><span>{active ? snapshot.shotName : snapshot.phase === 'complete' ? 'Séquence terminée' : 'Prêt pour le test'}</span><small>{active ? snapshot.shotDetail : 'Le combat reprend automatiquement après la récupération.'}</small></div>
              <strong>{formatTime(snapshot.time)} <span>/ {formatTime(snapshot.duration)}</span></strong>
            </div>
            <div className="timeline-track" aria-label={`Progression ${Math.round(progress)} %`}>
              <i className="timeline-fill" style={{ width: `${progress}%` }} />
              <b className="impact-tick" style={{ left: `${impactProgress}%` }} title="Impact et application des dégâts"><span>IMPACT</span></b>
              {[0.55, 1.35, 2.35, 3.45, 5.65, 6.75].map((time, index) => snapshot.mode !== 'instant' && (
                <i key={time} className="shot-tick" style={{ left: `${snapshot.mode === 'short' ? [0.24, 0.55, 0.86, 1.08, 1.67, 1.98][index] / snapshot.duration * 100 : time / snapshot.duration * 100}%` }} />
              ))}
            </div>
          </div>

          <div className="mode-selector" role="group" aria-label="Version de l’ultime">
            {MODES.map(mode => (
              <button
                key={mode.id}
                className={selectedMode === mode.id ? 'is-selected' : ''}
                onClick={() => {
                  setSelectedMode(mode.id)
                  engineRef.current?.setMode(mode.id)
                }}
                disabled={active}
                aria-pressed={selectedMode === mode.id}
              >
                <span>{mode.name}<b>{mode.duration}</b></span>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>

          <div className="primary-controls">
            <button className="cast-button" onClick={() => active ? engineRef.current?.pause() : start()} >
              {active ? (snapshot.phase === 'paused' ? <Play size={19} /> : <Pause size={19} />) : <Zap size={19} fill="currentColor" />}
              <span>{active ? (snapshot.phase === 'paused' ? 'REPRENDRE LA SÉQUENCE' : 'METTRE EN PAUSE') : snapshot.phase === 'complete' ? 'REJOUER · SERMENT DU ZÉNITH' : 'SERMENT DU ZÉNITH'}</span>
              {!active && <kbd>100</kbd>}
            </button>
            <button className="icon-button" onClick={() => engineRef.current?.setMuted(!snapshot.muted)} aria-label={snapshot.muted ? 'Activer le son' : 'Couper le son'} title={snapshot.muted ? 'Activer le son' : 'Couper le son'}>
              {snapshot.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <button className="icon-button" onClick={() => engineRef.current?.reset()} aria-label="Réinitialiser le test" title="Réinitialiser"><RotateCcw size={18} /></button>
          </div>
          <div className="secondary-controls">
            <button onClick={() => engineRef.current?.setRate(snapshot.rate === 1 ? 0.5 : 1)}><Clock3 size={14} /> Vitesse <strong>{snapshot.rate === 1 ? '×1' : '×0,5'}</strong></button>
            <span className={snapshot.battleSuspended ? 'is-suspended' : ''}><i /> {snapshot.battleSuspended ? 'TIMERS DE COMBAT SUSPENDUS' : 'COMBAT ACTIF · CONTRÔLES DISPONIBLES'}</span>
          </div>
        </section>

        <aside className="combat-sidebar">
          <section className="ultimate-card">
            <div className="ultimate-card-heading">
              <div className="nexus-icon"><Zap size={24} /></div>
              <div><span>ULTIME · NEXUS</span><h2>Serment du Zénith</h2></div>
            </div>
            <p>Aelion trace une brèche céleste avec sa lance de cristal, puis retourne en position de combat.</p>
            <div className="ultimate-stats">
              <div><span>DÉGÂTS</span><strong>{numberFormat.format(ULTIMATE_DAMAGE)}</strong><small>Physique · Nexus</small></div>
              <div><span>IMPACT</span><strong>{snapshot.mode === 'full' ? '4,50 s' : snapshot.mode === 'short' ? '1,35 s' : '0,32 s'}</strong><small>Événement unique</small></div>
            </div>
            <div className="status-description"><Shield size={17} /><div><strong>Brèche du Nexus</strong><span>DÉF −30 % · 2 tours</span></div></div>
          </section>

          <section className="sync-card">
            <div className="section-title"><Activity size={15} /><h3>Synchronisation combat</h3></div>
            <div className="sync-row"><span>Événement de dégâts</span><strong className={snapshot.damageEvents === 1 ? 'is-valid' : ''}>{snapshot.damageEvents} / 1</strong></div>
            <div className="sync-row"><span>PV réels de la cible</span><strong>{numberFormat.format(snapshot.targetHp)}</strong></div>
            <div className="sync-row"><span>Jauge après déclenchement</span><strong>{snapshot.energy} %</strong></div>
            <div className="sync-row"><span>Horloge du combat</span><strong>{snapshot.battleTime.toFixed(1)} s</strong></div>
            <div className={`sync-verdict ${snapshot.phase === 'complete' ? 'is-valid' : ''}`}>
              {snapshot.phase === 'complete' ? <Check size={14} /> : <Activity size={14} />}
              {snapshot.phase === 'complete' ? 'Retour au combat confirmé' : 'En attente de la fin de séquence'}
            </div>
          </section>

          <section className="event-card">
            <div className="section-title"><Swords size={15} /><h3>Journal du test</h3><span>LIVE</span></div>
            <div className="event-log" aria-live="polite">
              {events.slice().reverse().map(event => (
                <div key={event.id} className={`event-line event-${event.type}`}>
                  <i />
                  <div><strong>{event.text}</strong><span>{formatTime(event.time)}</span></div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className={`storyboard-panel ${storyboardOpen ? 'is-open' : ''}`}>
        <button className="storyboard-toggle" onClick={() => setStoryboardOpen(!storyboardOpen)} aria-expanded={storyboardOpen}>
          <span><Focus size={17} /><strong>Storyboard & inspection des plans</strong><small>7 plans · action, caméra et synchronisation</small></span>
          <ChevronRight size={18} />
        </button>
        {storyboardOpen && (
          <div className="storyboard-grid">
            {STORYBOARD.map(([time, index, name, description]) => (
              <article key={index}>
                <span className="storyboard-index">{index}</span>
                <div><small>{time}</small><h3>{name}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="lab-footer">
        <span>Prototype isolé · aucune modification du hub ou du combat principal</span>
        <span>Aelion, l’univers, l’animation et le son sont originaux.</span>
      </footer>
    </main>
  )
}
