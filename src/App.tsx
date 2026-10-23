import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  Anvil,
  Beer,
  Bell,
  Castle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Crown,
  Expand,
  Gem,
  Gift,
  Info,
  Landmark,
  Mail,
  Map,
  MoveHorizontal,
  Package,
  Plus,
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
    description: 'Des contrats animés, des équipes à envoyer en mission et des récompenses à récupérer.',
    icon: Beer,
    x: 25,
    y: 57,
    badge: true,
  },
  {
    id: 'market',
    name: 'Marché aux merveilles',
    label: 'Marché',
    kind: 'Boutique de la cité',
    description: 'Les étals proposent équipements, matériaux et offres renouvelées chaque jour.',
    icon: Store,
    x: 29,
    y: 84,
    badge: true,
  },
  {
    id: 'forge',
    name: 'Forge des Braises',
    label: 'Forge',
    kind: 'Équipement et amélioration',
    description: 'La forge permettra de renforcer les armes et de donner de nouveaux effets à votre équipement.',
    icon: Anvil,
    x: 8,
    y: 85,
    badge: true,
  },
  {
    id: 'sanctuary',
    name: 'Sanctuaire sacré',
    label: 'Sanctuaire',
    kind: 'Bénédictions',
    description: 'Un sanctuaire majestueux réservé aux bénédictions et à la progression partagée.',
    icon: Landmark,
    x: 47,
    y: 34,
    badge: false,
  },
  {
    id: 'wishing',
    name: 'Temple des vœux',
    label: 'Invocation',
    kind: 'Portail arcanique',
    description: 'Le portail gacha central de la cité, alimenté par les cristaux du Serment.',
    icon: Sparkles,
    x: 54,
    y: 65,
    badge: true,
  },
  {
    id: 'guild',
    name: 'Forteresse de guilde',
    label: 'Guilde',
    kind: 'Cercle des aventuriers',
    description: 'Boss communs, guerres de guilde et récompenses collectives prendront place dans cette forteresse.',
    icon: Shield,
    x: 78,
    y: 58,
    badge: false,
  },
  {
    id: 'tower',
    name: 'Tour des Épreuves',
    label: 'Tour',
    kind: 'Défi vertical',
    description: 'Une tour cristalline composée d’étages et de défis de difficulté croissante.',
    icon: Castle,
    x: 94,
    y: 62,
    badge: false,
  },
  {
    id: 'arena',
    name: 'Arène des Gladiateurs',
    label: 'Arène',
    kind: 'Combats et classement',
    description: 'Bannières levées : les équipes s’y affronteront pour le prestige et les récompenses de saison.',
    icon: Swords,
    x: 82,
    y: 87,
    badge: false,
  },
] as const

type BuildingId = (typeof buildings)[number]['id']
type UtilityId =
  | 'campaign'
  | 'heroes'
  | 'quests'
  | 'bag'
  | 'settings'
  | 'events'
  | 'mail'
  | 'battlepass'
  | 'tavern-afk'
  | 'shop'
type Selection = BuildingId | UtilityId | null

const quickItems = [
  { id: 'events', label: 'Événements', icon: Bell, badge: true },
  { id: 'battlepass', label: 'Pass de combat', icon: Crown, badge: false },
  { id: 'quests', label: 'Quotidiennes', icon: ScrollText, badge: true },
  { id: 'tavern-afk', label: 'Taverne AFK', icon: Clock3, badge: true },
  { id: 'shop', label: 'Offres du magasin', icon: ShoppingBag, badge: true },
] as const

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
  const [energy] = useState(86)
  const [tickets, setTickets] = useState(3)
  const [idleSeconds, setIdleSeconds] = useState(10056)
  const [toast, setToast] = useState<string | null>(null)
  const [motion, setMotion] = useState(true)
  const [questClaimed, setQuestClaimed] = useState(false)
  const [mailClaimed, setMailClaimed] = useState(false)
  const [mailRead, setMailRead] = useState(false)
  const [quickOpen, setQuickOpen] = useState(() => window.innerWidth > 700)
  const [shopFocus, setShopFocus] = useState('Or')

  const idleGold = Math.floor(idleSeconds / 60) * 76
  const idlePercent = Math.min(100, (idleSeconds / 43200) * 100)
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

  const openShop = (focus: string) => {
    setShopFocus(focus)
    setSelection('shop')
  }

  const collectIdle = () => {
    if (idleGold <= 0) return
    const reward = idleGold
    setCoins((value) => value + reward)
    setIdleSeconds(0)
    showToast(`Récolte de l’Arbre-monde · +${numberFormat.format(reward)} or`)
  }

  const claimQuest = () => {
    if (questClaimed) return
    setQuestClaimed(true)
    setGems((value) => value + 20)
    showToast('Quotidienne validée · +20 diamants')
  }

  const claimMail = () => {
    if (mailClaimed) return
    setMailClaimed(true)
    setTickets((value) => value + 1)
    showToast('Cadeau récupéré · +1 parchemin d’invocation')
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      showToast('Le plein écran doit être autorisé par le navigateur.')
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!motion || event.pointerType === 'touch' || !mapRef.current) return
    const x = (event.clientX / window.innerWidth - 0.5) * 2
    const y = (event.clientY / window.innerHeight - 0.5) * 2
    mapRef.current.style.setProperty('--look-x', x.toFixed(3))
    mapRef.current.style.setProperty('--look-y', y.toFixed(3))
  }

  const resetParallax = () => {
    mapRef.current?.style.setProperty('--look-x', '0')
    mapRef.current?.style.setProperty('--look-y', '0')
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
          <span className="dock-status">Module à tester</span>
        </div>
      )
    }

    switch (selection) {
      case 'campaign':
        return (
          <div className="dock-building campaign-dock">
            <span className="dock-emblem"><Map size={25} /></span>
            <div className="dock-copy">
              <small>Chapitre IV · Mission 4-7</small>
              <h2>Le pont des Serments</h2>
              <p>Puissance recommandée : 118 000 · Votre prochaine étape de campagne.</p>
            </div>
            <button type="button" className="dock-action" onClick={() => showToast('Mission 4-7 sélectionnée pour la future page de combat.')}>Choisir</button>
          </div>
        )

      case 'heroes':
        return (
          <div className="dock-building">
            <span className="dock-emblem"><Users size={25} /></span>
            <div className="dock-copy">
              <small>Gestion de l’équipe</small>
              <h2>Héros du Serment</h2>
              <p>Formation, niveaux, équipement et compétences seront regroupés dans la future page Héros.</p>
            </div>
            <span className="dock-status">5 places</span>
          </div>
        )

      case 'quests':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><ScrollText size={21} /><span><small>Objectifs quotidiens</small><h2>Serments du jour</h2></span><strong>2 / 3</strong></div>
            <div className="quick-quest">
              <span className={questClaimed ? 'complete' : ''}>{questClaimed ? <Check size={16} /> : <Gift size={16} />}</span>
              <div><strong>Richesse de l’Arbre-monde</strong><small>Récupérer une récolte AFK</small></div>
              <button type="button" disabled={questClaimed} onClick={claimQuest}>{questClaimed ? 'Reçu' : '+20'}<Gem size={13} /></button>
            </div>
          </div>
        )

      case 'bag':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Package size={21} /><span><small>Inventaire</small><h2>Ressources du Voyageur</h2></span></div>
            <div className="bag-resources four">
              <span><Coins size={18} /><strong>{numberFormat.format(coins)}</strong><small>Or</small></span>
              <span><Gem size={18} /><strong>{numberFormat.format(gems)}</strong><small>Diamants</small></span>
              <span><Zap size={18} /><strong>{energy} / 120</strong><small>Énergie</small></span>
              <span><Ticket size={18} /><strong>{tickets}</strong><small>Parchemins</small></span>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Settings size={21} /><span><small>Options</small><h2>Affichage de la cité</h2></span></div>
            <div className="map-options">
              <button type="button" onClick={() => setMotion((value) => !value)} aria-pressed={motion}>
                <Sparkles size={16} /> Brume, parallaxe et particules <span className={`mini-toggle ${motion ? 'on' : ''}`}><i /></span>
              </button>
              <button type="button" onClick={() => centerMap(true)}><MoveHorizontal size={16} /> Recentrer la carte <ChevronRight size={15} /></button>
              <button type="button" onClick={toggleFullscreen}><Expand size={16} /> Plein écran <ChevronRight size={15} /></button>
            </div>
          </div>
        )

      case 'events':
        return (
          <div className="dock-building event-dock">
            <span className="dock-emblem"><Bell size={25} /></span>
            <div className="dock-copy">
              <small>Événement saisonnier</small>
              <h2>L’Éveil des Constellations</h2>
              <p>Le portail et l’Arbre-monde rayonnent ensemble. Les activités saisonnières seront présentées ici.</p>
            </div>
            <span className="event-days">7 jours</span>
          </div>
        )

      case 'battlepass':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Crown size={21} /><span><small>Saison du Serment</small><h2>Pass de combat · Niveau 18</h2></span><strong>720 / 1 000</strong></div>
            <div className="pass-track"><span style={{ width: '72%' }} /><i>18</i><i>19</i><i>20</i></div>
            <p className="mail-preview">Prochaine récompense : 100 diamants et 2 parchemins d’invocation.</p>
          </div>
        )

      case 'tavern-afk':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Clock3 size={21} /><span><small>Progression hors ligne</small><h2>Récolte de la Taverne</h2></span><strong>{formatDuration(idleSeconds)}</strong></div>
            <div className="afk-dock-reward">
              <span><Coins size={20} /><strong>+{numberFormat.format(idleGold)}</strong><small>or accumulé</small></span>
              <button type="button" disabled={idleGold === 0} onClick={collectIdle}>{idleGold === 0 ? 'Récolté' : 'Tout récupérer'}<Gift size={15} /></button>
            </div>
          </div>
        )

      case 'shop':
        return (
          <div className="dock-utility shop-dock">
            <div className="dock-utility-title"><ShoppingBag size={21} /><span><small>Offres du magasin</small><h2>Recharger : {shopFocus}</h2></span></div>
            <div className="shop-offers">
              <span><small>Quotidien</small><strong>Pack du Voyageur</strong><i>Gratuit</i></span>
              <span><small>Hebdomadaire</small><strong>Coffre du Serment</strong><i>Aperçu</i></span>
              <span><small>Spécial</small><strong>Pack Constellation</strong><i>Aperçu</i></span>
            </div>
            <p className="mail-preview">Vitrine visuelle uniquement · aucun paiement dans ce prototype.</p>
          </div>
        )

      case 'mail':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Mail size={21} /><span><small>Messagerie</small><h2>Cadeau du gardien</h2></span></div>
            <p className="mail-preview">Le gardien du Temple vous offre un parchemin pour le portail d’invocation.</p>
            <button type="button" className="mail-claim" disabled={mailClaimed} onClick={claimMail}>
              <Ticket size={17} /><span>{mailClaimed ? 'Cadeau récupéré' : '1 parchemin d’invocation'}</span>{mailClaimed ? <Check size={16} /> : <Gift size={16} />}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`city-shell ${motion ? '' : 'motion-off'}`} onPointerMove={handlePointerMove} onPointerLeave={resetParallax}>
      <div className="city-scroll" ref={mapRef}>
        <div className="city-map">
          <div className="city-world">
            <img className="city-art" src="assets/ville-astrea-v2.webp" alt="La cité heroic-fantasy d’Astréa" draggable="false" />
            <div className="map-light" />

            <div className="portal-effect" aria-hidden="true">
              <i className="portal-ring ring-a" />
              <i className="portal-ring ring-b" />
              <i className="portal-ring ring-c" />
              <span className="crystal-shard shard-a" />
              <span className="crystal-shard shard-b" />
              <span className="crystal-shard shard-c" />
            </div>

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
                  <span className="building-pin"><Icon size={19} /></span>
                  <span className="building-name">{building.label}</span>
                  {showBadge ? <span className="building-badge">!</span> : null}
                </button>
              )
            })}

            <button type="button" className="tree-harvest" onClick={collectIdle} disabled={idleGold === 0}>
              <span className="harvest-heading"><Trees size={15} /><strong>Arbre-monde</strong><small>Récolte AFK</small></span>
              <span className="harvest-content">
                <span className="harvest-chest"><Gift size={23} /><i /></span>
                <span className="harvest-value"><strong>+{numberFormat.format(idleGold)}</strong><small>or accumulé</small></span>
                <span className="harvest-time">{formatDuration(idleSeconds)}</span>
              </span>
              <span className="harvest-gauge"><i style={{ width: `${Math.max(4, idlePercent)}%` }} /></span>
            </button>
          </div>

          <div className="sun-rays" aria-hidden="true"><i /><i /><i /></div>
          <div className="magic-mist" aria-hidden="true"><i /><i /></div>
        </div>
      </div>

      <div className="screen-shade" />
      <div className="city-particles" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <i key={index} className={`particle-${index % 3}`} style={{ left: `${(index * 47 + 8) % 100}%`, top: `${(index * 31 + 16) % 84}%`, animationDelay: `${-index * 0.9}s` }} />
        ))}
      </div>

      <header className="city-topbar">
        <div className="player-hud">
          <div className="vip-avatar">
            <img src="assets/avatar-aelion.webp" alt="Avatar d’Aelion" />
            <span><Crown size={9} /> VIP 3</span>
            <i>24</i>
          </div>
          <div className="player-data">
            <div className="player-name"><strong>Aelion</strong><small>NIVEAU 24</small></div>
            <div className="power-rating"><Zap size={13} /><strong>128 450</strong><small>POWER</small></div>
            <div className="power-bar"><span /></div>
          </div>
        </div>

        <div className="city-heading">
          <small>CITÉ DU SERMENT</small>
          <strong>Ville d’Astréa</strong>
          <span>HUB CITÉ · 03</span>
        </div>

        <div className="resource-hud">
          <div className="resource-chip gold">
            <span className="resource-orb"><Coins size={16} /></span>
            <span className="resource-text"><small>OR</small><strong>{numberFormat.format(coins)}</strong></span>
            <button type="button" aria-label="Obtenir de l’or" onClick={() => openShop('Or')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip diamond">
            <span className="resource-orb"><Gem size={16} /></span>
            <span className="resource-text"><small>DIAMANTS</small><strong>{numberFormat.format(gems)}</strong></span>
            <button type="button" aria-label="Obtenir des diamants" onClick={() => openShop('Diamants')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip energy">
            <span className="resource-orb"><Zap size={16} /></span>
            <span className="resource-text"><small>ÉNERGIE</small><strong>{energy} / 120</strong></span>
            <button type="button" aria-label="Obtenir de l’énergie" onClick={() => openShop('Énergie')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip scroll">
            <span className="resource-orb"><Ticket size={16} /></span>
            <span className="resource-text"><small>PARCHEMINS</small><strong>{tickets}</strong></span>
            <button type="button" aria-label="Obtenir des parchemins" onClick={() => openShop('Parchemins')}><Plus size={14} /></button>
          </div>
        </div>
      </header>

      <aside className="left-tools">
        <button type="button" onClick={() => { setSelection('mail'); setMailRead(true) }} className={selection === 'mail' ? 'active' : ''}>
          <span><Mail size={18} />{!mailRead ? <i>1</i> : null}</span><small>Messages</small>
        </button>
        <button type="button" onClick={() => setSelection('settings')} className={selection === 'settings' ? 'active' : ''}>
          <span><Settings size={18} /></span><small>Options</small>
        </button>
        <button type="button" onClick={toggleFullscreen}>
          <span><Expand size={18} /></span><small>Plein écran</small>
        </button>
      </aside>

      <aside className={`quick-rail ${quickOpen ? 'open' : 'closed'}`}>
        <button type="button" className="rail-toggle" onClick={() => setQuickOpen((value) => !value)} aria-label={quickOpen ? 'Rétracter les accès rapides' : 'Afficher les accès rapides'}>
          {quickOpen ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!quickOpen ? <Sparkles size={14} /> : null}
        </button>
        {quickOpen ? (
          <div className="quick-rail-items">
            {quickItems.map((item) => {
              const Icon = item.icon
              return (
                <button type="button" key={item.id} className={selection === item.id ? 'active' : ''} onClick={() => setSelection(item.id)}>
                  <span className="quick-icon"><Icon size={19} />{item.badge ? <i /> : null}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}
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

      <nav className="city-nav" aria-label="Navigation principale">
        <button type="button" className={selection === 'campaign' ? 'active' : ''} onClick={() => setSelection('campaign')}>
          <span className="nav-medallion"><Map size={21} /></span><span className="nav-label">Campagne</span>
        </button>
        <button type="button" className={!selection || (selectedBuilding && selection !== 'guild') ? 'active city-active' : ''} onClick={() => { setSelection(null); centerMap(true) }}>
          <i className="nav-active-gem" aria-hidden="true" /><span className="nav-medallion"><Landmark size={22} /></span><span className="nav-label">Cité</span>
        </button>
        <button type="button" className={selection === 'heroes' ? 'active' : ''} onClick={() => setSelection('heroes')}>
          <span className="nav-medallion"><Users size={21} /><i className="nav-badge">!</i></span><span className="nav-label">Héros</span>
        </button>
        <button type="button" className={selection === 'bag' ? 'active' : ''} onClick={() => setSelection('bag')}>
          <span className="nav-medallion"><Package size={21} /></span><span className="nav-label">Sac</span>
        </button>
        <button type="button" className={selection === 'guild' ? 'active' : ''} onClick={() => selectBuilding('guild')}>
          <span className="nav-medallion"><Shield size={21} /></span><span className="nav-label">Guilde</span>
        </button>
      </nav>

      <div className="city-test-note"><Info size={12} /> Interface de cité · prototype visuel et ergonomique 03</div>

      {toast ? <div className="city-toast" role="status"><Check size={15} />{toast}</div> : null}
    </div>
  )
}
