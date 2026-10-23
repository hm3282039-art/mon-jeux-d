import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell,
  Beer,
  Castle,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Expand,
  Gem,
  Gift,
  Info,
  Landmark,
  Mail,
  Map,
  MoveHorizontal,
  Package,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Swords,
  Ticket,
  Trees,
  Users,
  X,
  Zap,
} from 'lucide-react'

const numberFormat = new Intl.NumberFormat('fr-FR')

const buildings = [
  {
    id: 'tavern',
    name: 'Taverne du Voyageur',
    label: 'Taverne',
    kind: 'Missions et contrats',
    description: 'Confiez des contrats à vos équipes et revenez récupérer leurs récompenses plus tard.',
    icon: Beer,
    x: 25,
    y: 57,
    badge: true,
  },
  {
    id: 'market',
    name: 'Marché aux merveilles',
    label: 'Marché',
    kind: 'Boutique de la ville',
    description: 'Équipements, matériaux et offres du jour seront regroupés dans les étals du marché.',
    icon: Store,
    x: 29,
    y: 84,
    badge: false,
  },
  {
    id: 'sanctuary',
    name: 'Sanctuaire sacré',
    label: 'Sanctuaire',
    kind: 'Bénédictions',
    description: 'Un lieu réservé aux bénédictions et à la progression partagée de votre future équipe.',
    icon: Landmark,
    x: 47,
    y: 34,
    badge: false,
  },
  {
    id: 'wishing',
    name: 'Temple des vœux',
    label: 'Invocation',
    kind: 'Portail céleste',
    description: 'Le portail d’invocation de la cité. Son système de tirage sera testé séparément.',
    icon: Sparkles,
    x: 54,
    y: 64,
    badge: true,
  },
  {
    id: 'tree',
    name: 'Arbre-monde',
    label: 'Arbre-monde',
    kind: 'Cœur de la cité',
    description: 'L’arbre ancien veille sur la ville et rassemble les récompenses du temps qui passe.',
    icon: Trees,
    x: 76,
    y: 29,
    badge: false,
  },
  {
    id: 'guild',
    name: 'Forteresse de guilde',
    label: 'Guilde',
    kind: 'Cercle des aventuriers',
    description: 'Le futur point de rassemblement pour les boss de guilde et les activités communes.',
    icon: Shield,
    x: 78,
    y: 58,
    badge: false,
  },
  {
    id: 'tower',
    name: 'Tour d’Éther',
    label: 'Tour',
    kind: 'Défi vertical',
    description: 'Une tour composée d’étages et de combats de difficulté croissante.',
    icon: Castle,
    x: 94,
    y: 62,
    badge: false,
  },
  {
    id: 'arena',
    name: 'Arène de la cité',
    label: 'Arène',
    kind: 'Affrontements',
    description: 'Le lieu prévu pour les équipes défensives, les classements et les duels.',
    icon: Swords,
    x: 82,
    y: 87,
    badge: false,
  },
] as const

type BuildingId = (typeof buildings)[number]['id']
type UtilityId = 'heroes' | 'quests' | 'bag' | 'settings' | 'events' | 'mail'
type Selection = BuildingId | UtilityId | null

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [visitedBuildings, setVisitedBuildings] = useState<BuildingId[]>([])
  const [coins, setCoins] = useState(24850)
  const [gems, setGems] = useState(1240)
  const [tickets, setTickets] = useState(3)
  const [idleSeconds, setIdleSeconds] = useState(10056)
  const [toast, setToast] = useState<string | null>(null)
  const [motion, setMotion] = useState(true)
  const [questClaimed, setQuestClaimed] = useState(false)
  const [mailClaimed, setMailClaimed] = useState(false)
  const [mailRead, setMailRead] = useState(false)

  const idleGold = Math.floor(idleSeconds / 60) * 76
  const selectedBuilding = buildings.find((building) => building.id === selection)

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const centerMap = useCallback((smooth = false) => {
    const map = mapRef.current
    if (!map) return
    map.scrollTo({
      left: (map.scrollWidth - map.clientWidth) / 2,
      behavior: smooth && motion ? 'smooth' : 'auto',
    })
  }, [motion])

  useEffect(() => {
    const frame = requestAnimationFrame(() => centerMap())
    const timer = window.setInterval(() => setIdleSeconds((value) => value + 1), 1000)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [centerMap])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const selectBuilding = (id: BuildingId) => {
    setSelection(id)
    setVisitedBuildings((value) => (value.includes(id) ? value : [...value, id]))
  }

  const collectIdle = () => {
    if (idleGold <= 0) return
    const reward = idleGold
    setCoins((value) => value + reward)
    setIdleSeconds(0)
    showToast(`Coffre récupéré · +${numberFormat.format(reward)} pièces d’or`)
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      showToast('Le plein écran doit être autorisé par la fenêtre d’aperçu Arena.')
    }
  }

  const claimQuest = () => {
    if (questClaimed) return
    setQuestClaimed(true)
    setGems((value) => value + 20)
    showToast('Récompense de quête · +20 astralites')
  }

  const openMail = () => {
    setSelection('mail')
    setMailRead(true)
  }

  const claimMail = () => {
    if (mailClaimed) return
    setMailClaimed(true)
    setTickets((value) => value + 1)
    showToast('Cadeau récupéré · +1 ticket d’invocation')
  }

  const renderDock = () => {
    if (!selection) return null

    if (selectedBuilding) {
      const Icon = selectedBuilding.icon
      return (
        <div className="dock-building">
          <span className="dock-emblem"><Icon size={25} /></span>
          <div className="dock-copy">
            <small>{selectedBuilding.kind}</small>
            <h2>{selectedBuilding.name}</h2>
            <p>{selectedBuilding.description}</p>
          </div>
          <span className="dock-status">Intérieur à prototyper</span>
        </div>
      )
    }

    switch (selection) {
      case 'heroes':
        return (
          <div className="dock-building">
            <span className="dock-emblem"><Users size={25} /></span>
            <div className="dock-copy">
              <small>Accès rapide</small>
              <h2>Héros</h2>
              <p>La carte reste entièrement dédiée à la ville. L’écran de gestion des héros sera conçu sur sa propre page de test.</p>
            </div>
          </div>
        )

      case 'quests':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><ScrollText size={21} /><span><small>Journal</small><h2>Quêtes du jour</h2></span></div>
            <div className="quick-quest">
              <span className={questClaimed ? 'complete' : ''}>{questClaimed ? <Check size={16} /> : <Gift size={16} />}</span>
              <div><strong>Le coffre de la cité</strong><small>Récupérer le butin du temps libre</small></div>
              <button type="button" disabled={questClaimed} onClick={claimQuest}>{questClaimed ? 'Reçu' : '+20'}<Gem size={13} /></button>
            </div>
          </div>
        )

      case 'bag':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><ShoppingBag size={21} /><span><small>Inventaire</small><h2>Ressources</h2></span></div>
            <div className="bag-resources">
              <span><Coins size={18} /><strong>{numberFormat.format(coins)}</strong><small>Or</small></span>
              <span><Gem size={18} /><strong>{numberFormat.format(gems)}</strong><small>Astralites</small></span>
              <span><Ticket size={18} /><strong>{tickets}</strong><small>Tickets</small></span>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Settings size={21} /><span><small>Options</small><h2>La carte</h2></span></div>
            <div className="map-options">
              <button type="button" onClick={() => setMotion((value) => !value)} aria-pressed={motion}>
                <Sparkles size={16} /> Ambiance animée <span className={`mini-toggle ${motion ? 'on' : ''}`}><i /></span>
              </button>
              <button type="button" onClick={() => centerMap(true)}><MoveHorizontal size={16} /> Recentrer la carte <ChevronRight size={15} /></button>
            </div>
          </div>
        )

      case 'events':
        return (
          <div className="dock-building">
            <span className="dock-emblem"><Bell size={25} /></span>
            <div className="dock-copy">
              <small>Événement de la cité</small>
              <h2>Les lanternes du ciel</h2>
              <p>Une future activité saisonnière prendra place autour de l’Arbre-monde. Aucun compte à rebours réel dans ce prototype.</p>
            </div>
          </div>
        )

      case 'mail':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Mail size={21} /><span><small>Messagerie</small><h2>Bienvenue dans la cité</h2></span></div>
            <p className="mail-preview">Le gardien du Temple vous offre un ticket pour le futur portail d’invocation.</p>
            <button type="button" className="mail-claim" disabled={mailClaimed} onClick={claimMail}>
              <Ticket size={17} /><span>{mailClaimed ? 'Cadeau récupéré' : '1 ticket d’invocation'}</span>{mailClaimed ? <Check size={16} /> : <Gift size={16} />}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`city-shell ${motion ? '' : 'motion-off'}`}>
      <div className="city-scroll" ref={mapRef}>
        <div className="city-map">
          <img className="city-art" src="assets/ville-astrea.webp" alt="La ville flottante d’Astréa et ses bâtiments" draggable="false" />
          <div className="map-light" />
          {buildings.map((building) => {
            const Icon = building.icon
            const showBadge = building.badge && !visitedBuildings.includes(building.id)
            return (
              <button
                type="button"
                key={building.id}
                className={`building-hotspot building-${building.id} ${selection === building.id ? 'selected' : ''}`}
                style={{ left: `${building.x}%`, top: `${building.y}%` }}
                onClick={() => selectBuilding(building.id)}
                aria-label={`Ouvrir ${building.name}`}
              >
                <span className="building-pin"><Icon size={17} /></span>
                <span className="building-name">{building.label}</span>
                {showBadge ? <span className="building-badge">!</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="screen-shade" />
      <div className="city-particles" aria-hidden="true">
        {Array.from({ length: 15 }, (_, index) => (
          <i key={index} style={{ left: `${(index * 47 + 8) % 100}%`, top: `${(index * 31 + 16) % 84}%`, animationDelay: `${-index * 0.9}s` }} />
        ))}
      </div>

      <header className="city-topbar">
        <button type="button" className="player-chip" onClick={() => setSelection('heroes')}>
          <span className="player-shield"><Shield size={21} /></span>
          <span><small>VOYAGEUR · NIV. 24</small><strong>Aelion</strong></span>
          <span className="player-power"><Zap size={12} /> 128 450</span>
        </button>

        <div className="city-heading">
          <small>CITÉ DU SERMENT</small>
          <strong>Ville d’Astréa</strong>
          <span>HUB TEST · 02</span>
        </div>

        <div className="topbar-actions">
          <div className="city-resources">
            <div><span className="currency-icon gold"><Coins size={15} /></span><strong>{numberFormat.format(coins)}</strong></div>
            <div><span className="currency-icon purple"><Gem size={15} /></span><strong>{numberFormat.format(gems)}</strong></div>
          </div>
          <button type="button" className="big-screen-link" onClick={toggleFullscreen} title="Afficher le jeu en plein écran">
            <Expand size={16} /><span>Grand écran</span>
          </button>
        </div>
      </header>

      <aside className="left-tools">
        <button type="button" onClick={() => setSelection('events')} className={selection === 'events' ? 'active' : ''}>
          <span><Bell size={19} /></span><small>Événement</small>
        </button>
        <button type="button" onClick={openMail} className={selection === 'mail' ? 'active' : ''}>
          <span><Mail size={19} />{!mailRead ? <i>1</i> : null}</span><small>Messages</small>
        </button>
      </aside>

      <aside className="right-tools">
        <button type="button" onClick={() => setSelection('heroes')} className={selection === 'heroes' ? 'active' : ''}>
          <Users size={20} /><span>Héros</span>
        </button>
        <button type="button" onClick={() => setSelection('quests')} className={selection === 'quests' ? 'active' : ''}>
          <ScrollText size={20} /><span>Quêtes</span>{!questClaimed ? <i /> : null}
        </button>
        <button type="button" onClick={() => setSelection('bag')} className={selection === 'bag' ? 'active' : ''}>
          <Package size={20} /><span>Sac</span>
        </button>
        <button type="button" onClick={() => setSelection('settings')} className={selection === 'settings' ? 'active' : ''}>
          <Settings size={20} /><span>Options</span>
        </button>
      </aside>

      <button type="button" className="map-explore-hint" onClick={() => centerMap(true)}>
        <MoveHorizontal size={15} /> Glissez pour explorer
      </button>

      {selection ? (
        <section className={`city-dock ${selectedBuilding ? 'is-building' : 'is-utility'}`} aria-label="Détails">
          {renderDock()}
          <button type="button" className="dock-close" aria-label="Fermer" onClick={() => setSelection(null)}><X size={17} /></button>
        </section>
      ) : null}

      <button type="button" className="idle-chest" onClick={collectIdle} disabled={idleGold === 0}>
        <span className="chest-icon"><Gift size={24} /><i /></span>
        <span className="chest-copy"><small>{idleGold === 0 ? 'COFFRE RÉCUPÉRÉ' : 'BUTIN DE LA CITÉ'}</small><strong><Clock3 size={12} /> {formatDuration(idleSeconds)}</strong></span>
        <span className="chest-reward">{idleGold === 0 ? <Check size={15} /> : <><Coins size={14} /> +{numberFormat.format(idleGold)}</>}</span>
      </button>

      <nav className="city-nav" aria-label="Sections du jeu">
        <button type="button" onClick={() => showToast('La carte Aventure sera créée sur une page de test séparée.')}>
          <span className="nav-medallion"><Map size={20} /></span>
          <span className="nav-label">Aventure</span>
        </button>
        <button type="button" className="active" onClick={() => { setSelection(null); centerMap(true) }}>
          <i className="nav-active-gem" aria-hidden="true" />
          <span className="nav-medallion"><Landmark size={22} /></span>
          <span className="nav-label">Ville</span>
        </button>
        <button type="button" onClick={() => showToast('La Banlieue sera créée sur une page de test séparée.')}>
          <span className="nav-medallion"><Trees size={20} /></span>
          <span className="nav-label">Banlieue</span>
        </button>
      </nav>

      <div className="city-test-note"><Info size={12} /> Prototype de carte · les intérieurs seront testés séparément</div>

      {toast ? <div className="city-toast" role="status"><Check size={15} />{toast}</div> : null}
    </div>
  )
}
