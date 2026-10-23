import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  clamp,
  easeIn,
  easeInOut,
  easeOut,
  keyed,
  lerp,
  pulse,
  radians,
  seededRandom,
  segment,
  smooth,
} from './math'

export type UltimateMode = 'full' | 'short' | 'instant'

export type RenderFrame = {
  time: number
  realTime: number
  ambient: number
  mode: UltimateMode
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

type HeroPose = {
  torso: number
  head: number
  legBack: number
  kneeBack: number
  legFront: number
  kneeFront: number
  armBack: number
  elbowBack: number
  armFront: number
  elbowFront: number
  weapon: number
  coat: number
  hair: number
  eye: number
  shout: number
}

type HeroTransform = {
  x: number
  y: number
  scale: number
  rotation: number
  facing: number
}

type HeroJoints = {
  hipBack: Point
  hipFront: Point
  kneeBack: Point
  kneeFront: Point
  ankleBack: Point
  ankleFront: Point
  shoulderBack: Point
  shoulderFront: Point
  elbowBack: Point
  elbowFront: Point
  handBack: Point
  handFront: Point
  head: Point
  neck: Point
}

const TAU = Math.PI * 2
const HERO_GROUND = 568
const GOLEM_X = 970
const GOLEM_GROUND = 575

const BASE_POSE: HeroPose = {
  torso: -4,
  head: 5,
  legBack: 8,
  kneeBack: -8,
  legFront: -12,
  kneeFront: 12,
  armBack: -20,
  elbowBack: -38,
  armFront: 42,
  elbowFront: -8,
  weapon: -72,
  coat: 0,
  hair: 0,
  eye: 1,
  shout: 0,
}

const CAMERA_BASE: Camera = {
  focusX: STAGE_WIDTH / 2,
  focusY: STAGE_HEIGHT / 2,
  zoom: 1,
  rotation: 0,
  screenX: STAGE_WIDTH / 2,
  screenY: STAGE_HEIGHT / 2,
}

const rotate = (point: Point, angle: number, origin: Point = { x: 0, y: 0 }): Point => {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const x = point.x - origin.x
  const y = point.y - origin.y
  return { x: origin.x + x * cosine - y * sine, y: origin.y + x * sine + y * cosine }
}

const from = (point: Point, length: number, degrees: number): Point => ({
  x: point.x + Math.sin(radians(degrees)) * length,
  y: point.y + Math.cos(radians(degrees)) * length,
})

function polygon(
  context: CanvasRenderingContext2D,
  points: Point[],
  fill: string | CanvasGradient,
  stroke = '#091426',
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
  stroke = '#0a1428',
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
  ], fill, stroke, 2.2)
}

function samplePose(time: number, ambient: number): HeroPose {
  const pose: HeroPose = {
    torso: keyed(time, [[0, -4], [0.42, 14], [0.72, 10], [1.25, 5], [1.4, 18], [2, 20], [2.35, -10], [3.05, -20], [3.45, 28], [4.5, 32], [4.82, -16], [5.35, 20], [5.8, 10], [6.25, -5], [8, -4]]),
    head: keyed(time, [[0, 5], [0.45, -8], [0.7, -5], [1.1, 1], [1.4, -8], [2.1, -12], [2.6, 8], [3.3, -10], [3.8, 4], [4.5, -8], [5.1, 12], [5.9, -6], [6.5, 4], [8, 5]]),
    legBack: keyed(time, [[0, 8], [0.48, 34], [0.9, 18], [1.35, 12], [2, -42], [2.35, 58], [3.1, -28], [3.45, 20], [4.5, 30], [4.85, -44], [5.35, 52], [5.9, 24], [6.4, 8], [8, 8]]),
    kneeBack: keyed(time, [[0, -8], [0.48, 72], [0.9, 25], [1.35, -5], [2, 30], [2.35, 112], [3.1, 28], [3.45, -12], [4.5, -18], [4.85, 35], [5.35, 104], [5.9, 42], [6.4, -8], [8, -8]]),
    legFront: keyed(time, [[0, -12], [0.48, -38], [0.9, -18], [1.35, -8], [2, 44], [2.35, -52], [3.1, 48], [3.45, -14], [4.5, -20], [4.85, 52], [5.35, -50], [5.9, -18], [6.4, -12], [8, -12]]),
    kneeFront: keyed(time, [[0, 12], [0.48, 62], [0.9, 20], [1.35, 10], [2, 60], [2.35, 35], [3.1, 96], [3.45, 8], [4.5, 10], [4.85, 82], [5.35, 28], [5.9, 54], [6.4, 12], [8, 12]]),
    armBack: keyed(time, [[0, -20], [0.5, -58], [0.8, -30], [1.25, 10], [1.4, 40], [2, -45], [2.35, -105], [3.05, -145], [3.45, 52], [4.5, 60], [4.85, -65], [5.35, 38], [5.9, -18], [6.4, -20], [8, -20]]),
    elbowBack: keyed(time, [[0, -38], [0.5, -95], [0.8, -65], [1.25, -20], [1.4, -10], [2, -90], [2.35, -130], [3.05, -105], [3.45, 5], [4.5, 8], [4.85, -20], [5.35, -30], [5.9, -45], [6.4, -38], [8, -38]]),
    armFront: keyed(time, [[0, 42], [0.5, 75], [0.8, 58], [1.25, 38], [1.4, -40], [2, 45], [2.35, -80], [3.05, -120], [3.45, 72], [4.5, 78], [4.85, 15], [5.35, 70], [5.9, 35], [6.4, 42], [8, 42]]),
    elbowFront: keyed(time, [[0, -8], [0.5, 20], [0.8, 2], [1.25, -10], [1.4, -95], [2, -15], [2.35, -125], [3.05, -80], [3.45, 8], [4.5, 5], [4.85, 55], [5.35, 10], [5.9, -12], [6.4, -8], [8, -8]]),
    weapon: keyed(time, [[0, -72], [0.5, -102], [0.8, -82], [1.25, -62], [1.4, -28], [2, -35], [2.35, -118], [3.05, -155], [3.45, 4], [4.5, 5], [4.85, -38], [5.35, -80], [5.75, -70], [6.12, 95], [6.42, 250], [6.7, 285], [6.9, -72], [8, -72]], easeInOut),
    coat: keyed(time, [[0, 0], [0.5, -10], [1.35, 22], [2, 36], [2.35, 50], [3.4, 32], [4.5, 58], [5.1, 42], [5.8, 12], [6.6, 0], [8, 0]]),
    hair: keyed(time, [[0, 0], [0.55, 3], [1.35, 8], [2.35, 12], [3.45, 8], [4.5, 14], [5.4, 8], [6.6, 0], [8, 0]]),
    eye: keyed(time, [[0, 0.85], [0.45, 0.15], [0.7, 0.1], [0.92, 1], [4.48, 1], [4.56, 0.25], [4.7, 1], [8, 1]]),
    shout: keyed(time, [[0, 0], [3.65, 0], [3.95, 0.8], [4.48, 1], [4.8, 0], [8, 0]]),
  }

  if (time >= 1.35 && time < 2.04) {
    const phase = (time - 1.35) * 19
    const swing = Math.sin(phase)
    const blend = smooth(segment(time, 1.35, 1.46))
    pose.legFront = lerp(pose.legFront, swing * 50, blend)
    pose.legBack = lerp(pose.legBack, -swing * 50, blend)
    pose.kneeFront = lerp(pose.kneeFront, 22 + Math.max(0, -swing) * 60, blend)
    pose.kneeBack = lerp(pose.kneeBack, 22 + Math.max(0, swing) * 60, blend)
    pose.armFront = lerp(pose.armFront, -swing * 42, blend)
    pose.armBack = lerp(pose.armBack, swing * 42, blend)
  }

  if (time > 6.85) {
    const walk = Math.sin((time - 6.85) * 15) * (1 - segment(time, 7.65, 8))
    pose.legFront += walk * 28
    pose.legBack -= walk * 28
    pose.kneeFront += Math.max(0, -walk) * 30
    pose.kneeBack += Math.max(0, walk) * 30
    pose.armFront -= walk * 14
    pose.armBack += walk * 14
  }

  pose.coat += Math.sin(ambient * 6.2) * 3
  pose.hair += Math.sin(ambient * 8.5) * 1.4
  return pose
}

function heroTransform(time: number): HeroTransform {
  let x = 350
  let y = HERO_GROUND + keyed(time, [[0, 0], [0.48, 24], [0.9, 12], [1.3, 0], [8, 0]])
  let rotation = 0
  let scale = 1

  if (time >= 1.35 && time < 2.35) {
    const run = easeInOut(segment(time, 1.35, 2.35))
    x = lerp(350, 650, run)
    const leap = easeOut(segment(time, 1.96, 2.35))
    y = HERO_GROUND - leap * 142 - Math.abs(Math.sin((time - 1.35) * 19)) * 5 * (1 - leap)
    rotation = keyed(time, [[1.35, 0], [1.95, 4], [2.35, -18]])
  } else if (time >= 2.35 && time < 3.45) {
    const air = smooth(segment(time, 2.35, 3.45))
    x = lerp(650, 790, air)
    y = lerp(HERO_GROUND - 142, 266, air) - Math.sin(air * Math.PI) * 74
    rotation = keyed(time, [[2.35, -18], [2.8, -48], [3.2, 5], [3.45, 48]], easeInOut)
    scale = 1.04
  } else if (time >= 3.45 && time < 4.5) {
    const dive = easeIn(segment(time, 3.45, 4.5))
    x = lerp(790, 770, dive)
    y = lerp(266, 408, dive)
    rotation = lerp(48, 55, dive)
    scale = lerp(1.04, 1, dive)
  } else if (time >= 4.5 && time < 5.65) {
    const recoil = easeOut(segment(time, 4.5, 5.18))
    x = keyed(time, [[4.5, 770], [4.7, 730], [5.18, 590], [5.65, 555]], easeOut)
    y = keyed(time, [[4.5, 408], [4.72, 456], [5.18, HERO_GROUND], [5.65, HERO_GROUND]], easeOut)
    rotation = keyed(time, [[4.5, 55], [4.72, 18], [5.05, -12], [5.65, 0]], easeOut)
    y += Math.sin(recoil * Math.PI) * -24
  } else if (time >= 5.65) {
    x = keyed(time, [[5.65, 555], [6.75, 555], [7, 555], [8, 350]], easeInOut)
    y = HERO_GROUND + keyed(time, [[5.65, 18], [6.2, 0], [8, 0]])
  }
  return { x, y, scale, rotation, facing: 1 }
}

function cameraAt(time: number, ambient: number): Camera {
  let camera = { ...CAMERA_BASE }
  if (time < 0.55) {
    const push = smooth(segment(time, 0, 0.55))
    camera = { ...camera, focusX: lerp(640, 520, push), focusY: lerp(370, 405, push), zoom: lerp(0.96, 1.14, push) }
  } else if (time < 1.35) {
    const push = smooth(segment(time, 0.55, 1.35))
    camera = {
      focusX: lerp(344, 355, push),
      focusY: lerp(403, 396, push),
      zoom: lerp(2.15, 2.72, push),
      rotation: lerp(-0.025, 0.018, push),
      screenX: lerp(700, 755, push),
      screenY: 315,
    }
  } else if (time < 2.35) {
    const track = smooth(segment(time, 1.35, 2.35))
    camera = { ...camera, focusX: lerp(480, 675, track), focusY: lerp(410, 370, track), zoom: 1.08, screenY: 385 }
  } else if (time < 3.45) {
    const orbit = smooth(segment(time, 2.35, 3.45))
    camera = {
      focusX: lerp(675, 785, orbit),
      focusY: lerp(340, 240, orbit),
      zoom: lerp(0.96, 1.12, orbit),
      rotation: lerp(-0.1, 0.09, orbit),
      screenX: 640,
      screenY: 390,
    }
  } else if (time < 4.5) {
    const chase = easeIn(segment(time, 3.45, 4.5))
    camera = {
      focusX: lerp(785, 865, chase),
      focusY: lerp(300, 420, chase),
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

function jointsFor(pose: HeroPose): HeroJoints {
  const torsoAngle = radians(pose.torso)
  const hipBack = { x: -12, y: 0 }
  const hipFront = { x: 12, y: 0 }
  const kneeBack = from(hipBack, 60, pose.legBack)
  const kneeFront = from(hipFront, 60, pose.legFront)
  const ankleBack = from(kneeBack, 62, pose.kneeBack)
  const ankleFront = from(kneeFront, 62, pose.kneeFront)
  const shoulderBack = rotate({ x: -25, y: -91 }, torsoAngle)
  const shoulderFront = rotate({ x: 25, y: -91 }, torsoAngle)
  const elbowBack = from(shoulderBack, 45, pose.armBack + pose.torso)
  const elbowFront = from(shoulderFront, 45, pose.armFront + pose.torso)
  const handBack = from(elbowBack, 43, pose.elbowBack + pose.torso)
  const handFront = from(elbowFront, 43, pose.elbowFront + pose.torso)
  return {
    hipBack,
    hipFront,
    kneeBack,
    kneeFront,
    ankleBack,
    ankleFront,
    shoulderBack,
    shoulderFront,
    elbowBack,
    elbowFront,
    handBack,
    handFront,
    neck: rotate({ x: 2, y: -116 }, torsoAngle),
    head: rotate({ x: 5, y: -148 }, torsoAngle),
  }
}

/** Real-time vector skeletal renderer. Every joint is evaluated every display frame. */
export class ZenithRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly arena: HTMLImageElement
  private readonly stars: Array<{ x: number; y: number; size: number; phase: number }>
  private readonly debris: Array<{ angle: number; speed: number; size: number; spin: number; lift: number }>

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas 2D indisponible')
    this.context = context
    this.arena = new Image()
    this.arena.src = './assets/ultimate/zenith-arena.webp'
    const random = seededRandom(41027)
    this.stars = Array.from({ length: 90 }, () => ({
      x: random() * STAGE_WIDTH,
      y: random() * STAGE_HEIGHT * 0.75,
      size: 0.6 + random() * 2.1,
      phase: random() * TAU,
    }))
    this.debris = Array.from({ length: 30 }, () => ({
      angle: lerp(-2.8, -0.25, random()),
      speed: 110 + random() * 330,
      size: 3 + random() * 10,
      spin: (random() - 0.5) * 13,
      lift: 50 + random() * 160,
    }))
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
    const camera = { ...CAMERA_BASE, focusX: 640 + Math.sin(frame.ambient * 0.18) * 3 }
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, 0)
    this.drawAmbientMotes(frame.ambient, 0.5)
    this.drawShadow(350, HERO_GROUND + 4, 66, 0.24)
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    const idlePose: HeroPose = {
      ...BASE_POSE,
      torso: -4 + Math.sin(frame.ambient * 1.8) * 1.3,
      head: 5 + Math.sin(frame.ambient * 1.1) * 1.6,
      coat: Math.sin(frame.ambient * 3.2) * 5,
      hair: Math.sin(frame.ambient * 4.1) * 1.5,
      armFront: 42 + Math.sin(frame.ambient * 1.8) * 2,
    }
    const golemTime = frame.impactApplied ? 8 : 0
    this.drawGolem(golemTime, frame.ambient, false)
    this.drawHero({ x: 350, y: HERO_GROUND, scale: 1, rotation: 0, facing: 1 }, idlePose, frame.ambient, 0.14)
    context.restore()
    this.drawVignette(0.34)
  }

  private drawCinematic(frame: RenderFrame) {
    const context = this.context
    const time = frame.time
    const camera = cameraAt(time, frame.ambient)
    const hero = heroTransform(time)
    const pose = samplePose(time, frame.ambient)
    const charge = smooth(segment(time, 0.5, 1.2)) * (1 - segment(time, 4.65, 5.1)) + 0.14
    const voidAmount = smooth(segment(time, 0.42, 0.72)) * (1 - smooth(segment(time, 1.18, 1.55)))

    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, voidAmount)
    if (voidAmount > 0.01) this.drawVoid(frame.ambient, voidAmount)
    this.drawCelestialMagic(time, frame.ambient, hero)
    this.drawAmbientMotes(frame.ambient, 0.65)
    this.drawShadow(hero.x, HERO_GROUND + 4, 66, 0.25 * clamp(1 - (HERO_GROUND - hero.y) / 420, 0.12, 1))
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    this.drawMotionTrails(time, hero)
    this.drawGolem(time, frame.ambient, true)
    this.drawHero(hero, pose, frame.ambient, charge)
    this.drawImpactWorld(time, frame.ambient)
    context.restore()

    if (time >= 3.45 && time < 4.5) this.drawSpeedLines(time, frame.ambient)
    this.drawImpactScreen(time)
    this.drawCinematicText(time, frame.mode)
    this.drawVignette(time >= 0.55 && time < 1.35 ? 0.56 : 0.4)
    const bars = smooth(segment(time, 0, 0.18)) * (1 - smooth(segment(time, 7.35, 8)))
    this.drawLetterbox(bars)
  }

  private drawInstant(frame: RenderFrame) {
    const context = this.context
    const time = frame.realTime
    const camera = { ...CAMERA_BASE }
    const hitTime = 0.32
    const visualTime = time < hitTime ? 4.49 : 4.5 + (time - hitTime) * 4
    const lunge = keyed(time, [[0, 350], [0.1, 350], [0.3, 760], [0.39, 745], [0.7, 350]], easeInOut)
    const height = keyed(time, [[0, HERO_GROUND], [0.12, HERO_GROUND], [0.3, 430], [0.4, 480], [0.7, HERO_GROUND]], easeInOut)
    const pose = samplePose(time < 0.4 ? 4.25 : lerp(5.2, 6.5, segment(time, 0.4, 0.7)), frame.ambient)
    const hero = { x: lunge, y: height, scale: 1, rotation: keyed(time, [[0, 0], [0.12, 0], [0.32, 52], [0.42, 10], [0.7, 0]]), facing: 1 }
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, 0)
    this.drawAmbientMotes(frame.ambient, 0.5)
    this.drawShadow(hero.x, HERO_GROUND + 4, 66, 0.22)
    this.drawShadow(GOLEM_X, GOLEM_GROUND + 3, 85, 0.28)
    this.drawGolem(visualTime, frame.ambient, true)
    this.drawHero(hero, pose, frame.ambient, 0.8)
    if (time >= hitTime) this.drawImpactWorld(visualTime, frame.ambient)
    context.restore()
    if (time >= hitTime) {
      this.drawImpactScreen(visualTime)
      this.drawDamage(visualTime, 0.9)
    }
    this.drawVignette(0.34)
  }

  private drawArena(ambient: number, voidAmount: number) {
    const context = this.context
    const gradient = context.createLinearGradient(0, 0, 0, STAGE_HEIGHT)
    gradient.addColorStop(0, '#07172f')
    gradient.addColorStop(0.58, '#173d5c')
    gradient.addColorStop(1, '#091324')
    context.fillStyle = gradient
    context.fillRect(-500, -400, STAGE_WIDTH + 1000, STAGE_HEIGHT + 800)
    if (this.arena.complete && this.arena.naturalWidth > 0) {
      context.globalAlpha = 1 - voidAmount * 0.9
      context.drawImage(this.arena, 0, 0, STAGE_WIDTH, STAGE_HEIGHT)
      context.globalAlpha = 1
    }
    const aurora = context.createLinearGradient(0, 0, STAGE_WIDTH, 300)
    aurora.addColorStop(0, `rgba(41, 239, 220, ${0.025 + Math.sin(ambient * 0.4) * 0.01})`)
    aurora.addColorStop(0.5, 'rgba(72, 122, 255, 0.04)')
    aurora.addColorStop(1, 'rgba(255, 196, 105, 0.03)')
    context.fillStyle = aurora
    context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  }

  private drawVoid(ambient: number, amount: number) {
    const context = this.context
    context.save()
    context.globalAlpha = amount
    const voidGradient = context.createRadialGradient(350, 350, 20, 500, 350, 800)
    voidGradient.addColorStop(0, 'rgba(19, 63, 93, 0.4)')
    voidGradient.addColorStop(0.45, 'rgba(5, 15, 39, 0.88)')
    voidGradient.addColorStop(1, 'rgba(2, 5, 20, 0.98)')
    context.fillStyle = voidGradient
    context.fillRect(-600, -500, STAGE_WIDTH + 1200, STAGE_HEIGHT + 1000)
    this.stars.forEach(star => {
      const alpha = 0.3 + Math.sin(ambient * 2 + star.phase) * 0.25
      context.fillStyle = `rgba(167, 241, 255, ${alpha})`
      context.beginPath()
      context.arc(star.x, star.y, star.size, 0, TAU)
      context.fill()
    })
    context.restore()
  }

  private drawAmbientMotes(ambient: number, opacity: number) {
    const context = this.context
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 173.3 + ambient * (4 + index % 4)) % (STAGE_WIDTH + 80) - 40
      const y = 180 + (index * 83) % 470 + Math.sin(ambient * 0.7 + index) * 18
      const alpha = (0.12 + Math.sin(ambient * 1.4 + index * 2.1) * 0.08) * opacity
      context.fillStyle = `rgba(114, 233, 255, ${alpha})`
      context.beginPath()
      context.arc(x, y, 1 + index % 3 * 0.45, 0, TAU)
      context.fill()
    }
    context.restore()
  }

  private drawCelestialMagic(time: number, ambient: number, hero: HeroTransform) {
    const context = this.context
    const charge = smooth(segment(time, 0.48, 1.15)) * (1 - smooth(segment(time, 1.25, 1.5)))
    const aerial = smooth(segment(time, 2.25, 2.65)) * (1 - smooth(segment(time, 3.35, 3.65)))
    const strength = Math.max(charge, aerial)
    if (strength <= 0.005) return
    const centerX = charge > aerial ? 350 : hero.x
    const centerY = charge > aerial ? 400 : hero.y - 80
    context.save()
    context.translate(centerX, centerY)
    context.globalCompositeOperation = 'lighter'
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = (82 + ring * 48 + Math.sin(ambient * 2 + ring) * 7) * (0.75 + strength * 0.25)
      context.save()
      context.rotate(ambient * (ring % 2 ? -0.24 : 0.18) + ring)
      context.scale(1, 0.38 + ring * 0.12)
      context.strokeStyle = `rgba(${ring === 1 ? '255, 208, 119' : '90, 229, 255'}, ${0.18 + strength * 0.32})`
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
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, 170)
    glow.addColorStop(0, `rgba(87, 223, 255, ${0.1 * strength})`)
    glow.addColorStop(1, 'rgba(40, 140, 255, 0)')
    context.fillStyle = glow
    context.fillRect(-180, -180, 360, 360)
    context.restore()
  }

  private drawMotionTrails(time: number, hero: HeroTransform) {
    const context = this.context
    const run = segment(time, 1.35, 2.25) * (1 - segment(time, 2.25, 2.35))
    const aerial = segment(time, 2.35, 2.7) * (1 - segment(time, 3.3, 3.5))
    const dive = segment(time, 3.45, 3.8) * (1 - segment(time, 4.48, 4.56))
    context.save()
    context.globalCompositeOperation = 'lighter'
    if (run > 0) {
      for (let index = 0; index < 5; index += 1) {
        context.strokeStyle = `rgba(79, 218, 255, ${run * (0.16 - index * 0.022)})`
        context.lineWidth = 2 + index
        context.beginPath()
        context.moveTo(hero.x - 40 - index * 22, hero.y - 50 - index * 13)
        context.quadraticCurveTo(hero.x - 130, hero.y - 30, hero.x - 210 - index * 28, hero.y + 5)
        context.stroke()
      }
    }
    if (aerial > 0) {
      for (let index = 0; index < 3; index += 1) {
        context.strokeStyle = `rgba(${index === 1 ? '255, 211, 125' : '95, 226, 255'}, ${aerial * (0.36 - index * 0.08)})`
        context.lineWidth = 5 - index
        context.beginPath()
        context.arc(hero.x, hero.y - 75, 120 + index * 18, -2.4 + time * 0.5, 0.3 + time * 0.5)
        context.stroke()
      }
    }
    if (dive > 0) {
      for (let index = 0; index < 7; index += 1) {
        context.strokeStyle = `rgba(108, 229, 255, ${dive * (0.25 - index * 0.025)})`
        context.lineWidth = 2 + index % 3
        context.beginPath()
        context.moveTo(hero.x - 45 - index * 18, hero.y - 160 - index * 24)
        context.lineTo(hero.x + 35 - index * 9, hero.y - 40 - index * 8)
        context.stroke()
      }
    }
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

  private drawHero(transform: HeroTransform, pose: HeroPose, ambient: number, charge: number) {
    const context = this.context
    const joints = jointsFor(pose)
    context.save()
    context.translate(transform.x, transform.y)
    context.rotate(radians(transform.rotation))
    context.scale(transform.facing * transform.scale, transform.scale)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    this.drawCoatTails(pose, ambient)

    // Rear arm and leg.
    segmentShape(context, joints.shoulderBack, joints.elbowBack, 16, 13, '#142c51')
    segmentShape(context, joints.elbowBack, joints.handBack, 12, 9, '#203b60')
    this.drawBootLeg(joints.hipBack, joints.kneeBack, joints.ankleBack, false)

    // Long coat body and torso.
    const torsoGradient = context.createLinearGradient(-35, -115, 40, 5)
    torsoGradient.addColorStop(0, '#274d79')
    torsoGradient.addColorStop(0.48, '#102b51')
    torsoGradient.addColorStop(1, '#081c39')
    const torsoPoints = [
      rotate({ x: -34, y: -98 }, radians(pose.torso)),
      rotate({ x: 30, y: -102 }, radians(pose.torso)),
      rotate({ x: 38, y: -62 }, radians(pose.torso)),
      { x: 25, y: -2 },
      { x: -27, y: -2 },
      rotate({ x: -40, y: -60 }, radians(pose.torso)),
    ]
    polygon(context, torsoPoints, torsoGradient, '#081426', 3)

    // White chest panel, gold seams and high collar.
    const chest = [
      rotate({ x: -7, y: -96 }, radians(pose.torso)),
      rotate({ x: 25, y: -91 }, radians(pose.torso)),
      rotate({ x: 22, y: -51 }, radians(pose.torso)),
      { x: 4, y: -19 },
      { x: -9, y: -50 },
    ]
    polygon(context, chest, '#d9edf2', '#8ec6d4', 1.4)
    context.strokeStyle = '#d6b568'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(-23, -83)
    context.quadraticCurveTo(-6, -58, -9, -12)
    context.stroke()
    context.beginPath()
    context.moveTo(27, -77)
    context.lineTo(12, -63)
    context.stroke()
    context.fillStyle = '#e8c778'
    for (let index = 0; index < 3; index += 1) {
      context.beginPath()
      context.arc(-10, -51 + index * 15, 2.2, 0, TAU)
      context.fill()
    }

    // Belt and hip armor.
    polygon(context, [{ x: -29, y: -16 }, { x: 28, y: -18 }, { x: 29, y: -5 }, { x: -28, y: -3 }], '#101a2c', '#c5a45d', 2)
    polygon(context, [{ x: -5, y: -18 }, { x: 10, y: -18 }, { x: 13, y: -5 }, { x: -2, y: 0 }, { x: -10, y: -8 }], '#d6b667', '#fff0b0', 1.2)

    this.drawBootLeg(joints.hipFront, joints.kneeFront, joints.ankleFront, true)

    // Neck and animated head/face/hair.
    segmentShape(context, joints.neck, { x: joints.head.x, y: joints.head.y + 22 }, 10, 11, '#b97955')
    this.drawHead(joints.head, pose, ambient, charge)

    // Front sleeve, forearm and hand around the weapon.
    const sleeveGradient = context.createLinearGradient(joints.shoulderFront.x, joints.shoulderFront.y, joints.elbowFront.x, joints.elbowFront.y)
    sleeveGradient.addColorStop(0, '#315e8b')
    sleeveGradient.addColorStop(1, '#102746')
    segmentShape(context, joints.shoulderFront, joints.elbowFront, 18, 13, sleeveGradient)
    segmentShape(context, joints.elbowFront, joints.handFront, 13, 9, '#d7e5e8')
    context.strokeStyle = '#d5b365'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(joints.elbowFront.x - 7, joints.elbowFront.y)
    context.lineTo(joints.elbowFront.x + 7, joints.elbowFront.y)
    context.stroke()
    context.fillStyle = '#c88e66'
    context.strokeStyle = '#402b2a'
    context.lineWidth = 1.5
    context.beginPath()
    context.arc(joints.handFront.x, joints.handFront.y, 9, 0, TAU)
    context.fill()
    context.stroke()

    this.drawLance(joints.handFront, pose.weapon + pose.torso, charge, ambient)

    // Shoulder guard and original winged Nexus insignia.
    const guard = rotate({ x: 28, y: -89 }, radians(pose.torso))
    context.save()
    context.translate(guard.x, guard.y)
    context.rotate(radians(pose.torso))
    polygon(context, [{ x: -16, y: -7 }, { x: 9, y: -13 }, { x: 21, y: -2 }, { x: 6, y: 8 }, { x: -15, y: 5 }], '#d5e7eb', '#b49556', 2)
    context.strokeStyle = '#33758e'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(-5, 0)
    context.lineTo(7, -4)
    context.lineTo(13, -1)
    context.stroke()
    context.restore()
    context.restore()
  }

  private drawCoatTails(pose: HeroPose, ambient: number) {
    const context = this.context
    const wind = pose.coat
    const wave = Math.sin(ambient * 7) * 7
    const gradient = context.createLinearGradient(-60, -40, -90, 90)
    gradient.addColorStop(0, '#1d456f')
    gradient.addColorStop(0.6, '#102b50')
    gradient.addColorStop(1, '#07182f')
    context.save()
    context.globalAlpha = 0.98
    context.beginPath()
    context.moveTo(-22, -45)
    context.bezierCurveTo(-55 - wind * 0.4, -24, -70 - wind, 38 + wave, -54 - wind * 1.2, 92 + wave)
    context.lineTo(-22 - wind * 0.65, 68 + wave * 0.4)
    context.bezierCurveTo(-28, 25, -4, -5, -2, -35)
    context.closePath()
    context.fillStyle = gradient
    context.fill()
    context.strokeStyle = '#09162b'
    context.lineWidth = 3
    context.stroke()
    context.strokeStyle = '#c4a45e'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(-54 - wind * 1.2, 89 + wave)
    context.lineTo(-22 - wind * 0.65, 65 + wave * 0.4)
    context.stroke()
    context.beginPath()
    context.moveTo(5, -40)
    context.bezierCurveTo(-20 - wind * 0.3, 5, -25 - wind * 0.75, 55 - wave, -8 - wind * 0.9, 100 - wave)
    context.lineTo(20 - wind * 0.5, 65)
    context.bezierCurveTo(28, 15, 24, -15, 22, -37)
    context.closePath()
    context.fillStyle = '#15365c'
    context.fill()
    context.strokeStyle = '#09162b'
    context.lineWidth = 3
    context.stroke()
    context.restore()
  }

  private drawBootLeg(hip: Point, knee: Point, ankle: Point, front: boolean) {
    const context = this.context
    segmentShape(context, hip, knee, front ? 17 : 15, 13, front ? '#172b48' : '#101f38')
    segmentShape(context, knee, ankle, 14, 10, front ? '#d3e2e6' : '#839cab')
    const guardCenter = { x: lerp(knee.x, ankle.x, 0.25), y: lerp(knee.y, ankle.y, 0.25) }
    polygon(context, [
      { x: guardCenter.x - 12, y: guardCenter.y - 11 },
      { x: guardCenter.x + 10, y: guardCenter.y - 13 },
      { x: guardCenter.x + 12, y: guardCenter.y + 8 },
      { x: guardCenter.x, y: guardCenter.y + 16 },
      { x: guardCenter.x - 11, y: guardCenter.y + 7 },
    ], front ? '#244a6c' : '#17324f', '#c0a15f', 1.8)
    const direction = Math.sign(ankle.x - knee.x || 1)
    polygon(context, [
      { x: ankle.x - 10, y: ankle.y - 5 },
      { x: ankle.x + 9, y: ankle.y - 6 },
      { x: ankle.x + 19 * direction, y: ankle.y + 6 },
      { x: ankle.x + 16 * direction, y: ankle.y + 12 },
      { x: ankle.x - 11, y: ankle.y + 10 },
    ], '#0b1a30', '#7795a6', 2)
  }

  private drawHead(center: Point, pose: HeroPose, ambient: number, charge: number) {
    const context = this.context
    context.save()
    context.translate(center.x, center.y)
    context.rotate(radians(pose.head + pose.torso * 0.35))
    const flutter = Math.sin(ambient * 9) * (1.5 + Math.abs(pose.hair) * 0.12)

    // Back hair mass.
    const hairGradient = context.createLinearGradient(-25, -35, 28, 30)
    hairGradient.addColorStop(0, '#263d61')
    hairGradient.addColorStop(0.45, '#111e39')
    hairGradient.addColorStop(1, '#070f23')
    context.beginPath()
    context.moveTo(-29, 17)
    context.quadraticCurveTo(-43, -20, -19, -39)
    context.quadraticCurveTo(8, -54, 31, -31)
    context.quadraticCurveTo(43, -8, 26, 25)
    context.lineTo(14, 14)
    context.lineTo(-18, 25)
    context.closePath()
    context.fillStyle = hairGradient
    context.fill()
    context.strokeStyle = '#071020'
    context.lineWidth = 2.5
    context.stroke()

    // Skin and anime facial silhouette.
    const skin = context.createLinearGradient(-20, -20, 22, 24)
    skin.addColorStop(0, '#e7b088')
    skin.addColorStop(0.55, '#ca8b64')
    skin.addColorStop(1, '#a8664d')
    context.beginPath()
    context.moveTo(-23, -19)
    context.quadraticCurveTo(-26, 5, -14, 23)
    context.quadraticCurveTo(0, 38, 11, 29)
    context.quadraticCurveTo(25, 17, 28, -7)
    context.lineTo(20, -27)
    context.closePath()
    context.fillStyle = skin
    context.fill()
    context.strokeStyle = '#4c3030'
    context.lineWidth = 1.8
    context.stroke()
    // Ear.
    context.fillStyle = '#bd7b5b'
    context.beginPath()
    context.ellipse(-25, 2, 6, 10, -0.2, 0, TAU)
    context.fill()

    const blinkCycle = ambient % 3.8
    const blink = blinkCycle > 3.62 ? 0.12 : 1
    const eyeOpen = clamp(pose.eye * blink, 0.06, 1)
    const glow = clamp(charge, 0, 1)
    this.drawEye(-8, -5, 10, eyeOpen, glow, false)
    this.drawEye(13, -6, 9, eyeOpen, glow, true)

    // Determined eyebrows, nose and mouth all remain rigged to the head.
    context.strokeStyle = '#172037'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(-18, -15)
    context.lineTo(-3, -12 - pose.shout * 2)
    context.moveTo(6, -13 - pose.shout * 2)
    context.lineTo(21, -17)
    context.stroke()
    context.strokeStyle = '#8c5547'
    context.lineWidth = 1.4
    context.beginPath()
    context.moveTo(12, -1)
    context.lineTo(16, 8)
    context.lineTo(11, 9)
    context.stroke()
    if (pose.shout > 0.15) {
      context.fillStyle = '#5b2830'
      context.beginPath()
      context.ellipse(5, 20, 8, 2 + pose.shout * 4, -0.08, 0, TAU)
      context.fill()
      context.fillStyle = '#f2d5c5'
      context.fillRect(-1, 17, 12, 2)
    } else {
      context.strokeStyle = '#74443f'
      context.lineWidth = 1.8
      context.beginPath()
      context.moveTo(-1, 20)
      context.quadraticCurveTo(7, 23, 14, 18)
      context.stroke()
    }

    // Individual animated hair spikes, including Aelion's silver streak.
    const spikes = [
      [-24, -22, -46, -28, -30, -9],
      [-18, -33, -35, -52, -7, -39],
      [-4, -39, -8, -59, 10, -40],
      [9, -38, 28, -54, 23, -29],
      [22, -28, 47, -34, 30, -13],
      [27, -13, 46, -8, 28, 1],
      [-23, -11, -40, 3, -22, 8],
    ]
    spikes.forEach((spike, index) => {
      const drift = flutter * (index % 2 ? 1 : -0.7)
      context.beginPath()
      context.moveTo(spike[0], spike[1])
      context.quadraticCurveTo(spike[2] + drift, spike[3] - 5, spike[4] + drift, spike[5])
      context.quadraticCurveTo(spike[2], spike[4] + 10, spike[0], spike[1])
      context.fillStyle = index === 2 ? '#263a5a' : hairGradient
      context.fill()
      context.strokeStyle = '#091226'
      context.lineWidth = 1.5
      context.stroke()
    })
    context.beginPath()
    context.moveTo(-7, -39)
    context.quadraticCurveTo(-1, -53 + flutter, 7, -43)
    context.quadraticCurveTo(1, -28, -4, -17)
    context.quadraticCurveTo(-12, -27, -7, -39)
    context.fillStyle = '#c2d2df'
    context.fill()
    context.strokeStyle = '#6f829b'
    context.lineWidth = 1.2
    context.stroke()
    context.restore()
  }

  private drawEye(x: number, y: number, width: number, open: number, glow: number, narrow: boolean) {
    const context = this.context
    context.save()
    context.translate(x, y)
    context.scale(1, open)
    context.fillStyle = '#f4f1e8'
    context.beginPath()
    context.moveTo(-width * 0.65, 0)
    context.quadraticCurveTo(0, -6, width * 0.65, narrow ? -1 : 0)
    context.quadraticCurveTo(0, 6, -width * 0.65, 0)
    context.fill()
    context.fillStyle = glow > 0.5 ? '#fff3a0' : '#d8ae45'
    context.shadowColor = '#ffe979'
    context.shadowBlur = glow * 10
    context.beginPath()
    context.ellipse(1, 0, 3.3, 5, 0, 0, TAU)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#182039'
    context.beginPath()
    context.ellipse(1.5, 0, 1.3, 3.7, 0, 0, TAU)
    context.fill()
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(0, -2, 1.1, 0, TAU)
    context.fill()
    context.restore()
  }

  private drawLance(hand: Point, angleDegrees: number, charge: number, ambient: number) {
    const context = this.context
    const angle = radians(angleDegrees)
    const direction = { x: Math.cos(angle), y: Math.sin(angle) }
    const normal = { x: -direction.y, y: direction.x }
    const start = { x: hand.x - direction.x * 70, y: hand.y - direction.y * 70 }
    const end = { x: hand.x + direction.x * 142, y: hand.y + direction.y * 142 }
    context.save()
    context.globalCompositeOperation = 'source-over'
    context.strokeStyle = '#071426'
    context.lineWidth = 10
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
    context.strokeStyle = '#8ba8b8'
    context.lineWidth = 5
    context.stroke()
    context.strokeStyle = '#e2c475'
    context.lineWidth = 2
    context.setLineDash([14, 22])
    context.lineDashOffset = -ambient * 12
    context.stroke()
    context.setLineDash([])
    const base = end
    const tip = { x: end.x + direction.x * (48 + charge * 9), y: end.y + direction.y * (48 + charge * 9) }
    const crystal = [
      { x: base.x + normal.x * 18, y: base.y + normal.y * 18 },
      { x: tip.x, y: tip.y },
      { x: base.x - normal.x * 18, y: base.y - normal.y * 18 },
      { x: base.x - direction.x * 20, y: base.y - direction.y * 20 },
    ]
    context.shadowColor = '#52e9ff'
    context.shadowBlur = 8 + charge * 18
    const crystalGradient = context.createLinearGradient(base.x, base.y, tip.x, tip.y)
    crystalGradient.addColorStop(0, '#167fa9')
    crystalGradient.addColorStop(0.55, '#70f0ff')
    crystalGradient.addColorStop(1, '#f3ffff')
    polygon(context, crystal, crystalGradient, '#c4fbff', 2)
    context.shadowBlur = 0
    context.strokeStyle = `rgba(255, 255, 255, ${0.45 + charge * 0.4})`
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(base.x, base.y)
    context.lineTo(tip.x, tip.y)
    context.stroke()
    if (charge > 0.25) {
      context.globalCompositeOperation = 'lighter'
      for (let index = 0; index < 4; index += 1) {
        const orbit = ambient * (1.4 + index * 0.1) + index * TAU / 4
        const radius = 28 + index * 4
        const x = base.x + Math.cos(orbit) * radius
        const y = base.y + Math.sin(orbit) * radius * 0.55
        context.save()
        context.translate(x, y)
        context.rotate(orbit)
        polygon(context, [{ x: 0, y: -5 }, { x: 3, y: 0 }, { x: 0, y: 5 }, { x: -3, y: 0 }], '#8cf5ff', 'transparent', 0)
        context.restore()
      }
    }
    context.restore()
  }

  private drawGolem(time: number, ambient: number, cinematic: boolean) {
    const context = this.context
    const hit = easeOut(segment(time, 4.5, 4.64))
    const reaction = smooth(segment(time, 4.5, 5.65))
    const brace = cinematic ? smooth(segment(time, 3.75, 4.38)) * (1 - hit) : 0
    const damaged = time >= 4.5
    const rootX = GOLEM_X + hit * 35 + Math.sin(ambient * 64) * (1 - segment(time, 4.5, 4.95)) * hit * 5
    const rootY = GOLEM_GROUND + reaction * 24
    const bodyRotation = radians(hit * 13 - brace * 4 + Math.sin(ambient * 1.3) * (damaged ? 0 : 1))

    context.save()
    context.translate(rootX, rootY)
    context.rotate(bodyRotation)
    context.lineJoin = 'round'
    const rock = context.createLinearGradient(-70, -190, 70, 0)
    rock.addColorStop(0, '#52647b')
    rock.addColorStop(0.45, '#26364e')
    rock.addColorStop(1, '#101a2d')

    // Back arm braces, then recoils with a visible elbow arc.
    const leftShoulder = { x: -52, y: -150 }
    const leftElbow = { x: -86 - brace * 15 + hit * 24, y: -105 - brace * 48 - hit * 25 }
    const leftHand = { x: -72 - brace * 30 + hit * 50, y: -62 - brace * 75 - hit * 40 }
    segmentShape(context, leftShoulder, leftElbow, 24, 20, rock, '#101827')
    segmentShape(context, leftElbow, leftHand, 22, 18, rock, '#101827')

    // Legs buckle rather than simply fading away.
    const kneeDrop = reaction * 28
    segmentShape(context, { x: -27, y: -62 }, { x: -40 - reaction * 12, y: -20 + kneeDrop }, 26, 22, rock, '#101827')
    segmentShape(context, { x: -40 - reaction * 12, y: -20 + kneeDrop }, { x: -54, y: 0 }, 23, 20, rock, '#101827')
    segmentShape(context, { x: 27, y: -62 }, { x: 42 + reaction * 20, y: -18 + kneeDrop * 0.6 }, 26, 22, rock, '#101827')
    segmentShape(context, { x: 42 + reaction * 20, y: -18 + kneeDrop * 0.6 }, { x: 55, y: 0 }, 23, 20, rock, '#101827')

    polygon(context, [
      { x: -48, y: -169 }, { x: -20, y: -191 }, { x: 29, y: -185 }, { x: 55, y: -153 },
      { x: 45, y: -72 }, { x: 21, y: -48 }, { x: -28, y: -54 }, { x: -52, y: -92 },
    ], rock, '#111a2b', 4)
    polygon(context, [{ x: -48, y: -169 }, { x: -20, y: -191 }, { x: -7, y: -143 }, { x: -34, y: -114 }], '#40566e', '#677a8e', 1.5)
    polygon(context, [{ x: 29, y: -185 }, { x: 55, y: -153 }, { x: 30, y: -120 }, { x: 7, y: -143 }], '#1b2b43', '#566c83', 1.5)

    // Core reacts to the approaching lance and fractures on impact.
    const corePulse = 0.7 + Math.sin(ambient * (damaged ? 18 : 4)) * 0.2
    context.save()
    context.shadowColor = damaged ? '#ffcf74' : '#5deeff'
    context.shadowBlur = 12 + corePulse * 10
    polygon(context, [{ x: 0, y: -157 }, { x: 25, y: -130 }, { x: 16, y: -92 }, { x: 0, y: -77 }, { x: -19, y: -97 }, { x: -25, y: -130 }], damaged ? '#eaa954' : '#39cbe7', '#b8fbff', 2.5)
    polygon(context, [{ x: 0, y: -146 }, { x: 13, y: -127 }, { x: 7, y: -103 }, { x: 0, y: -94 }, { x: -9, y: -108 }, { x: -12, y: -128 }], damaged ? '#fff0a1' : '#c4ffff', 'transparent', 0)
    context.restore()

    // Head, eyes and neck.
    const headTilt = radians(-brace * 8 + hit * 18)
    context.save()
    context.translate(4 + hit * 8, -205 + reaction * 5)
    context.rotate(headTilt)
    polygon(context, [{ x: -29, y: -22 }, { x: 0, y: -36 }, { x: 30, y: -19 }, { x: 25, y: 18 }, { x: 0, y: 30 }, { x: -27, y: 15 }], rock, '#111a2b', 3)
    context.strokeStyle = damaged ? '#ffc86c' : '#8df6ff'
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

    // Front arm.
    const rightShoulder = { x: 49, y: -151 }
    const rightElbow = { x: 82 + brace * 5 + hit * 30, y: -108 - brace * 42 - hit * 12 }
    const rightHand = { x: 70 - brace * 25 + hit * 58, y: -62 - brace * 78 - hit * 20 }
    segmentShape(context, rightShoulder, rightElbow, 25, 21, rock, '#101827')
    segmentShape(context, rightElbow, rightHand, 23, 18, rock, '#101827')
    ;[leftElbow, leftHand, rightElbow, rightHand].forEach((joint, index) => {
      polygon(context, [
        { x: joint.x - 15, y: joint.y - 12 }, { x: joint.x + 10, y: joint.y - 16 },
        { x: joint.x + 18, y: joint.y + 5 }, { x: joint.x, y: joint.y + 18 }, { x: joint.x - 17, y: joint.y + 8 },
      ], index % 2 ? '#31465e' : '#3c5269', '#172235', 2)
    })

    if (damaged) {
      const crack = easeOut(segment(time, 4.5, 4.9))
      context.strokeStyle = `rgba(255, 220, 137, ${0.55 + corePulse * 0.35})`
      context.lineWidth = 2.2
      context.shadowColor = '#ffb85c'
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

  private drawImpactWorld(time: number, ambient: number) {
    if (time < 4.5 || time > 6.1) return
    const context = this.context
    const elapsed = time - 4.5
    const origin = { x: 915, y: 440 }
    const ring = easeOut(segment(elapsed, 0, 0.7))
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.strokeStyle = `rgba(157, 246, 255, ${1 - ring})`
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
      context.strokeStyle = `rgba(${ray % 3 ? '102, 232, 255' : '255, 215, 132'}, ${0.7 * (1 - ring)})`
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(origin.x + Math.cos(angle) * inner, origin.y + Math.sin(angle) * inner)
      context.lineTo(origin.x + Math.cos(angle) * outer, origin.y + Math.sin(angle) * outer)
      context.stroke()
    }
    context.restore()

    // Physical debris: ballistic movement and rotation, kept away from silhouettes.
    this.debris.forEach((piece, index) => {
      const localTime = Math.max(0, elapsed - index % 4 * 0.012)
      if (localTime <= 0 || localTime > 1.4) return
      const x = origin.x + Math.cos(piece.angle) * piece.speed * localTime
      const y = origin.y + Math.sin(piece.angle) * piece.speed * localTime + 260 * localTime * localTime - piece.lift * localTime
      const alpha = 1 - segment(localTime, 0.85, 1.4)
      context.save()
      context.translate(x, y)
      context.rotate(piece.spin * localTime + ambient * 0.2)
      context.globalAlpha = alpha
      polygon(context, [
        { x: -piece.size, y: -piece.size * 0.4 }, { x: piece.size * 0.7, y: -piece.size * 0.7 },
        { x: piece.size, y: piece.size * 0.5 }, { x: -piece.size * 0.5, y: piece.size },
      ], index % 4 === 0 ? '#7de9f4' : '#344b61', '#8ca5af', 1)
      context.restore()
    })
  }

  private drawSpeedLines(time: number, ambient: number) {
    const context = this.context
    const intensity = smooth(segment(time, 3.45, 3.85))
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < 24; index += 1) {
      const y = (index * 71 + ambient * 530) % 800 - 40
      const x = (index * 149 + ambient * 280) % 1400 - 60
      const length = 70 + index % 5 * 30
      context.strokeStyle = `rgba(141, 231, 255, ${intensity * (0.07 + index % 4 * 0.025)})`
      context.lineWidth = 1 + index % 3
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x - length * 0.45, y - length)
      context.stroke()
    }
    context.restore()
  }

  private drawImpactScreen(time: number) {
    if (time < 4.5 || time > 4.9) return
    const context = this.context
    const elapsed = time - 4.5
    const flash = Math.max(0, 1 - elapsed / 0.12) * 0.72
    if (flash > 0) {
      const gradient = context.createRadialGradient(900, 425, 10, 900, 425, 650)
      gradient.addColorStop(0, `rgba(235, 255, 255, ${flash})`)
      gradient.addColorStop(0.3, `rgba(96, 224, 255, ${flash * 0.45})`)
      gradient.addColorStop(1, 'rgba(32, 98, 192, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
    }
    this.drawDamage(time, 1)
  }

  private drawDamage(time: number, opacity: number) {
    const elapsed = time - 4.5
    if (elapsed < 0.07 || elapsed > 1.35) return
    const context = this.context
    const enter = easeOut(segment(elapsed, 0.07, 0.25))
    const leave = 1 - smooth(segment(elapsed, 0.95, 1.35))
    const alpha = enter * leave * opacity
    const y = lerp(270, 210, easeOut(segment(elapsed, 0.07, 1.1)))
    context.save()
    context.globalAlpha = alpha
    context.translate(930, y)
    context.rotate(-0.055)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 26px Manrope, sans-serif'
    context.fillStyle = '#ffe39a'
    context.shadowColor = '#071225'
    context.shadowBlur = 8
    context.fillText('CRITIQUE · BRÈCHE', 0, -42)
    context.font = 'italic 900 68px Manrope, sans-serif'
    context.lineWidth = 9
    context.strokeStyle = '#10213c'
    context.strokeText('48 260', 0, 6)
    const gradient = context.createLinearGradient(0, -30, 0, 35)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.45, '#b9f7ff')
    gradient.addColorStop(1, '#45cbe9')
    context.fillStyle = gradient
    context.fillText('48 260', 0, 6)
    context.restore()
  }

  private drawCinematicText(time: number, mode: UltimateMode) {
    const context = this.context
    const titleAlpha = smooth(segment(time, 0.68, 0.86)) * (1 - smooth(segment(time, 1.18, 1.34)))
    if (titleAlpha > 0) {
      context.save()
      context.globalAlpha = titleAlpha
      context.textAlign = 'left'
      context.fillStyle = '#8fefff'
      context.font = '600 15px Cinzel, serif'
      context.letterSpacing = '4px'
      context.fillText('AELION · NEXUS', 76, 477)
      context.fillStyle = '#f4f8ff'
      context.font = '600 43px Cinzel, serif'
      context.shadowColor = '#071225'
      context.shadowBlur = 12
      context.fillText('SERMENT', 72, 530)
      context.fillStyle = '#e4c77e'
      context.fillText('DU ZÉNITH', 72, 578)
      context.fillStyle = '#69dff2'
      context.fillRect(75, 596, 160 * titleAlpha, 2)
      context.restore()
    }

    let subtitle = ''
    if (time >= 0.62 && time < 1.3) subtitle = '« Nexus… réponds à mon serment. »'
    else if (time >= 2.48 && time < 3.35) subtitle = '« Le ciel ne connaît aucune limite. »'
    else if (time >= 3.8 && time < 4.62) subtitle = '« Zénith… PERCE ! »'
    else if (time >= 5.85 && time < 6.65) subtitle = '« Serment accompli. »'
    if (subtitle) {
      const fontSize = mode === 'short' ? 19 : 20
      context.save()
      context.textAlign = 'center'
      context.font = `500 ${fontSize}px Manrope, sans-serif`
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
    context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  }

  private drawLetterbox(amount: number) {
    if (amount <= 0) return
    const context = this.context
    const height = 38 * amount
    context.fillStyle = '#02050d'
    context.fillRect(0, 0, STAGE_WIDTH, height)
    context.fillRect(0, STAGE_HEIGHT - height, STAGE_WIDTH, height)
    context.fillStyle = `rgba(115, 222, 239, ${0.22 * amount})`
    context.fillRect(0, height, STAGE_WIDTH, 1)
    context.fillRect(0, STAGE_HEIGHT - height - 1, STAGE_WIDTH, 1)
  }
}

export function mapShortTime(time: number) {
  return keyed(time, [[0, 0.42], [0.24, 0.76], [0.55, 1.28], [0.86, 2.3], [1.08, 3.44], [1.35, 4.5], [1.67, 5.22], [1.98, 6.5], [2.4, 8]], easeInOut)
}

export function shotAt(time: number) {
  if (time < 0.55) return { index: 1, name: 'L’appel du Nexus', detail: 'Anticipation · le monde retient son souffle' }
  if (time < 1.35) return { index: 2, name: 'Le serment s’éveille', detail: 'Gros plan · la lance de cristal répond' }
  if (time < 2.35) return { index: 3, name: 'L’élan céleste', detail: 'Traveling · course, foulées et envol' }
  if (time < 3.45) return { index: 4, name: 'Au-dessus du Zénith', detail: 'Caméra orbitale · rotation aérienne' }
  if (time < 4.5) return { index: 5, name: 'La percée', detail: 'Caméra poursuite · piqué accéléré' }
  if (time < 5.65) return { index: 6, name: 'Impact du Nexus', detail: 'Impact · réaction du golem et dégâts' }
  if (time < 6.75) return { index: 7, name: 'Serment accompli', detail: 'Réception · récupération et retour au combat' }
  return { index: 7, name: 'Retour au combat', detail: 'La caméra et les contrôles sont restitués' }
}

export function impactGlow(time: number) {
  return pulse(time, 4.5, 0.35)
}
