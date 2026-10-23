import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  Anvil,
  ArrowUpRight,
  Beer,
  Bell,
  Castle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Crosshair,
  Crown,
  Expand,
  Gauge,
  Gem,
  Gift,
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
import { Atmosphere } from './Atmosphere'
import type { RenderQuality } from './Atmosphere'
import cityArtFallbackUrl from './assets/astrea-celestia.webp?inline'

const numberFormat = new Intl.NumberFormat('fr-FR')

const buildings = [
  {
    id: 'tavern',
    name: 'Taverne du Voyageur',
    label: 'Taverne',
    tag: 'Contrats',
    kind: 'Missions et contrats',
    description: 'Constituez vos équipes, acceptez des contrats et revenez chercher les récompenses du Voyageur.',
    icon: Beer,
    x: 24,
    y: 57,
    badge: '2',
  },
  {
    id: 'market',
    name: 'Marché aux Merveilles',
    label: 'Marché',
    tag: 'Nouveau stock',
    kind: 'Boutique de la cité',
    description: 'Équipements, matériaux rares et offres renouvelées chaque jour par les marchands de Célestia.',
    icon: Store,
    x: 36,
    y: 78,
    badge: '1',
  },
  {
    id: 'forge',
    name: 'Forge des Braises',
    label: 'Forge',
    tag: 'Amélioration',
    kind: 'Équipement et maîtrise',
    description: 'Renforcez vos armes, éveillez leur potentiel et donnez de nouveaux effets à votre équipement.',
    icon: Anvil,
    x: 10,
    y: 79,
    badge: '!',
  },
  {
    id: 'sanctuary',
    name: 'Sanctuaire de l’Aube',
    label: 'Sanctuaire',
    tag: 'Bénédictions',
    kind: 'Palais des bénédictions',
    description: 'Le cœur sacré d’Astréa, réservé aux bénédictions et à la progression partagée du Serment.',
    icon: Landmark,
    x: 40,
    y: 34,
    badge: '',
  },
  {
    id: 'wishing',
    name: 'Nexus des Constellations',
    label: 'Invocation',
    tag: 'Portail céleste',
    kind: 'Sanctuaire d’invocation',
    description: 'Le Nexus concentre l’énergie des constellations. Le rituel d’invocation sera testé dans sa propre expérience.',
    icon: Sparkles,
    x: 51.5,
    y: 63,
    badge: '1',
  },
  {
    id: 'guild',
    name: 'Forteresse du Serment',
    label: 'Guilde',
    tag: 'Cercle uni',
    kind: 'Quartier général de guilde',
    description: 'Boss communs, guerres de guilde et récompenses collectives vous attendent dans cette forteresse.',
    icon: Shield,
    x: 82,
    y: 53,
    badge: '',
  },
  {
    id: 'tower',
    name: 'Spire des Épreuves',
    label: 'Tour',
    tag: 'Étage 48',
    kind: 'Défi vertical',
    description: 'Gravissez la Spire, repoussez vos limites et découvrez des défis de difficulté croissante.',
    icon: Castle,
    x: 90,
    y: 59,
    badge: '',
  },
  {
    id: 'arena',
    name: 'Arène du Zénith',
    label: 'Arène',
    tag: 'Saison 01',
    kind: 'Combats et classement',
    description: 'Les bannières sont levées. Défendez votre rang et dominez la saison dans l’arène du Zénith.',
    icon: Swords,
    x: 87,
    y: 78,
    badge: '3',
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
  { id: 'events', label: 'Événements', icon: Bell, badge: '2' },
  { id: 'battlepass', label: 'Pass céleste', icon: Crown, badge: '' },
  { id: 'quests', label: 'Quotidiennes', icon: ScrollText, badge: '1' },
  { id: 'tavern-afk', label: 'Taverne AFK', icon: Clock3, badge: '' },
  { id: 'shop', label: 'Offres', icon: ShoppingBag, badge: '3' },
] as const

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function CelestialMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 3 29 15 41 10 35 22 45 28 32 30 32 43 24 34 16 43 16 30 3 28 13 22 7 10 19 15 24 3Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path d="m24 15 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="currentColor" />
    </svg>
  )
}

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null)
  const pointerFrame = useRef(0)
  const pointerTarget = useRef({ x: 0, y: 0 })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [visitedBuildings, setVisitedBuildings] = useState<BuildingId[]>([])
  const [coins, setCoins] = useState(24850)
  const [gems, setGems] = useState(1240)
  const [energy] = useState(86)
  const [tickets, setTickets] = useState(3)
  const [idleSeconds, setIdleSeconds] = useState(10056)
  const [toast, setToast] = useState<string | null>(null)
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [quality, setQuality] = useState<RenderQuality>('auto')
  const [questClaimed, setQuestClaimed] = useState(false)
  const [mailClaimed, setMailClaimed] = useState(false)
  const [mailRead, setMailRead] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
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
    const frame = requestAnimationFrame(() => {
      const map = mapRef.current
      if (map) map.scrollLeft = (map.scrollWidth - map.clientWidth) / 2
    })
    const timer = window.setInterval(() => setIdleSeconds((value) => Math.min(43200, value + 1)), 1000)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMotion(false)
    }
    window.addEventListener('keydown', onKeyDown)
    reducedMotion.addEventListener('change', onMotionChange)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      window.removeEventListener('keydown', onKeyDown)
      reducedMotion.removeEventListener('change', onMotionChange)
    }
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    cancelAnimationFrame(pointerFrame.current)
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
    showToast(`Récolte céleste · +${numberFormat.format(reward)} or`)
  }

  const claimQuest = () => {
    if (questClaimed) return
    setQuestClaimed(true)
    setGems((value) => value + 20)
    showToast('Serment accompli · +20 diamants')
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
    if (!motion || event.pointerType === 'touch') return
    pointerTarget.current = {
      x: (event.clientX / window.innerWidth - 0.5) * 2,
      y: (event.clientY / window.innerHeight - 0.5) * 2,
    }
    if (pointerFrame.current) return
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0
      const map = mapRef.current
      if (!map) return
      map.style.setProperty('--look-x', pointerTarget.current.x.toFixed(3))
      map.style.setProperty('--look-y', pointerTarget.current.y.toFixed(3))
    })
  }

  const resetParallax = () => {
    pointerTarget.current = { x: 0, y: 0 }
    mapRef.current?.style.setProperty('--look-x', '0')
    mapRef.current?.style.setProperty('--look-y', '0')
  }

  const renderDock = () => {
    if (!selection) return null

    if (selectedBuilding) {
      const Icon = selectedBuilding.icon
      return (
        <div className="dock-building">
          <span className={`dock-emblem emblem-${selectedBuilding.id}`}><Icon size={27} /></span>
          <div className="dock-copy">
            <small>{selectedBuilding.kind}</small>
            <h2>{selectedBuilding.name}</h2>
            <p>{selectedBuilding.description}</p>
          </div>
          <div className="dock-building-action">
            <span className="dock-status"><i /> District ouvert</span>
            <button type="button" className="primary-action" onClick={() => showToast(`${selectedBuilding.name} · aperçu du district sélectionné`)}>
              Explorer <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      )
    }

    switch (selection) {
      case 'campaign':
        return (
          <div className="dock-building campaign-dock">
            <span className="dock-emblem"><Map size={27} /></span>
            <div className="dock-copy">
              <small>Chapitre IV · Mission 4-7</small>
              <h2>Le pont des Serments</h2>
              <p>Puissance recommandée : 118 000 · Votre prochaine étape de campagne.</p>
            </div>
            <button type="button" className="primary-action" onClick={() => showToast('Mission 4-7 sélectionnée pour la future page de combat.')}>Continuer <ChevronRight size={15} /></button>
          </div>
        )

      case 'heroes':
        return (
          <div className="dock-building">
            <span className="dock-emblem"><Users size={27} /></span>
            <div className="dock-copy">
              <small>Gestion de l’équipe · 12 héros</small>
              <h2>Héros du Serment</h2>
              <p>Formation, niveaux, équipement et compétences seront regroupés dans la future page Héros.</p>
            </div>
            <span className="dock-status"><i /> 5 places</span>
          </div>
        )

      case 'quests':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><ScrollText size={22} /><span><small>Objectifs quotidiens</small><h2>Serments du jour</h2></span><strong>2 / 3</strong></div>
            <div className="quick-quest">
              <span className={questClaimed ? 'complete' : ''}>{questClaimed ? <Check size={17} /> : <Gift size={17} />}</span>
              <div><strong>Richesse de l’Arbre-monde</strong><small>Récupérer une récolte AFK</small></div>
              <button type="button" disabled={questClaimed} onClick={claimQuest}>{questClaimed ? 'Reçu' : '+20'}<Gem size={13} /></button>
            </div>
          </div>
        )

      case 'bag':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Package size={22} /><span><small>Inventaire</small><h2>Ressources du Voyageur</h2></span><strong>24 / 80</strong></div>
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
          <div className="dock-utility settings-dock">
            <div className="dock-utility-title"><Settings size={22} /><span><small>Moteur de rendu</small><h2>Expérience haute fréquence</h2></span><span className="uncapped-pill">NON PLAFONNÉ</span></div>
            <div className="quality-heading"><Gauge size={17} /><span>Synchronisé sur l’écran · 60 / 120 / 144 / 165 / 240 Hz</span></div>
            <div className="quality-options" role="group" aria-label="Qualité graphique">
              {([
                ['auto', 'Auto'],
                ['ultra', 'Ultra'],
                ['balanced', 'Fluide'],
                ['eco', 'Éco'],
              ] as const).map(([id, label]) => (
                <button type="button" key={id} className={quality === id ? 'active' : ''} aria-pressed={quality === id} onClick={() => setQuality(id)}>{label}</button>
              ))}
            </div>
            <div className="map-options">
              <button type="button" onClick={() => setMotion((value) => !value)} aria-pressed={motion}>
                <Sparkles size={16} /> Ambiance et parallaxe <span className={`mini-toggle ${motion ? 'on' : ''}`}><i /></span>
              </button>
              <button type="button" onClick={() => centerMap(true)}><Crosshair size={16} /> Recentrer la carte <ChevronRight size={15} /></button>
              <button type="button" onClick={toggleFullscreen}><Expand size={16} /> Plein écran <ChevronRight size={15} /></button>
            </div>
          </div>
        )

      case 'events':
        return (
          <div className="dock-building event-dock">
            <span className="dock-emblem"><CelestialMark size={34} /></span>
            <div className="dock-copy">
              <small>Événement saisonnier · Saison 01</small>
              <h2>L’Éveil des Constellations</h2>
              <p>Le Nexus et l’Arbre-monde rayonnent ensemble. Sept jours pour célébrer l’Aube des Étoiles.</p>
            </div>
            <span className="event-days">7 jours</span>
          </div>
        )

      case 'battlepass':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Crown size={22} /><span><small>Aube des Étoiles</small><h2>Pass céleste · Niveau 18</h2></span><strong>720 / 1 000</strong></div>
            <div className="pass-track"><span style={{ width: '72%' }} /><i>18</i><i>19</i><i>20</i></div>
            <p className="panel-note">Prochaine récompense : 100 diamants et 2 parchemins d’invocation.</p>
          </div>
        )

      case 'tavern-afk':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Clock3 size={22} /><span><small>Progression hors ligne</small><h2>Récolte de la Taverne</h2></span><strong>{formatDuration(idleSeconds)}</strong></div>
            <div className="afk-dock-reward">
              <span><Coins size={20} /><strong>+{numberFormat.format(idleGold)}</strong><small>or accumulé</small></span>
              <button type="button" disabled={idleGold === 0} onClick={collectIdle}>{idleGold === 0 ? 'Récolté' : 'Tout récupérer'}<Gift size={15} /></button>
            </div>
          </div>
        )

      case 'shop':
        return (
          <div className="dock-utility shop-dock">
            <div className="dock-utility-title"><ShoppingBag size={22} /><span><small>Offres du magasin</small><h2>Recharger : {shopFocus}</h2></span></div>
            <div className="shop-offers">
              <span><small>Quotidien</small><strong>Pack du Voyageur</strong><i>Gratuit</i></span>
              <span><small>Hebdomadaire</small><strong>Coffre du Serment</strong><i>Aperçu</i></span>
              <span><small>Spécial</small><strong>Pack Constellation</strong><i>Aperçu</i></span>
            </div>
            <p className="panel-note">Vitrine visuelle uniquement · aucun paiement dans ce prototype.</p>
          </div>
        )

      case 'mail':
        return (
          <div className="dock-utility">
            <div className="dock-utility-title"><Mail size={22} /><span><small>Messagerie</small><h2>Cadeau du gardien</h2></span></div>
            <p className="panel-note">Le gardien du Nexus vous offre un parchemin pour le portail d’invocation.</p>
            <button type="button" className="mail-claim" disabled={mailClaimed} onClick={claimMail}>
              <Ticket size={17} /><span>{mailClaimed ? 'Cadeau récupéré' : '1 parchemin d’invocation'}</span>{mailClaimed ? <Check size={16} /> : <Gift size={16} />}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  const cityActive = !selection || Boolean(selectedBuilding && selection !== 'guild')

  return (
    <div className={`city-shell quality-${quality} ${motion ? '' : 'motion-off'}`} onPointerMove={handlePointerMove} onPointerLeave={resetParallax}>
      <div className="city-scroll" ref={mapRef}>
        <div className="city-map">
          <div className="city-world">
            <img
              className="city-art"
              src="assets/astrea-celestia.webp"
              alt="La capitale céleste d’Astréa et ses districts"
              draggable="false"
              fetchPriority="high"
              onError={(event) => {
                const image = event.currentTarget
                if (image.dataset.fallbackApplied) return
                image.dataset.fallbackApplied = 'true'
                image.src = cityArtFallbackUrl
              }}
            />
            <div className="world-color-grade" aria-hidden="true" />

            <div className="portal-effect" aria-hidden="true">
              <i className="portal-aura" />
              <i className="portal-ring ring-a" />
              <i className="portal-ring ring-b" />
              <i className="portal-ring ring-c" />
              <span className="portal-star star-a" />
              <span className="portal-star star-b" />
              <span className="portal-star star-c" />
              <span className="portal-star star-d" />
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
                  <span className="hotspot-beam" aria-hidden="true" />
                  <span className="building-pin"><Icon size={20} /></span>
                  <span className="building-copy"><strong>{building.label}</strong><small>{building.tag}</small></span>
                  {showBadge ? <span className="building-badge">{building.badge}</span> : null}
                </button>
              )
            })}

            <button type="button" className="tree-harvest" onClick={collectIdle} disabled={idleGold === 0}>
              <span className="harvest-heading">
                <span className="harvest-tree-icon"><Trees size={17} /></span>
                <span><small>ARBRE-MONDE</small><strong>Récolte céleste</strong></span>
                <i>{idleGold > 0 ? 'PRÊT' : 'EN CROISSANCE'}</i>
              </span>
              <span className="harvest-content">
                <span className="harvest-chest"><Gift size={24} /><i /></span>
                <span className="harvest-value"><strong>+{numberFormat.format(idleGold)}</strong><small>OR ACCUMULÉ</small></span>
                <span className="harvest-time">{formatDuration(idleSeconds)}</span>
              </span>
              <span className="harvest-gauge"><i style={{ width: `${Math.max(3, idlePercent)}%` }} /></span>
              <span className="harvest-cta">{idleGold > 0 ? 'Récupérer la récolte' : 'Accumulation en cours'}<ChevronRight size={13} /></span>
            </button>
          </div>

          <div className="sun-rays" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </div>

      <div className="screen-shade" aria-hidden="true" />
      <Atmosphere enabled={motion} quality={quality} />

      <header className="city-topbar">
        <div className="player-hud">
          <div className="vip-avatar">
            <img src="assets/avatar-aelion.webp" alt="Avatar d’Aelion" />
            <span><Crown size={9} /> VIP 6</span>
            <i>47</i>
          </div>
          <div className="player-data">
            <div className="player-name"><strong>Aelion</strong><small>GARDIEN DU NEXUS</small></div>
            <div className="power-rating"><Zap size={13} /><strong>1 284 530</strong><small>PUISSANCE</small></div>
            <div className="power-bar"><span /></div>
          </div>
        </div>

        <div className="city-heading">
          <small><i /> CAPITALE CÉLESTE <i /></small>
          <div><CelestialMark size={35} /><strong>ASTRÉA</strong><CelestialMark size={35} /></div>
          <span>DISTRICT DU SERMENT</span>
        </div>

        <div className="resource-hud">
          <div className="resource-chip gold">
            <span className="resource-orb"><Coins size={17} /></span>
            <span className="resource-text"><small>OR</small><strong>{numberFormat.format(coins)}</strong></span>
            <button type="button" aria-label="Obtenir de l’or" onClick={() => openShop('Or')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip diamond">
            <span className="resource-orb"><Gem size={17} /></span>
            <span className="resource-text"><small>DIAMANTS</small><strong>{numberFormat.format(gems)}</strong></span>
            <button type="button" aria-label="Obtenir des diamants" onClick={() => openShop('Diamants')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip energy">
            <span className="resource-orb"><Zap size={17} /></span>
            <span className="resource-text"><small>ÉNERGIE</small><strong>{energy} / 120</strong></span>
            <button type="button" aria-label="Obtenir de l’énergie" onClick={() => openShop('Énergie')}><Plus size={14} /></button>
          </div>
          <div className="resource-chip scroll">
            <span className="resource-orb"><Ticket size={17} /></span>
            <span className="resource-text"><small>PARCHEMINS</small><strong>{tickets}</strong></span>
            <button type="button" aria-label="Obtenir des parchemins" onClick={() => openShop('Parchemins')}><Plus size={14} /></button>
          </div>
        </div>
      </header>

      <aside className="left-tools" aria-label="Outils">
        <button type="button" onClick={() => { setSelection('mail'); setMailRead(true) }} className={selection === 'mail' ? 'active' : ''} aria-label="Messages">
          <span><Mail size={19} />{!mailRead ? <i>1</i> : null}</span><small>Messages</small>
        </button>
        <button type="button" onClick={() => setSelection('settings')} className={selection === 'settings' ? 'active' : ''} aria-label="Options graphiques">
          <span><Settings size={19} /></span><small>Options</small>
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Plein écran">
          <span><Expand size={19} /></span><small>Plein écran</small>
        </button>
      </aside>

      <button type="button" className="quest-tracker" onClick={() => setSelection('quests')}>
        <span className="quest-tracker-top"><small>QUÊTES</small><strong>2 / 3</strong></span>
        <span className="quest-tracker-title"><Gift size={15} /><strong>Récolte disponible</strong><ChevronRight size={14} /></span>
        <span className="quest-tracker-progress"><i /></span>
      </button>

      <aside className={`quick-rail ${quickOpen ? 'open' : 'closed'}`}>
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setQuickOpen((value) => !value)}
          aria-label={quickOpen ? 'Rétracter les accès rapides' : 'Afficher les accès rapides'}
          aria-expanded={quickOpen}
          aria-controls="quick-rail-items"
        >
          {quickOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span className="rail-toggle-label">{quickOpen ? 'Fermer' : 'Menu'}</span>
        </button>
        {quickOpen ? (
          <div className="quick-rail-items" id="quick-rail-items">
            {quickItems.map((item) => {
              const Icon = item.icon
              return (
                <button type="button" key={item.id} className={selection === item.id ? 'active' : ''} onClick={() => { setSelection(item.id); setQuickOpen(false) }}>
                  <span className="quick-icon"><Icon size={20} />{item.badge ? <i>{item.badge}</i> : null}</span>
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
      <button type="button" className="map-recenter" onClick={() => centerMap(true)}><Crosshair size={16} /><span>Recentrer</span></button>

      {selection ? (
        <section className={`city-dock ${selectedBuilding ? 'is-building' : 'is-utility'} ${selection === 'settings' ? 'is-settings' : ''}`} aria-label="Détails">
          <i className="panel-corner corner-a" aria-hidden="true" /><i className="panel-corner corner-b" aria-hidden="true" />
          {renderDock()}
          <button type="button" className="dock-close" aria-label="Fermer" onClick={() => setSelection(null)}><X size={17} /></button>
        </section>
      ) : null}

      <nav className="city-nav" aria-label="Navigation principale">
        <button type="button" className={selection === 'campaign' ? 'active' : ''} onClick={() => setSelection('campaign')}>
          <span className="nav-medallion"><Map size={22} /></span><span className="nav-label">Campagne</span>
        </button>
        <button type="button" className={cityActive ? 'active city-active' : ''} onClick={() => { setSelection(null); centerMap(true) }}>
          <i className="nav-active-gem" aria-hidden="true" /><span className="nav-medallion"><CelestialMark size={27} /></span><span className="nav-label">Cité</span>
        </button>
        <button type="button" className={selection === 'heroes' ? 'active' : ''} onClick={() => setSelection('heroes')}>
          <span className="nav-medallion"><Users size={22} /><i className="nav-badge">!</i></span><span className="nav-label">Héros</span>
        </button>
        <button type="button" className={selection === 'bag' ? 'active' : ''} onClick={() => setSelection('bag')}>
          <span className="nav-medallion"><Package size={22} /></span><span className="nav-label">Sac</span>
        </button>
        <button type="button" className={selection === 'guild' ? 'active' : ''} onClick={() => selectBuilding('guild')}>
          <span className="nav-medallion"><Shield size={22} /></span><span className="nav-label">Guilde</span>
        </button>
      </nav>

      {toast ? <div className="city-toast" role="status"><span><Check size={15} /></span>{toast}</div> : null}
    </div>
  )
}
