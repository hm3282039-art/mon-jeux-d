import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  clamp,
  easeIn,
  easeInOut,
  easeOut,
  keyed,
  lerp,
  radians,
  seededRandom,
  segment,
  smooth,
} from './math'
import { HERO_PRESENTATION, RigLibrary, rigPoint } from './rig'
import type { HeroId, RigPose, RigTransform } from './rig'

export type UltimateMode = 'full' | 'short' | 'instant'
export type { HeroId } from './rig'

export type RenderFrame = {
  time: number
  realTime: number
  ambient: number
  mode: UltimateMode
  hero: HeroId
  active: boolean
  impactApplied: boolean
}

type Point = { x: number; y: number }
type Camera = {
  focusX: number
  focusY: number
  zoom: number
  rotation: number
  screenX: number
  screenY: number
}
type SceneState = {
  transform: RigTransform
  pose: RigPose
  charge: number
}

const TAU = Math.PI * 2
const GOLEM_X = 970
const GOLEM_GROUND = 575
const CAMERA_BASE: Camera = {
  focusX: 640,
  focusY: 360,
  zoom: 1,
  rotation: 0,
  screenX: 640,
  screenY: 360,
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Point[],
  fill: string | CanvasGradient,
  stroke = '#101827',
  lineWidth = 2,
) {
  if (!points.length) return
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y)
  context.closePath()
  context.fillStyle = fill
  context.fill()
  if (lineWidth > 0) {
    context.strokeStyle = stroke
    context.lineWidth = lineWidth
    context.lineJoin = 'round'
    context.stroke()
  }
}

function segmentShape(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  startWidth: number,
  endWidth: number,
  fill: string | CanvasGradient,
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const nx = -dy / length
  const ny = dx / length
  polygon(context, [
    { x: start.x + nx * startWidth, y: start.y + ny * startWidth },
    { x: end.x + nx * endWidth, y: end.y + ny * endWidth },
    { x: end.x - nx * endWidth, y: end.y - ny * endWidth },
    { x: start.x - nx * startWidth, y: start.y - ny * startWidth },
  ], fill)
}

function kaelisState(time: number, ambient: number): SceneState {
  const pose: RigPose = {
    torso: keyed(time, [[0, 0], [0.48, 7], [0.85, 4], [1.3, 0], [1.45, 9], [2, 12], [2.35, -8], [3.05, -16], [3.45, 18], [4.5, 24], [4.85, -14], [5.35, 18], [5.95, 5], [6.5, 0], [8, 0]]),
    head: keyed(time, [[0, 0], [0.5, -7], [0.78, -4], [1.05, 2], [1.4, -6], [2.35, 8], [3.1, -8], [3.8, 4], [4.5, -7], [5.2, 10], [6.1, -4], [8, 0]]),
    armWeapon: keyed(time, [[0, 0], [0.5, 18], [0.85, 45], [1.25, 55], [1.45, 10], [2, -12], [2.35, 65], [3.05, 85], [3.45, 28], [4.5, 35], [4.85, -25], [5.35, 25], [6.1, 0], [8, 0]], easeInOut),
    forearmWeapon: keyed(time, [[0, 0], [0.55, -15], [0.9, -30], [1.3, -20], [1.5, 15], [2.35, 25], [3.05, 35], [3.45, -10], [4.5, -15], [5.2, 25], [6.2, 0], [8, 0]]),
    armFree: keyed(time, [[0, 0], [0.5, -18], [1.3, -10], [1.5, 25], [2, -30], [2.35, -55], [3.1, -75], [3.45, 35], [4.5, 45], [5.1, -20], [5.8, 10], [6.5, 0], [8, 0]]),
    forearmFree: keyed(time, [[0, 0], [0.6, -25], [1.3, -15], [1.6, 30], [2.35, -35], [3.2, -20], [4.5, 20], [5.4, -15], [6.4, 0], [8, 0]]),
    legBack: keyed(time, [[0, 0], [0.5, 18], [1.3, 5], [2, -35], [2.35, 45], [3.1, -25], [3.45, 12], [4.5, 20], [4.85, -35], [5.35, 40], [6.1, 5], [8, 0]]),
    legBackLower: keyed(time, [[0, 0], [0.5, 35], [1.3, 5], [2, 25], [2.35, 75], [3.1, 15], [3.45, -10], [4.5, -12], [4.85, 30], [5.35, 70], [6.2, 0], [8, 0]]),
    legFront: keyed(time, [[0, 0], [0.5, -22], [1.3, -5], [2, 35], [2.35, -40], [3.1, 35], [3.45, -12], [4.5, -18], [4.85, 40], [5.35, -35], [6.1, 0], [8, 0]]),
    legFrontLower: keyed(time, [[0, 0], [0.5, 40], [1.3, 5], [2, 45], [2.35, 20], [3.1, 65], [3.45, 5], [4.5, 10], [4.85, 55], [5.35, 20], [6.2, 0], [8, 0]]),
    cape: keyed(time, [[0, 0], [0.55, -4], [1.35, 8], [2, 18], [2.35, 25], [3.4, 15], [4.5, 28], [5.2, 18], [6.4, 0], [8, 0]]),
    capeTip: keyed(time, [[0, 0], [1.35, -8], [2.35, -18], [3.45, -12], [4.5, -22], [5.4, -8], [6.5, 0], [8, 0]]),
    skirt: keyed(time, [[0, 0], [0.5, 4], [1.4, 8], [2.35, 14], [3.45, 8], [4.5, 16], [5.5, 6], [6.5, 0], [8, 0]]),
    hair: keyed(time, [[0, 0], [0.7, 3], [1.4, 8], [2.35, 12], [3.45, 8], [4.5, 15], [5.6, 4], [6.5, 0], [8, 0]]),
    eye: keyed(time, [[0, 1], [0.45, 0.2], [0.72, 0.1], [0.94, 1], [4.48, 1], [4.56, 0.25], [4.72, 1], [8, 1]]),
    shout: keyed(time, [[0, 0], [3.65, 0], [3.95, 0.85], [4.5, 1], [4.85, 0], [8, 0]]),
  }

  if (time >= 1.35 && time < 2.04) {
    const phase = (time - 1.35) * 19
    const swing = Math.sin(phase)
    const blend = smooth(segment(time, 1.35, 1.46))
    pose.legFront = lerp(pose.legFront, swing * 42, blend)
    pose.legBack = lerp(pose.legBack, -swing * 42, blend)
    pose.legFrontLower = lerp(pose.legFrontLower, 15 + Math.max(0, -swing) * 48, blend)
    pose.legBackLower = lerp(pose.legBackLower, 15 + Math.max(0, swing) * 48, blend)
    pose.armFree += swing * 28
  }
  if (time > 6.85) {
    const walk = Math.sin((time - 6.85) * 15) * (1 - segment(time, 7.65, 8))
    pose.legFront += walk * 24
    pose.legBack -= walk * 24
    pose.armFree += walk * 12
  }
  pose.cape += Math.sin(ambient * 5.4) * 2.5
  pose.capeTip += Math.sin(ambient * 7.1 + 1) * 4
  pose.hair += Math.sin(ambient * 8.2) * 2
  pose.skirt += Math.sin(ambient * 5.8) * 1.5
  const desiredWeapon = keyed(time, [[0, 0], [0.55, -12], [0.95, -85], [1.3, -105], [1.45, -15], [2, -20], [2.35, -135], [3.05, -155], [3.45, -25], [4.5, -18], [4.85, -60], [5.35, -95], [5.9, -40], [6.3, 120], [6.6, 240], [6.9, 360], [8, 360]], easeInOut)
  pose.weapon = desiredWeapon - pose.armWeapon - pose.forearmWeapon - pose.torso

  const transform: RigTransform = { x: 350, y: 568, scale: 1, rotation: 0, facing: 1 }
  transform.y += keyed(time, [[0, 0], [0.48, 18], [1.3, 0], [8, 0]])
  if (time >= 1.35 && time < 2.35) {
    const run = easeInOut(segment(time, 1.35, 2.35))
    transform.x = lerp(350, 650, run)
    const leap = easeOut(segment(time, 1.96, 2.35))
    transform.y = 568 - leap * 142 - Math.abs(Math.sin((time - 1.35) * 19)) * 5 * (1 - leap)
    transform.rotation = keyed(time, [[1.35, 0], [1.95, 4], [2.35, -18]])
  } else if (time >= 2.35 && time < 3.45) {
    const air = smooth(segment(time, 2.35, 3.45))
    transform.x = lerp(650, 790, air)
    transform.y = lerp(426, 266, air) - Math.sin(air * Math.PI) * 74
    transform.rotation = keyed(time, [[2.35, -18], [2.8, -48], [3.2, 5], [3.45, 48]], easeInOut)
    transform.scale = 1.04
  } else if (time >= 3.45 && time < 4.5) {
    const dive = easeIn(segment(time, 3.45, 4.5))
    transform.x = lerp(790, 770, dive)
    transform.y = lerp(266, 408, dive)
    transform.rotation = lerp(48, 55, dive)
    transform.scale = lerp(1.04, 1, dive)
  } else if (time >= 4.5 && time < 5.65) {
    transform.x = keyed(time, [[4.5, 770], [4.7, 730], [5.18, 590], [5.65, 555]], easeOut)
    transform.y = keyed(time, [[4.5, 408], [4.72, 456], [5.18, 568], [5.65, 568]], easeOut)
    transform.rotation = keyed(time, [[4.5, 55], [4.72, 18], [5.05, -12], [5.65, 0]], easeOut)
    transform.y -= Math.sin(easeOut(segment(time, 4.5, 5.18)) * Math.PI) * 24
  } else if (time >= 5.65) {
    transform.x = keyed(time, [[5.65, 555], [7, 555], [8, 350]], easeInOut)
    transform.y = 568 + keyed(time, [[5.65, 18], [6.2, 0], [8, 0]])
  }
  const charge = smooth(segment(time, 0.48, 1.15)) * (1 - segment(time, 4.7, 5.15)) + 0.12
  return { transform, pose, charge }
}

function nyxaraState(time: number, ambient: number): SceneState {
  const power = smooth(segment(time, 0.5, 2.5)) * (1 - segment(time, 5.2, 6.4))
  const pose: RigPose = {
    torso: keyed(time, [[0, 0], [0.5, 5], [0.9, 2], [1.35, -4], [2.35, -7], [3.2, 4], [3.65, 12], [4.5, 16], [4.9, -10], [5.6, 6], [6.5, 0], [8, 0]]),
    head: keyed(time, [[0, 0], [0.5, -6], [0.85, -3], [1.1, 3], [1.5, -5], [2.6, 6], [3.3, -8], [4.2, 7], [4.7, -6], [5.8, 3], [8, 0]]),
    armLeft: keyed(time, [[0, 0], [0.55, -12], [0.95, -28], [1.35, -35], [2.35, -55], [3.15, -25], [3.65, 30], [4.5, 42], [5, -18], [5.8, -8], [6.7, 0], [8, 0]], easeInOut),
    forearmLeft: keyed(time, [[0, 0], [0.6, -18], [1.2, -30], [2.35, -45], [3.1, -15], [3.7, 25], [4.5, 35], [5.1, -20], [6.4, 0], [8, 0]]),
    armRight: keyed(time, [[0, 0], [0.55, 8], [1.25, 18], [2.35, 28], [3.1, 15], [3.65, -35], [4.5, -48], [5.1, 20], [5.9, 5], [6.7, 0], [8, 0]], easeInOut),
    forearmRight: keyed(time, [[0, 0], [0.65, -10], [1.3, -20], [2.35, -25], [3.3, 5], [4.5, -20], [5.2, 15], [6.5, 0], [8, 0]]),
    legBack: keyed(time, [[0, 0], [1.35, -8], [2.35, -18], [3.2, 12], [4.5, 18], [5.4, -8], [6.5, 0], [8, 0]]),
    legBackLower: keyed(time, [[0, 0], [1.35, 10], [2.35, 24], [3.4, 12], [4.7, 20], [5.8, 0], [8, 0]]),
    legFront: keyed(time, [[0, 0], [1.35, 8], [2.35, 15], [3.2, -12], [4.5, -18], [5.4, 8], [6.5, 0], [8, 0]]),
    legFrontLower: keyed(time, [[0, 0], [1.35, 12], [2.35, 20], [3.4, 8], [4.7, 15], [5.8, 0], [8, 0]]),
    dressLeft: -power * 10 + Math.sin(ambient * 3.7) * (2 + power * 4),
    dressRight: power * 10 + Math.sin(ambient * 4.1 + 1.4) * (2 + power * 4),
    dressCenter: Math.sin(ambient * 4.5 + 0.5) * (1.5 + power * 2.5),
    hairLeft: -power * 12 + Math.sin(ambient * 4.3) * (3 + power * 5),
    hairRight: power * 12 + Math.sin(ambient * 4.8 + 1) * (3 + power * 5),
    eye: keyed(time, [[0, 1], [0.48, 0.15], [0.75, 0.08], [0.98, 1], [4.48, 1], [4.58, 0.3], [4.75, 1], [8, 1]]),
    shout: keyed(time, [[0, 0], [3.7, 0], [4.05, 0.7], [4.5, 0.85], [4.85, 0], [8, 0]]),
  }
  const desiredStaff = keyed(time, [[0, 0], [0.6, -8], [1.3, -18], [2.35, -30], [3.1, -15], [3.65, 45], [4.5, 65], [5.1, 15], [5.9, -10], [6.5, 0], [8, 0]], easeInOut)
  pose.staff = desiredStaff - pose.armRight - pose.forearmRight - pose.torso

  const transform: RigTransform = { x: 350, y: 548, scale: 1, rotation: 0, facing: 1 }
  transform.y += keyed(time, [[0, 0], [0.5, 12], [1.2, 0], [8, 0]])
  if (time >= 1.35 && time < 2.35) {
    const rise = easeInOut(segment(time, 1.35, 2.35))
    transform.x = lerp(350, 520, rise)
    transform.y = lerp(548, 350, rise) - Math.sin(rise * Math.PI) * 35
    transform.rotation = lerp(0, -8, rise)
  } else if (time >= 2.35 && time < 3.45) {
    const orbit = smooth(segment(time, 2.35, 3.45))
    transform.x = lerp(520, 650, orbit)
    transform.y = lerp(350, 288, orbit) - Math.sin(orbit * Math.PI) * 25
    transform.rotation = keyed(time, [[2.35, -8], [2.85, 8], [3.45, -4]], easeInOut)
  } else if (time >= 3.45 && time < 4.5) {
    const cast = easeInOut(segment(time, 3.45, 4.5))
    transform.x = lerp(650, 680, cast)
    transform.y = lerp(288, 355, cast)
    transform.rotation = lerp(-4, 8, cast)
  } else if (time >= 4.5 && time < 5.65) {
    const recover = easeOut(segment(time, 4.5, 5.65))
    transform.x = lerp(680, 500, recover)
    transform.y = lerp(355, 548, recover) - Math.sin(recover * Math.PI) * 30
    transform.rotation = keyed(time, [[4.5, 8], [4.8, -12], [5.65, 0]], easeOut)
  } else if (time >= 5.65) {
    transform.x = keyed(time, [[5.65, 500], [7, 500], [8, 350]], easeInOut)
    transform.y = 548 + Math.sin(ambient * 2) * 2
  }
  return { transform, pose, charge: 0.15 + power * 0.85 }
}

function stateAt(hero: HeroId, time: number, ambient: number) {
  return hero === 'kaelis' ? kaelisState(time, ambient) : nyxaraState(time, ambient)
}

function idleState(hero: HeroId, ambient: number): SceneState {
  if (hero === 'kaelis') {
    return {
      transform: { x: 350, y: 568, scale: 1, rotation: 0, facing: 1 },
      pose: {
        torso: Math.sin(ambient * 1.6) * 0.8,
        head: Math.sin(ambient * 1.1) * 1.2,
        hair: Math.sin(ambient * 4.2) * 2,
        cape: Math.sin(ambient * 2.8) * 2,
        capeTip: Math.sin(ambient * 3.7 + 1) * 3,
        skirt: Math.sin(ambient * 3) * 1,
        eye: 1,
      },
      charge: 0.12,
    }
  }
  return {
    transform: { x: 350, y: 548 + Math.sin(ambient * 1.7) * 5, scale: 1, rotation: Math.sin(ambient * 0.9) * 0.7, facing: 1 },
    pose: {
      torso: Math.sin(ambient * 1.4) * 1.1,
      head: Math.sin(ambient * 1.1) * 1.4,
      hairLeft: Math.sin(ambient * 3.1) * 4,
      hairRight: Math.sin(ambient * 3.5 + 1) * 4,
      dressLeft: Math.sin(ambient * 2.8) * 2.5,
      dressRight: Math.sin(ambient * 3.2 + 1) * 2.5,
      dressCenter: Math.sin(ambient * 2.5) * 1.5,
      eye: 1,
    },
    charge: 0.18,
  }
}

function headPoint(hero: HeroId, state: SceneState): [number, number] {
  return rigPoint(hero, state.pose, state.transform, 'head', hero === 'kaelis' ? [455, 180] : [435, 225])
}

function cameraAt(hero: HeroId, time: number, ambient: number, state: SceneState): Camera {
  let camera = { ...CAMERA_BASE }
  const [headX, headY] = headPoint(hero, state)
  if (time < 0.55) {
    const push = smooth(segment(time, 0, 0.55))
    camera = { ...camera, focusX: lerp(640, 520, push), focusY: lerp(370, 390, push), zoom: lerp(0.96, 1.14, push) }
  } else if (time < 1.35) {
    const push = smooth(segment(time, 0.55, 1.35))
    camera = {
      focusX: headX,
      focusY: headY,
      zoom: lerp(2.15, 2.72, push),
      rotation: lerp(-0.025, 0.018, push),
      screenX: lerp(700, 755, push),
      screenY: 315,
    }
  } else if (time < 2.35) {
    const track = smooth(segment(time, 1.35, 2.35))
    camera = { ...camera, focusX: lerp(480, hero === 'kaelis' ? 675 : 590, track), focusY: lerp(390, 330, track), zoom: 1.06, screenY: 385 }
  } else if (time < 3.45) {
    const orbit = smooth(segment(time, 2.35, 3.45))
    camera = {
      focusX: lerp(state.transform.x - 20, state.transform.x + 15, orbit),
      focusY: state.transform.y - 100,
      zoom: lerp(0.96, 1.12, orbit),
      rotation: lerp(-0.1, 0.09, orbit),
      screenX: 640,
      screenY: 390,
    }
  } else if (time < 4.5) {
    const chase = easeIn(segment(time, 3.45, 4.5))
    camera = {
      focusX: lerp(hero === 'kaelis' ? 785 : 690, 865, chase),
      focusY: lerp(hero === 'kaelis' ? 300 : 330, 420, chase),
      zoom: lerp(0.91, 1.04, chase),
      rotation: lerp(-0.1, -0.025, chase),
      screenX: 630,
      screenY: 370,
    }
  } else if (time < 5.65) {
    const settle = easeOut(segment(time, 4.5, 5.65))
    const shake = 21 * Math.exp(-(time - 4.5) * 4.7)
    camera = {
      focusX: lerp(855, 760, settle) + Math.sin(ambient * 91) * shake,
      focusY: lerp(425, 405, settle) + Math.cos(ambient * 77) * shake * 0.65,
      zoom: lerp(1.13, 1.02, settle),
      rotation: Math.sin(ambient * 67) * shake * 0.0015,
      screenX: 640,
      screenY: 370,
    }
  } else if (time < 6.75) {
    const recover = smooth(segment(time, 5.65, 6.75))
    camera = { ...camera, focusX: lerp(745, 690, recover), focusY: 400, zoom: lerp(1.06, 1.14, recover), screenY: 380 }
  } else {
    const restore = smooth(segment(time, 6.75, 8))
    camera = { ...camera, focusX: lerp(690, 640, restore), focusY: lerp(400, 360, restore), zoom: lerp(1.14, 1, restore), screenY: lerp(380, 360, restore) }
  }
  return camera
}

function applyCamera(context: CanvasRenderingContext2D, camera: Camera) {
  context.translate(camera.screenX, camera.screenY)
  context.scale(camera.zoom, camera.zoom)
  context.rotate(camera.rotation)
  context.translate(-camera.focusX, -camera.focusY)
}

export class ZenithRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly arena: HTMLImageElement
  private readonly rigs = new RigLibrary()
  private readonly stars: Array<{ x: number; y: number; size: number; phase: number }>
  private readonly debris: Array<{ angle: number; speed: number; size: number; spin: number; lift: number }>

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas 2D indisponible')
    this.context = context
    this.arena = new Image()
    this.arena.src = './assets/ultimate/zenith-arena.webp'
    const random = seededRandom(41027)
    this.stars = Array.from({ length: 90 }, () => ({ x: random() * 1280, y: random() * 540, size: 0.6 + random() * 2.1, phase: random() * TAU }))
    this.debris = Array.from({ length: 30 }, () => ({ angle: lerp(-2.8, -0.25, random()), speed: 110 + random() * 330, size: 3 + random() * 10, spin: (random() - 0.5) * 13, lift: 50 + random() * 160 }))
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect()
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const width = Math.max(1, Math.round(bounds.width * ratio))
    const height = Math.max(1, Math.round(bounds.height * ratio))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  render(frame: RenderFrame) {
    this.resize()
    const context = this.context
    context.setTransform(this.canvas.width / STAGE_WIDTH, 0, 0, this.canvas.height / STAGE_HEIGHT, 0, 0)
    context.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
    context.imageSmoothingEnabled = true
    if (!frame.active) this.drawIdle(frame)
    else if (frame.mode === 'instant') this.drawInstant(frame)
    else this.drawCinematic(frame)
  }

  private drawIdle(frame: RenderFrame) {
    const context = this.context
    const state = idleState(frame.hero, frame.ambient)
    const camera = { ...CAMERA_BASE, focusX: 640 + Math.sin(frame.ambient * 0.18) * 3 }
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, 0, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.5, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, frame.hero === 'nyxara' ? 0.16 : 0.24)
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    this.drawGolem(frame.impactApplied ? 8 : 0, frame.ambient, false, frame.hero)
    this.rigs.draw(context, frame.hero, state.pose, state.transform, frame.ambient, state.charge)
    context.restore()
    this.drawVignette(0.34)
  }

  private drawCinematic(frame: RenderFrame) {
    const context = this.context
    const time = frame.time
    const state = stateAt(frame.hero, time, frame.ambient)
    const camera = cameraAt(frame.hero, time, frame.ambient, state)
    const voidAmount = smooth(segment(time, 0.42, 0.72)) * (1 - smooth(segment(time, 1.18, 1.55)))
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, voidAmount, frame.hero)
    if (voidAmount > 0.01) this.drawVoid(frame.ambient, voidAmount, frame.hero)
    this.drawMagic(time, frame.ambient, state, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.65, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, 0.25 * clamp(1 - (568 - state.transform.y) / 420, 0.1, 1))
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    if (frame.hero === 'kaelis') this.drawPhoenix(time, frame.ambient, state)
    else this.drawAstralSerpent(time, frame.ambient, state)
    this.drawGolem(time, frame.ambient, true, frame.hero)
    this.rigs.draw(context, frame.hero, state.pose, state.transform, frame.ambient, state.charge)
    this.drawWeaponTrails(time, frame.ambient, frame.hero)
    this.drawImpactWorld(time, frame.ambient, frame.hero)
    context.restore()
    if (time >= 3.45 && time < 4.5) this.drawSpeedLines(time, frame.ambient, frame.hero)
    this.drawImpactScreen(time, frame.hero)
    this.drawCinematicText(time, frame.hero)
    this.drawVignette(time >= 0.55 && time < 1.35 ? 0.56 : 0.4)
    const bars = smooth(segment(time, 0, 0.18)) * (1 - smooth(segment(time, 7.35, 8)))
    this.drawLetterbox(bars)
  }

  private drawInstant(frame: RenderFrame) {
    const context = this.context
    const time = frame.realTime
    const hitTime = 0.32
    const visualTime = time < hitTime ? 4.49 : 4.5 + (time - hitTime) * 4
    const state = stateAt(frame.hero, time < 0.4 ? 4.25 : lerp(5.2, 6.5, segment(time, 0.4, 0.7)), frame.ambient)
    if (frame.hero === 'kaelis') {
      state.transform.x = keyed(time, [[0, 350], [0.1, 350], [0.3, 760], [0.39, 745], [0.7, 350]], easeInOut)
      state.transform.y = keyed(time, [[0, 568], [0.12, 568], [0.3, 430], [0.4, 480], [0.7, 568]], easeInOut)
      state.transform.rotation = keyed(time, [[0, 0], [0.12, 0], [0.32, 52], [0.42, 10], [0.7, 0]])
    } else {
      state.transform.x = 350
      state.transform.y = 548
      state.transform.rotation = 0
    }
    context.save()
    applyCamera(context, CAMERA_BASE)
    this.drawArena(frame.ambient, 0, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.5, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, 0.2)
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    if (frame.hero === 'nyxara' && time > 0.08) this.drawInstantAstralBolt(time)
    this.drawGolem(visualTime, frame.ambient, true, frame.hero)
    this.rigs.draw(context, frame.hero, state.pose, state.transform, frame.ambient, 0.8)
    if (time >= hitTime) this.drawImpactWorld(visualTime, frame.ambient, frame.hero)
    context.restore()
    if (time >= hitTime) {
      this.drawImpactScreen(visualTime, frame.hero)
      this.drawDamage(visualTime, frame.hero, 0.9)
    }
    this.drawVignette(0.34)
  }

  private drawArena(ambient: number, voidAmount: number, hero: HeroId) {
    const context = this.context
    const gradient = context.createLinearGradient(0, 0, 0, 720)
    gradient.addColorStop(0, hero === 'kaelis' ? '#07172f' : '#100b2c')
    gradient.addColorStop(0.58, hero === 'kaelis' ? '#173d5c' : '#292054')
    gradient.addColorStop(1, '#091324')
    context.fillStyle = gradient
    context.fillRect(-500, -400, 2280, 1520)
    if (this.arena.complete && this.arena.naturalWidth > 0) {
      context.globalAlpha = 1 - voidAmount * 0.9
      context.drawImage(this.arena, 0, 0, 1280, 720)
      context.globalAlpha = 1
    }
    const tint = context.createLinearGradient(0, 0, 1280, 300)
    tint.addColorStop(0, hero === 'kaelis' ? 'rgba(255, 174, 73, 0.035)' : 'rgba(170, 93, 255, 0.055)')
    tint.addColorStop(0.55, 'rgba(72, 122, 255, 0.025)')
    tint.addColorStop(1, `rgba(105, 235, 255, ${0.025 + Math.sin(ambient * 0.4) * 0.01})`)
    context.fillStyle = tint
    context.fillRect(0, 0, 1280, 720)
  }

  private drawVoid(ambient: number, amount: number, hero: HeroId) {
    const context = this.context
    context.save()
    context.globalAlpha = amount
    const gradient = context.createRadialGradient(350, 350, 20, 500, 350, 800)
    gradient.addColorStop(0, hero === 'kaelis' ? 'rgba(83, 54, 36, 0.42)' : 'rgba(63, 35, 105, 0.48)')
    gradient.addColorStop(0.45, 'rgba(5, 15, 39, 0.88)')
    gradient.addColorStop(1, 'rgba(2, 5, 20, 0.98)')
    context.fillStyle = gradient
    context.fillRect(-600, -500, 2480, 1720)
    this.stars.forEach(star => {
      context.fillStyle = hero === 'kaelis'
        ? `rgba(255, 220, 157, ${0.3 + Math.sin(ambient * 2 + star.phase) * 0.25})`
        : `rgba(191, 172, 255, ${0.3 + Math.sin(ambient * 2 + star.phase) * 0.25})`
      context.beginPath()
      context.arc(star.x, star.y, star.size, 0, TAU)
      context.fill()
    })
    context.restore()
  }

  private drawAmbientMotes(ambient: number, opacity: number, hero: HeroId) {
    const context = this.context
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 173.3 + ambient * (4 + index % 4)) % 1360 - 40
      const y = 180 + (index * 83) % 470 + Math.sin(ambient * 0.7 + index) * 18
      const alpha = (0.12 + Math.sin(ambient * 1.4 + index * 2.1) * 0.08) * opacity
      context.fillStyle = hero === 'kaelis' ? `rgba(255, 205, 119, ${alpha})` : `rgba(174, 157, 255, ${alpha})`
      context.beginPath()
      context.arc(x, y, 1 + index % 3 * 0.45, 0, TAU)
      context.fill()
    }
    context.restore()
  }

  private drawMagic(time: number, ambient: number, state: SceneState, hero: HeroId) {
    const context = this.context
    const charge = smooth(segment(time, 0.48, 1.15)) * (1 - smooth(segment(time, 1.25, 1.5)))
    const aerial = smooth(segment(time, 2.25, 2.65)) * (1 - smooth(segment(time, 3.35, 3.65)))
    const strength = Math.max(charge, aerial)
    if (strength <= 0.005) return
    const point = charge > aerial
      ? rigPoint(hero, state.pose, state.transform, 'torso', hero === 'kaelis' ? [450, 400] : [435, 400])
      : [state.transform.x, state.transform.y - 100]
    context.save()
    context.translate(point[0], point[1])
    context.globalCompositeOperation = 'lighter'
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = (82 + ring * 48 + Math.sin(ambient * 2 + ring) * 7) * (0.75 + strength * 0.25)
      context.save()
      context.rotate(ambient * (ring % 2 ? -0.24 : 0.18) + ring)
      context.scale(1, 0.38 + ring * 0.12)
      context.strokeStyle = hero === 'kaelis'
        ? `rgba(255, 205, 112, ${0.18 + strength * 0.32})`
        : `rgba(${ring === 1 ? '191, 137, 255' : '101, 241, 245'}, ${0.18 + strength * 0.32})`
      context.lineWidth = 1.5 + strength
      context.setLineDash([12 + ring * 3, 9])
      context.beginPath()
      context.arc(0, 0, radius, 0, TAU)
      context.stroke()
      context.setLineDash([])
      for (let tick = 0; tick < 8; tick += 1) {
        const angle = tick / 8 * TAU
        context.beginPath()
        context.moveTo(Math.cos(angle) * (radius - 7), Math.sin(angle) * (radius - 7))
        context.lineTo(Math.cos(angle) * (radius + 7), Math.sin(angle) * (radius + 7))
        context.stroke()
      }
      context.restore()
    }
    context.restore()
  }

  private drawWeaponTrails(time: number, ambient: number, hero: HeroId) {
    if (time < 1.35 || time > 4.65) return
    const context = this.context
    const bone = hero === 'kaelis' ? 'weapon' : 'staff'
    const source: [number, number] = hero === 'kaelis' ? [570, 1145] : [755, 220]
    const points: Array<[number, number]> = []
    for (let index = 8; index >= 0; index -= 1) {
      const sampleTime = Math.max(1.35, time - index * 0.026)
      const state = stateAt(hero, sampleTime, ambient - index * 0.026)
      points.push(rigPoint(hero, state.pose, state.transform, bone, source))
    }
    const fade = 1 - segment(time, 4.5, 4.65)
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    for (let index = 1; index < points.length; index += 1) {
      context.strokeStyle = hero === 'kaelis' ? `rgba(255, 196, 87, ${fade * index / points.length * 0.38})` : `rgba(121, 224, 255, ${fade * index / points.length * 0.34})`
      context.lineWidth = 2 + index * 0.8
      context.beginPath()
      context.moveTo(points[index - 1][0], points[index - 1][1])
      context.lineTo(points[index][0], points[index][1])
      context.stroke()
    }
    context.restore()
  }

  private drawPhoenix(time: number, ambient: number, state: SceneState) {
    const power = smooth(segment(time, 2.05, 2.55)) * (1 - smooth(segment(time, 3.55, 4.05)))
    if (power <= 0) return
    const context = this.context
    const anchor = rigPoint('kaelis', state.pose, state.transform, 'torso', [510, 390])
    context.save()
    context.translate(anchor[0], anchor[1])
    context.rotate(radians(state.transform.rotation * 0.45))
    for (const side of [-1, 1]) {
      const flutter = Math.sin(ambient * 8 + side) * 9
      const wing = context.createLinearGradient(0, 0, side * 230, -120)
      wing.addColorStop(0, `rgba(255, 220, 110, ${power * 0.62})`)
      wing.addColorStop(0.5, `rgba(255, 120, 25, ${power * 0.55})`)
      wing.addColorStop(1, `rgba(255, 65, 15, ${power * 0.18})`)
      context.fillStyle = wing
      context.strokeStyle = `rgba(255, 195, 88, ${power * 0.7})`
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(0, 12)
      context.bezierCurveTo(side * 45, -55, side * 145, -150, side * 238, -132 + flutter)
      for (let feather = 0; feather < 8; feather += 1) {
        const x = 232 - feather * 25
        const y = -120 + feather * 24
        context.lineTo(side * x, y + flutter * (1 - feather / 10))
        context.lineTo(side * (x - 17), y + 8)
      }
      context.closePath()
      context.fill()
      context.stroke()
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.lineCap = 'round'
      for (let feather = 0; feather < 10; feather += 1) {
        const spread = 52 + feather * 19
        const lift = 22 + feather * 12
        context.strokeStyle = `rgba(${feather % 3 ? '255, 146, 35' : '255, 205, 95'}, ${power * (0.68 - feather * 0.04)})`
        context.lineWidth = 4.5 - feather * 0.3
        context.beginPath()
        context.moveTo(0, 5)
        context.quadraticCurveTo(side * spread * 0.48, -lift * 0.35, side * spread, -lift + flutter * (0.4 + feather / 14))
        context.stroke()
      }
      context.restore()
    }
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let ember = 0; ember < 22; ember += 1) {
      const angle = ember * 2.4 + ambient * (0.7 + ember % 3 * 0.2)
      const radius = 55 + ember * 8
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle * 0.8) * 65 - ember * 4
      context.fillStyle = `rgba(255, ${170 + ember % 4 * 18}, 84, ${power * (0.25 + ember % 3 * 0.15)})`
      context.beginPath()
      context.arc(x, y, 1.5 + ember % 3, 0, TAU)
      context.fill()
    }
    context.fillStyle = `rgba(255, 230, 153, ${power * 0.9})`
    context.beginPath()
    context.moveTo(0, -20)
    context.lineTo(13, 4)
    context.lineTo(0, 34)
    context.lineTo(-13, 4)
    context.closePath()
    context.fill()
    context.restore()
    context.restore()
  }

  private drawAstralSerpent(time: number, ambient: number, state: SceneState) {
    const appear = smooth(segment(time, 1.75, 2.25)) * (1 - smooth(segment(time, 4.52, 5.05)))
    if (appear <= 0) return
    const context = this.context
    const origin = rigPoint('nyxara', state.pose, state.transform, 'staff', [755, 220])
    const dive = easeInOut(segment(time, 3.45, 4.5))
    const points: Point[] = []
    const count = 34
    for (let index = 0; index < count; index += 1) {
      if (time < 3.45) {
        const angle = ambient * 1.9 - index * 0.31
        const radius = 48 + index * 3.7
        points.push({
          x: origin[0] + Math.cos(angle) * radius - index * 1.2,
          y: origin[1] - 55 + Math.sin(angle) * radius * 0.5 - index * 1.1,
        })
      } else {
        // The head leads the dive; the tail follows with a delayed, slithering trajectory.
        const amount = clamp(dive - (count - 1 - index) * 0.018)
        const start = origin
        const end = { x: 915, y: 440 }
        const inv = 1 - amount
        const baseX = inv * inv * inv * start[0] + 3 * inv * inv * amount * (start[0] + 170) + 3 * inv * amount * amount * 780 + amount * amount * amount * end.x
        const baseY = inv * inv * inv * start[1] + 3 * inv * inv * amount * (start[1] - 170) + 3 * inv * amount * amount * 180 + amount * amount * amount * end.y
        const wave = Math.sin(amount * 12 - index * 0.38 + ambient * 4) * 22 * (1 - amount * 0.72)
        points.push({ x: baseX - wave * 0.55, y: baseY + wave })
      }
    }
    const tracePath = () => {
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length - 1; index += 1) {
        const middleX = (points[index].x + points[index + 1].x) / 2
        const middleY = (points[index].y + points[index + 1].y) / 2
        context.quadraticCurveTo(points[index].x, points[index].y, middleX, middleY)
      }
      const head = points[points.length - 1]
      context.lineTo(head.x, head.y)
    }
    context.save()
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = `rgba(43, 24, 100, ${appear * 0.9})`
    context.lineWidth = 25
    tracePath()
    context.stroke()
    context.globalCompositeOperation = 'lighter'
    context.strokeStyle = `rgba(117, 103, 235, ${appear * 0.82})`
    context.lineWidth = 17
    tracePath()
    context.stroke()
    context.strokeStyle = `rgba(126, 231, 255, ${appear * 0.72})`
    context.lineWidth = 7
    tracePath()
    context.stroke()
    context.strokeStyle = `rgba(239, 253, 255, ${appear * 0.55})`
    context.lineWidth = 2
    context.setLineDash([2, 15])
    context.lineDashOffset = -ambient * 25
    tracePath()
    context.stroke()
    context.setLineDash([])
    const head = points[points.length - 1]
    const neck = points[points.length - 2]
    const angle = Math.atan2(head.y - neck.y, head.x - neck.x)
    context.globalCompositeOperation = 'source-over'
    context.translate(head.x, head.y)
    context.rotate(angle)
    polygon(context, [{ x: 25, y: 0 }, { x: 10, y: -11 }, { x: -9, y: -13 }, { x: -20, y: -7 }, { x: -20, y: 7 }, { x: -9, y: 13 }, { x: 10, y: 11 }], '#5d45a5', '#b5f4ff', 2)
    polygon(context, [{ x: -8, y: -10 }, { x: -20, y: -24 }, { x: 2, y: -12 }], '#a58be8', '#d5c8ff', 1)
    polygon(context, [{ x: -8, y: 10 }, { x: -20, y: 24 }, { x: 2, y: 12 }], '#a58be8', '#d5c8ff', 1)
    context.fillStyle = '#eaffff'
    context.shadowColor = '#8fffff'
    context.shadowBlur = 8
    context.beginPath()
    context.ellipse(8, -5, 3.2, 2.2, 0, 0, TAU)
    context.ellipse(8, 5, 3.2, 2.2, 0, 0, TAU)
    context.fill()
    context.restore()
  }

  private drawInstantAstralBolt(time: number) {
    const context = this.context
    const amount = easeOut(segment(time, 0.08, 0.34))
    const x = lerp(560, 915, amount)
    const y = lerp(260, 440, amount)
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.strokeStyle = 'rgba(157, 229, 255, 0.65)'
    context.lineWidth = 10
    context.beginPath()
    context.moveTo(lerp(560, x, 0.6), lerp(260, y, 0.6))
    context.lineTo(x, y)
    context.stroke()
    context.fillStyle = '#e6ffff'
    context.beginPath()
    context.arc(x, y, 9, 0, TAU)
    context.fill()
    context.restore()
  }

  private drawShadow(x: number, y: number, radius: number, opacity: number) {
    const context = this.context
    context.save()
    context.translate(x, y)
    context.scale(1, 0.24)
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, `rgba(1, 6, 18, ${opacity})`)
    gradient.addColorStop(1, 'rgba(1, 6, 18, 0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(0, 0, radius, 0, TAU)
    context.fill()
    context.restore()
  }

  private drawGolem(time: number, ambient: number, cinematic: boolean, hero: HeroId) {
    const context = this.context
    const hit = easeOut(segment(time, 4.5, 4.64))
    const reaction = smooth(segment(time, 4.5, 5.65))
    const brace = cinematic ? smooth(segment(time, 3.75, 4.38)) * (1 - hit) : 0
    const damaged = time >= 4.5
    const rootX = GOLEM_X + hit * 35 + Math.sin(ambient * 64) * (1 - segment(time, 4.5, 4.95)) * hit * 5
    const lift = hero === 'nyxara' ? Math.sin(reaction * Math.PI) * 32 : 0
    const rootY = GOLEM_GROUND + reaction * 24 - lift
    const bodyRotation = radians(hit * 13 - brace * 4 + Math.sin(ambient * 1.3) * (damaged ? 0 : 1))
    const hitColor = hero === 'kaelis' ? '#ffc767' : '#c29aff'
    context.save()
    context.translate(rootX, rootY)
    context.rotate(bodyRotation)
    context.lineJoin = 'round'
    const rock = context.createLinearGradient(-70, -190, 70, 0)
    rock.addColorStop(0, '#52647b')
    rock.addColorStop(0.45, '#26364e')
    rock.addColorStop(1, '#101a2d')
    const leftShoulder = { x: -52, y: -150 }
    const leftElbow = { x: -86 - brace * 15 + hit * 24, y: -105 - brace * 48 - hit * 25 }
    const leftHand = { x: -72 - brace * 30 + hit * 50, y: -62 - brace * 75 - hit * 40 }
    segmentShape(context, leftShoulder, leftElbow, 24, 20, rock)
    segmentShape(context, leftElbow, leftHand, 22, 18, rock)
    const kneeDrop = reaction * 28
    segmentShape(context, { x: -27, y: -62 }, { x: -40 - reaction * 12, y: -20 + kneeDrop }, 26, 22, rock)
    segmentShape(context, { x: -40 - reaction * 12, y: -20 + kneeDrop }, { x: -54, y: 0 }, 23, 20, rock)
    segmentShape(context, { x: 27, y: -62 }, { x: 42 + reaction * 20, y: -18 + kneeDrop * 0.6 }, 26, 22, rock)
    segmentShape(context, { x: 42 + reaction * 20, y: -18 + kneeDrop * 0.6 }, { x: 55, y: 0 }, 23, 20, rock)
    polygon(context, [{ x: -48, y: -169 }, { x: -20, y: -191 }, { x: 29, y: -185 }, { x: 55, y: -153 }, { x: 45, y: -72 }, { x: 21, y: -48 }, { x: -28, y: -54 }, { x: -52, y: -92 }], rock, '#111a2b', 4)
    polygon(context, [{ x: -48, y: -169 }, { x: -20, y: -191 }, { x: -7, y: -143 }, { x: -34, y: -114 }], '#40566e', '#677a8e', 1.5)
    polygon(context, [{ x: 29, y: -185 }, { x: 55, y: -153 }, { x: 30, y: -120 }, { x: 7, y: -143 }], '#1b2b43', '#566c83', 1.5)
    const corePulse = 0.7 + Math.sin(ambient * (damaged ? 18 : 4)) * 0.2
    context.save()
    context.shadowColor = damaged ? hitColor : '#5deeff'
    context.shadowBlur = 12 + corePulse * 10
    polygon(context, [{ x: 0, y: -157 }, { x: 25, y: -130 }, { x: 16, y: -92 }, { x: 0, y: -77 }, { x: -19, y: -97 }, { x: -25, y: -130 }], damaged ? hitColor : '#39cbe7', '#b8fbff', 2.5)
    polygon(context, [{ x: 0, y: -146 }, { x: 13, y: -127 }, { x: 7, y: -103 }, { x: 0, y: -94 }, { x: -9, y: -108 }, { x: -12, y: -128 }], damaged ? '#fff3c4' : '#c4ffff', 'transparent', 0)
    context.restore()
    context.save()
    context.translate(4 + hit * 8, -205 + reaction * 5)
    context.rotate(radians(-brace * 8 + hit * 18))
    polygon(context, [{ x: -29, y: -22 }, { x: 0, y: -36 }, { x: 30, y: -19 }, { x: 25, y: 18 }, { x: 0, y: 30 }, { x: -27, y: 15 }], rock, '#111a2b', 3)
    context.strokeStyle = damaged ? hitColor : '#8df6ff'
    context.lineWidth = 5
    context.shadowColor = context.strokeStyle
    context.shadowBlur = 9
    context.beginPath()
    context.moveTo(-18, -5)
    context.lineTo(-5, -8 + brace * 4)
    context.moveTo(7, -8 + brace * 4)
    context.lineTo(20, -4)
    context.stroke()
    context.restore()
    const rightShoulder = { x: 49, y: -151 }
    const rightElbow = { x: 82 + brace * 5 + hit * 30, y: -108 - brace * 42 - hit * 12 }
    const rightHand = { x: 70 - brace * 25 + hit * 58, y: -62 - brace * 78 - hit * 20 }
    segmentShape(context, rightShoulder, rightElbow, 25, 21, rock)
    segmentShape(context, rightElbow, rightHand, 23, 18, rock)
    ;[leftElbow, leftHand, rightElbow, rightHand].forEach((joint, index) => {
      polygon(context, [{ x: joint.x - 15, y: joint.y - 12 }, { x: joint.x + 10, y: joint.y - 16 }, { x: joint.x + 18, y: joint.y + 5 }, { x: joint.x, y: joint.y + 18 }, { x: joint.x - 17, y: joint.y + 8 }], index % 2 ? '#31465e' : '#3c5269', '#172235', 2)
    })
    if (damaged) {
      const crack = easeOut(segment(time, 4.5, 4.9))
      context.strokeStyle = hitColor
      context.lineWidth = 2.2
      context.shadowColor = hitColor
      context.shadowBlur = 7
      const cracks: Point[][] = [
        [{ x: -2, y: -130 }, { x: -30, y: -143 }, { x: -45, y: -137 }],
        [{ x: 2, y: -126 }, { x: 30, y: -143 }, { x: 43, y: -159 }],
        [{ x: 0, y: -116 }, { x: -19, y: -91 }, { x: -15, y: -68 }],
        [{ x: 8, y: -113 }, { x: 30, y: -93 }, { x: 26, y: -71 }],
      ]
      cracks.forEach(points => {
        context.beginPath()
        context.moveTo(points[0].x, points[0].y)
        points.slice(1).forEach((point, index) => {
          const amount = clamp(crack * 1.5 - index * 0.35)
          const previous = points[index]
          context.lineTo(lerp(previous.x, point.x, amount), lerp(previous.y, point.y, amount))
        })
        context.stroke()
      })
      context.shadowBlur = 0
    }
    context.restore()
  }

  private drawImpactWorld(time: number, ambient: number, hero: HeroId) {
    if (time < 4.5 || time > 6.1) return
    const context = this.context
    const elapsed = time - 4.5
    const origin = { x: 915, y: 440 }
    const ring = easeOut(segment(elapsed, 0, 0.7))
    const rgb = hero === 'kaelis' ? '255, 211, 125' : '170, 142, 255'
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.strokeStyle = `rgba(${rgb}, ${1 - ring})`
    context.lineWidth = 8 * (1 - ring) + 1
    context.beginPath()
    context.arc(origin.x, origin.y, 20 + ring * 310, 0, TAU)
    context.stroke()
    context.save()
    context.translate(origin.x, 560)
    context.scale(1, 0.24)
    context.strokeStyle = `rgba(90, 225, 255, ${0.65 * (1 - ring)})`
    context.lineWidth = 10
    context.beginPath()
    context.arc(0, 0, 30 + ring * 440, 0, TAU)
    context.stroke()
    context.restore()
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = ray / 12 * TAU + 0.13
      const inner = 35 + ring * 90
      const outer = inner + (1 - ring) * (65 + ray % 3 * 30)
      context.strokeStyle = `rgba(${ray % 3 ? '102, 232, 255' : rgb}, ${0.7 * (1 - ring)})`
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(origin.x + Math.cos(angle) * inner, origin.y + Math.sin(angle) * inner)
      context.lineTo(origin.x + Math.cos(angle) * outer, origin.y + Math.sin(angle) * outer)
      context.stroke()
    }
    context.restore()
    this.debris.forEach((piece, index) => {
      const localTime = Math.max(0, elapsed - index % 4 * 0.012)
      if (localTime <= 0 || localTime > 1.4) return
      const x = origin.x + Math.cos(piece.angle) * piece.speed * localTime
      const y = origin.y + Math.sin(piece.angle) * piece.speed * localTime + 260 * localTime * localTime - piece.lift * localTime
      context.save()
      context.translate(x, y)
      context.rotate(piece.spin * localTime + ambient * 0.2)
      context.globalAlpha = 1 - segment(localTime, 0.85, 1.4)
      polygon(context, [{ x: -piece.size, y: -piece.size * 0.4 }, { x: piece.size * 0.7, y: -piece.size * 0.7 }, { x: piece.size, y: piece.size * 0.5 }, { x: -piece.size * 0.5, y: piece.size }], index % 4 === 0 ? '#7de9f4' : '#344b61', '#8ca5af', 1)
      context.restore()
    })
  }

  private drawSpeedLines(time: number, ambient: number, hero: HeroId) {
    const context = this.context
    const intensity = smooth(segment(time, 3.45, 3.85))
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < 24; index += 1) {
      const y = (index * 71 + ambient * 530) % 800 - 40
      const x = (index * 149 + ambient * 280) % 1400 - 60
      const length = 70 + index % 5 * 30
      context.strokeStyle = hero === 'kaelis' ? `rgba(255, 215, 149, ${intensity * (0.07 + index % 4 * 0.025)})` : `rgba(177, 158, 255, ${intensity * (0.07 + index % 4 * 0.025)})`
      context.lineWidth = 1 + index % 3
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x - length * 0.45, y - length)
      context.stroke()
    }
    context.restore()
  }

  private drawImpactScreen(time: number, hero: HeroId) {
    if (time < 4.5 || time > 4.9) return
    const context = this.context
    const elapsed = time - 4.5
    const flash = Math.max(0, 1 - elapsed / 0.12) * 0.72
    if (flash > 0) {
      const gradient = context.createRadialGradient(900, 425, 10, 900, 425, 650)
      gradient.addColorStop(0, `rgba(235, 255, 255, ${flash})`)
      gradient.addColorStop(0.3, hero === 'kaelis' ? `rgba(255, 195, 93, ${flash * 0.45})` : `rgba(170, 121, 255, ${flash * 0.45})`)
      gradient.addColorStop(1, 'rgba(32, 98, 192, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 1280, 720)
    }
    this.drawDamage(time, hero, 1)
  }

  private drawDamage(time: number, hero: HeroId, opacity: number) {
    const elapsed = time - 4.5
    if (elapsed < 0.07 || elapsed > 1.35) return
    const context = this.context
    const enter = easeOut(segment(elapsed, 0.07, 0.25))
    const leave = 1 - smooth(segment(elapsed, 0.95, 1.35))
    const y = lerp(270, 210, easeOut(segment(elapsed, 0.07, 1.1)))
    const presentation = HERO_PRESENTATION[hero]
    context.save()
    context.globalAlpha = enter * leave * opacity
    context.translate(930, y)
    context.rotate(-0.055)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 26px Manrope, sans-serif'
    context.fillStyle = hero === 'kaelis' ? '#ffe39a' : '#d9c2ff'
    context.shadowColor = '#071225'
    context.shadowBlur = 8
    context.fillText(hero === 'kaelis' ? 'CRITIQUE · AUBE' : 'MARQUE ASTRALE', 0, -42)
    context.font = 'italic 900 68px Manrope, sans-serif'
    const value = presentation.damage.toLocaleString('fr-FR')
    context.lineWidth = 9
    context.strokeStyle = '#10213c'
    context.strokeText(value, 0, 6)
    const gradient = context.createLinearGradient(0, -30, 0, 35)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.45, hero === 'kaelis' ? '#fff0b9' : '#e4d4ff')
    gradient.addColorStop(1, hero === 'kaelis' ? '#e9a94c' : '#9b73e5')
    context.fillStyle = gradient
    context.fillText(value, 0, 6)
    context.restore()
  }

  private drawCinematicText(time: number, hero: HeroId) {
    const context = this.context
    const presentation = HERO_PRESENTATION[hero]
    const titleAlpha = smooth(segment(time, 0.68, 0.86)) * (1 - smooth(segment(time, 1.18, 1.34)))
    if (titleAlpha > 0) {
      context.save()
      context.globalAlpha = titleAlpha
      context.textAlign = 'left'
      context.fillStyle = hero === 'kaelis' ? '#ffe0a0' : '#c7b1ff'
      context.font = '600 15px Cinzel, serif'
      context.fillText(hero === 'kaelis' ? 'KAELIS · LUMIÈRE' : 'NYXARA · COSMOS', 76, 477)
      context.fillStyle = '#f4f8ff'
      context.font = '600 43px Cinzel, serif'
      context.shadowColor = '#071225'
      context.shadowBlur = 12
      if (hero === 'kaelis') {
        context.fillText('AUBE', 72, 530)
        context.fillStyle = '#e4c77e'
        context.fillText('INCARNÉE', 72, 578)
      } else {
        context.font = '600 36px Cinzel, serif'
        context.fillText('REQUIEM DES', 72, 530)
        context.fillStyle = '#c4a2f2'
        context.font = '600 32px Cinzel, serif'
        context.fillText('CONSTELLATIONS', 72, 578)
      }
      context.fillStyle = hero === 'kaelis' ? '#f0bd61' : '#a881ed'
      context.fillRect(75, 596, 160 * titleAlpha, 2)
      context.restore()
    }
    let subtitle = ''
    if (time >= 0.62 && time < 1.3) subtitle = hero === 'kaelis' ? '« La nuit s’arrête ici. »' : '« Chaque étoile connaît ton nom. »'
    else if (time >= 2.48 && time < 3.35) subtitle = hero === 'kaelis' ? '« Aube incarnée… »' : '« Déroule le firmament. »'
    else if (time >= 3.8 && time < 4.62) subtitle = presentation.subtitle
    else if (time >= 5.85 && time < 6.65) subtitle = hero === 'kaelis' ? '« L’aube demeure. »' : '« La constellation est scellée. »'
    if (subtitle) {
      context.save()
      context.textAlign = 'center'
      context.font = '500 20px Manrope, sans-serif'
      const width = context.measureText(subtitle).width + 48
      context.fillStyle = 'rgba(3, 10, 25, 0.64)'
      context.beginPath()
      context.roundRect(640 - width / 2, 624, width, 40, 8)
      context.fill()
      context.fillStyle = '#f5f8ff'
      context.fillText(subtitle, 640, 651)
      context.restore()
    }
  }

  private drawVignette(strength: number) {
    const context = this.context
    const vignette = context.createRadialGradient(640, 350, 220, 640, 350, 760)
    vignette.addColorStop(0, 'rgba(2, 6, 18, 0)')
    vignette.addColorStop(0.72, `rgba(2, 6, 18, ${strength * 0.18})`)
    vignette.addColorStop(1, `rgba(2, 6, 18, ${strength})`)
    context.fillStyle = vignette
    context.fillRect(0, 0, 1280, 720)
  }

  private drawLetterbox(amount: number) {
    if (amount <= 0) return
    const context = this.context
    const height = 38 * amount
    context.fillStyle = '#02050d'
    context.fillRect(0, 0, 1280, height)
    context.fillRect(0, 720 - height, 1280, height)
    context.fillStyle = `rgba(115, 222, 239, ${0.22 * amount})`
    context.fillRect(0, height, 1280, 1)
    context.fillRect(0, 720 - height - 1, 1280, 1)
  }
}

export function mapShortTime(time: number) {
  return keyed(time, [[0, 0.42], [0.24, 0.76], [0.55, 1.28], [0.86, 2.3], [1.08, 3.44], [1.35, 4.5], [1.67, 5.22], [1.98, 6.5], [2.4, 8]], easeInOut)
}

const SHOTS: Record<HeroId, Array<{ at: number; name: string; detail: string }>> = {
  kaelis: [
    { at: 0, name: 'La lame du serment', detail: 'Anticipation · l’épée retient la lumière' },
    { at: 0.55, name: 'L’étincelle de l’aube', detail: 'Gros plan · le regard et la lame s’embrasent' },
    { at: 1.35, name: 'La charge solaire', detail: 'Traveling · course, foulées et envol' },
    { at: 2.35, name: 'Les ailes du phénix', detail: 'Caméra orbitale · rotation et cape animée' },
    { at: 3.45, name: 'Aube incarnée', detail: 'Caméra poursuite · entaille descendante' },
    { at: 4.5, name: 'Impact solaire', detail: 'Impact · réaction du golem et dégâts' },
    { at: 5.65, name: 'Après l’incandescence', detail: 'Réception · récupération et retour au combat' },
  ],
  nyxara: [
    { at: 0, name: 'L’oracle ouvre les yeux', detail: 'Anticipation · la première constellation' },
    { at: 0.55, name: 'La carte céleste', detail: 'Gros plan · regard et bâton astral' },
    { at: 1.35, name: 'L’ascension de Nyxara', detail: 'Lévitation · cheveux, robe et incantation' },
    { at: 2.35, name: 'Le serpent astral', detail: 'Caméra orbitale · constellation vivante' },
    { at: 3.45, name: 'Requiem des Constellations', detail: 'Incantation · plongée du serpent astral' },
    { at: 4.5, name: 'Effondrement astral', detail: 'Impact · marque, réaction et dégâts' },
    { at: 5.65, name: 'Silence cosmique', detail: 'Descente · récupération et retour au combat' },
  ],
}

export function shotAt(time: number, hero: HeroId = 'kaelis') {
  const shots = SHOTS[hero]
  if (time >= 6.75) return { index: 7, name: 'Retour au combat', detail: 'La caméra et les contrôles sont restitués' }
  let index = 0
  for (let shot = 1; shot < shots.length; shot += 1) if (time >= shots[shot].at) index = shot
  return { index: index + 1, name: shots[index].name, detail: shots[index].detail }
}
