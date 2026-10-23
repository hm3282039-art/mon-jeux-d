import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  clamp,
  easeIn,
  easeInOut,
  easeOut,
  keyed,
  lerp,
  seededRandom,
  segment,
  smooth,
} from './math'
import { HERO_PRESENTATION, RIG_HEAD_POINTS, RigLibrary, isNewHero, rigPoint } from './rig'
import type { HeroId, RigPose, RigTransform } from './rig'
import { CreatureLibrary, creaturePoint } from './creatures'
import type { CreaturePose } from './creatures'
import { NEW_HEROES, NEW_STORYBOARDS } from './new-heroes'
import type { NewHeroId } from './new-heroes'
import { NEW_ATTACHMENTS, idleNewHeroState, newHeroState } from './new-motions'

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
type DragonState = {
  transform: RigTransform
  pose: CreaturePose
}

const TAU = Math.PI * 2
const DRAGON_X = 870
const DRAGON_GROUND = 592
const IMPACT_POINT = { x: 835, y: 440 }
type HeroStyle = { color: string; rgb: string; secondary: string; dark: string }
const BASE_STYLES = {
  kaelis: { color: '#ffe0a0', rgb: '255, 185, 66', secondary: '255, 236, 174', dark: '#07172f' },
  nyxara: { color: '#c7b1ff', rgb: '173, 128, 255', secondary: '116, 236, 255', dark: '#100b2c' },
}
const ULTIMATE_LINES: Record<HeroId, [string, string]> = {
  kaelis: ['AUBE', 'INCARNÉE'], nyxara: ['REQUIEM DES', 'CONSTELLATIONS'],
  talys: ['JUGEMENT', 'CÉLESTE'], ilya: ['POINTE DE', 'L’HIVER'],
  nox: ['DANSE DES', 'ÉCLIPSES'], elowen: ['SANCTUAIRE', 'SAUVAGE'],
  brakar: ['SÉISME DU', 'ZÉNITH'],
}
const CINEMATIC_LINES: Record<HeroId, { intro: string; middle: string; end: string }> = {
  kaelis: { intro: '« La nuit s’arrête ici. »', middle: '« Aube incarnée… »', end: '« L’aube demeure. »' },
  nyxara: { intro: '« Chaque étoile connaît ton nom. »', middle: '« Déroule le firmament. »', end: '« La constellation est scellée. »' },
  talys: { intro: '« Tu n’entendras pas le tonnerre. »', middle: '« Jugement céleste… »', end: '« Circuit terminé. »' },
  ilya: { intro: '« Une flèche suffit. »', middle: '« Cristal, prends ton envol. »', end: '« L’hiver se retire. »' },
  nox: { intro: '« Regarde derrière toi. »', middle: '« Deux ombres, une entaille. »', end: '« La nuit garde le secret. »' },
  elowen: { intro: '« Écoute la sève. »', middle: '« Grandis, sanctuaire. »', end: '« La sève apaise tout. »' },
  brakar: { intro: '« Tu vas sentir la montagne. »', middle: '« Séisme du Zénith… »', end: '« La montagne ne bouge pas. »' },
}
function heroStyle(hero: HeroId): HeroStyle {
  return isNewHero(hero) ? NEW_HEROES[hero] : BASE_STYLES[hero]
}
function usesRangedCamera(hero: HeroId) {
  return hero === 'nyxara' || hero === 'ilya' || hero === 'elowen'
}
type Framing = [focusX: number, focusY: number, zoom: number]
type CameraShot = { from: Framing; to: Framing }
const shot = (from: Framing, to: Framing): CameraShot => ({ from, to })
const CAMERA_TIMES = [0.55, 1.35, 2.35, 3.45, 4.5, 5.65, 8]
const CAMERA_SHOTS: Record<HeroId, CameraShot[]> = {
  kaelis: [
    shot([620, 370, 1], [655, 350, 1.04]),
    shot([330, 390, 1.9], [355, 375, 2.04]),
    shot([440, 370, 1.42], [490, 330, 1.68]),
    shot([660, 345, 0.94], [630, 325, 1.02]),
    shot([600, 385, 1.18], [830, 445, 1.68]),
    shot([865, 455, 1.28], [875, 445, 1.34]),
    shot([520, 390, 1.12], [640, 365, 1.02]),
  ],
  nyxara: [
    shot([620, 370, 1], [650, 355, 1.04]),
    shot([360, 390, 1.75], [385, 375, 1.9]),
    shot([510, 375, 1.2], [530, 350, 1.38]),
    shot([650, 350, 0.95], [630, 330, 1.03]),
    shot([650, 385, 1.18], [800, 435, 1.5]),
    shot([850, 450, 1.22], [870, 445, 1.28]),
    shot([560, 380, 1.2], [640, 365, 1.02]),
  ],
  talys: [
    shot([610, 375, 1], [650, 350, 1.05]),
    shot([370, 400, 1.8], [410, 385, 1.98]),
    shot([405, 420, 1.42], [455, 390, 1.62]),
    shot([650, 315, 0.88], [610, 285, 1.02]),
    shot([590, 390, 1.16], [810, 430, 1.58]),
    shot([845, 450, 1.25], [865, 440, 1.36]),
    shot([470, 405, 1.2], [640, 365, 1.02]),
  ],
  ilya: [
    shot([625, 370, 1], [650, 350, 1.03]),
    shot([345, 365, 1.78], [370, 350, 1.94]),
    shot([470, 390, 1.3], [520, 370, 1.48]),
    shot([610, 355, 0.94], [700, 345, 1.08]),
    shot([625, 370, 1.08], [825, 430, 1.46]),
    shot([850, 450, 1.2], [875, 440, 1.3]),
    shot([540, 380, 1.16], [640, 365, 1.02]),
  ],
  nox: [
    shot([610, 375, 1.02], [645, 355, 1.07]),
    shot([335, 370, 1.88], [365, 355, 2.02]),
    shot([420, 395, 1.38], [470, 360, 1.6]),
    shot([665, 320, 0.9], [600, 305, 1.04]),
    shot([570, 390, 1.15], [805, 425, 1.62]),
    shot([835, 435, 1.3], [875, 440, 1.4]),
    shot([490, 395, 1.2], [640, 365, 1.02]),
  ],
  elowen: [
    shot([620, 370, 1], [650, 350, 1.04]),
    shot([350, 375, 1.72], [380, 360, 1.88]),
    shot([450, 410, 1.22], [500, 385, 1.4]),
    shot([650, 345, 0.92], [680, 340, 1.02]),
    shot([600, 405, 1.08], [815, 440, 1.44]),
    shot([845, 450, 1.2], [870, 445, 1.3]),
    shot([530, 390, 1.15], [640, 365, 1.02]),
  ],
  brakar: [
    shot([610, 380, 0.98], [650, 355, 1.04]),
    shot([355, 395, 1.68], [390, 375, 1.86]),
    shot([430, 420, 1.25], [485, 385, 1.48]),
    shot([670, 300, 0.86], [625, 275, 1]),
    shot([580, 400, 1.12], [820, 445, 1.55]),
    shot([850, 465, 1.3], [875, 450, 1.38]),
    shot([500, 405, 1.15], [640, 365, 1.02]),
  ],
}
function cinematicShot(hero: HeroId, time: number): Framing {
  const found = CAMERA_TIMES.findIndex(end => time < end)
  const index = found < 0 ? CAMERA_TIMES.length - 1 : found
  const start = index === 0 ? 0 : CAMERA_TIMES[index - 1]
  const move = smooth(segment(time, start, CAMERA_TIMES[index]))
  const current = CAMERA_SHOTS[hero][index]
  return current.from.map((value, axis) => lerp(value, current.to[axis], move)) as Framing
}

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
  // Keep the knees connected during the flip and dive: broad body motion comes
  // from the root, while the lower body uses a compact, stable tucked pose.
  const airStability = smooth(segment(time, 1.92, 2.28)) * (1 - smooth(segment(time, 4.9, 5.45)))
  pose.legFront = lerp(pose.legFront, -10, airStability)
  pose.legBack = lerp(pose.legBack, 12, airStability)
  pose.legFrontLower = lerp(pose.legFrontLower, 16, airStability)
  pose.legBackLower = lerp(pose.legBackLower, 12, airStability)
  pose.skirt = lerp(pose.skirt, 3, airStability)
  pose.legFront = clamp(pose.legFront, -34, 34)
  pose.legBack = clamp(pose.legBack, -34, 34)
  pose.legFrontLower = clamp(pose.legFrontLower, -12, 42)
  pose.legBackLower = clamp(pose.legBackLower, -12, 42)
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
    // A complete aerial rotation, carried by the root while the tucked legs stay coherent.
    transform.rotation = lerp(-18, 408, easeInOut(air))
    transform.scale = 1.04
  } else if (time >= 3.45 && time < 4.5) {
    const dive = easeIn(segment(time, 3.45, 4.5))
    transform.x = lerp(790, 770, dive)
    transform.y = lerp(266, 408, dive)
    transform.rotation = lerp(408, 415, dive)
    transform.scale = lerp(1.04, 1, dive)
  } else if (time >= 4.5 && time < 5.65) {
    transform.x = keyed(time, [[4.5, 770], [4.7, 730], [5.18, 590], [5.65, 555]], easeOut)
    transform.y = keyed(time, [[4.5, 408], [4.72, 456], [5.18, 568], [5.65, 568]], easeOut)
    transform.rotation = keyed(time, [[4.5, 415], [4.72, 378], [5.05, 348], [5.65, 360]], easeOut)
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
  const legStability = smooth(segment(time, 1.2, 1.65)) * (1 - smooth(segment(time, 4.85, 5.55)))
  pose.legFront = lerp(pose.legFront, -6, legStability)
  pose.legBack = lerp(pose.legBack, 8, legStability)
  pose.legFrontLower = lerp(pose.legFrontLower, 10, legStability)
  pose.legBackLower = lerp(pose.legBackLower, 12, legStability)

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

function dragonState(time: number, ambient: number, cinematic: boolean): DragonState {
  const hit = easeOut(segment(time, 4.5, 4.72))
  const settle = smooth(segment(time, 5.05, 6.35))
  const recoil = hit * (1 - settle)
  const roar = smooth(segment(time, 4.62, 4.82)) * (1 - smooth(segment(time, 5.35, 5.9)))
  const brace = cinematic ? smooth(segment(time, 3.55, 4.32)) * (1 - hit) : 0
  const damaged = time >= 4.5
  const breath = Math.sin(ambient * 1.65)
  const vibration = Math.sin(ambient * 83) * recoil * (1 - segment(time, 4.5, 5.05))
  const transform: RigTransform = {
    x: DRAGON_X + recoil * 42 + vibration * 5,
    y: DRAGON_GROUND - Math.sin(recoil * Math.PI) * 35 + roar * 5,
    scale: 1,
    rotation: recoil * 5 + breath * 0.25,
    facing: 1,
  }
  const pose: CreaturePose = {
    body: breath * 1.1 - brace * 4 + recoil * 9 - roar * 5,
    head: Math.sin(ambient * 1.15 + 0.7) * 2.2 - brace * 11 - recoil * 19 - roar * 13,
    neck: Math.sin(ambient * 1.3) * 1.4 - brace * 5 + recoil * 11 + roar * 9,
    wingFront: Math.sin(ambient * 2.1) * 2.3 + brace * 13 - recoil * 20 - roar * 16,
    wingRear: -Math.sin(ambient * 2.1 + 0.5) * 2 - brace * 9 + recoil * 15 + roar * 12,
    tail: Math.sin(ambient * 1.8 + 1.2) * 4.5 + recoil * 17 + Math.sin(ambient * 5) * roar * 4,
    legFront: -brace * 3 + recoil * 8,
    legRear: brace * 2 - recoil * 6,
  }
  if (damaged) pose.head += Math.sin(ambient * 13) * roar * 1.5
  return { transform, pose }
}

function stateAt(hero: HeroId, time: number, ambient: number): SceneState {
  if (hero === 'kaelis') return kaelisState(time, ambient)
  if (hero === 'nyxara') return nyxaraState(time, ambient)
  return newHeroState(hero, time, ambient)
}

function idleState(hero: HeroId, ambient: number): SceneState {
  if (isNewHero(hero)) return idleNewHeroState(hero, ambient)
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
  return rigPoint(hero, state.pose, state.transform, 'head', RIG_HEAD_POINTS[hero])
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
    camera = { ...camera, focusX: lerp(480, usesRangedCamera(hero) ? 590 : 675, track), focusY: lerp(390, 330, track), zoom: 1.06, screenY: 385 }
  } else if (time < 3.45) {
    const orbit = smooth(segment(time, 2.35, 3.45))
    camera = {
      focusX: lerp(state.transform.x - 20, state.transform.x + 15, orbit),
      focusY: state.transform.y - (hero === 'kaelis' ? 60 : 100),
      zoom: hero === 'kaelis' ? lerp(0.88, 0.96, orbit) : lerp(0.96, 1.08, orbit),
      rotation: lerp(-0.1, 0.09, orbit),
      screenX: 640,
      screenY: hero === 'kaelis' ? 300 : 390,
    }
  } else if (time < 4.5) {
    const chase = easeIn(segment(time, 3.45, 4.5))
    const wideRangedImpact = hero === 'ilya' || hero === 'elowen'
    camera = {
      focusX: lerp(usesRangedCamera(hero) ? 690 : 785, 865, chase),
      focusY: lerp(usesRangedCamera(hero) ? 330 : 300, wideRangedImpact ? 350 : 420, chase),
      zoom: wideRangedImpact ? lerp(0.9, 0.98, chase) : hero === 'kaelis' ? lerp(0.86, 0.98, chase) : lerp(0.91, 1.04, chase),
      rotation: lerp(-0.1, -0.025, chase),
      screenX: 630,
      screenY: hero === 'kaelis' ? 390 : 370,
    }
  } else if (time < 5.65) {
    const settle = easeOut(segment(time, 4.5, 5.65))
    const shake = 30 * Math.exp(-(time - 4.5) * 4.7)
    const wideRangedImpact = hero === 'ilya' || hero === 'elowen'
    camera = {
      focusX: lerp(835, 760, settle) + Math.sin(ambient * 91) * shake,
      focusY: lerp(wideRangedImpact ? 350 : 425, wideRangedImpact ? 380 : 405, settle) + Math.cos(ambient * 77) * shake * 0.65,
      zoom: wideRangedImpact ? lerp(0.98, 1, settle) : lerp(hero === 'kaelis' ? 1.16 : 1.08, 1.02, settle),
      rotation: Math.sin(ambient * 67) * shake * 0.0015,
      screenX: 640,
      screenY: hero === 'kaelis' ? 410 : 400,
    }
  } else if (time < 6.75) {
    const recover = smooth(segment(time, 5.65, 6.75))
    camera = { ...camera, focusX: lerp(745, 690, recover), focusY: 400, zoom: lerp(1.06, 1.14, recover), screenY: 380 }
  } else {
    const restore = smooth(segment(time, 6.75, 8))
    camera = { ...camera, focusX: lerp(690, 640, restore), focusY: lerp(400, 360, restore), zoom: lerp(1.14, 1, restore), screenY: lerp(380, 360, restore) }
  }
  if (isNewHero(hero)) {
    const framing = cinematicShot(hero, time)
    camera.focusX = lerp(camera.focusX, framing[0], 0.2)
    camera.focusY = lerp(camera.focusY, framing[1], 0.16)
    camera.zoom *= lerp(1, framing[2], 0.1)
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
  private readonly creatures = new CreatureLibrary()
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
    const camera = { ...CAMERA_BASE, focusX: 640 + Math.sin(frame.ambient * 0.18) * 3, zoom: 0.96 }
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, 0, frame.hero)
    if (frame.impactApplied) this.drawCrater(8, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.5, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, frame.hero === 'nyxara' ? 0.16 : 0.24)
    this.drawShadow(DRAGON_X + 55, DRAGON_GROUND + 3, 175, 0.32)
    this.drawDragon(frame.impactApplied ? 8 : 0, frame.ambient, false, frame.hero)
    this.rigs.draw(context, frame.hero, state.pose, state.transform, frame.ambient, state.charge)
    context.restore()
    this.drawVignette(0.34)
  }

  private drawCinematic(frame: RenderFrame) {
    const context = this.context
    const time = frame.time
    // A short hit-stop gives the contact weight without delaying the gameplay event.
    const poseTime = time > 4.5 && time < 4.58 ? 4.5 : time
    const state = stateAt(frame.hero, poseTime, frame.ambient)
    const camera = cameraAt(frame.hero, time, frame.ambient, state)
    const voidAmount = smooth(segment(time, 0.42, 0.72)) * (1 - smooth(segment(time, 1.18, 1.55)))
    context.save()
    applyCamera(context, camera)
    this.drawArena(frame.ambient, voidAmount, frame.hero)
    if (voidAmount > 0.01) this.drawVoid(frame.ambient, voidAmount, frame.hero)
    this.drawCrater(time, frame.hero)
    this.drawMagic(time, frame.ambient, state, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.65, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, 0.25 * clamp(1 - (568 - state.transform.y) / 420, 0.1, 1))
    this.drawShadow(DRAGON_X + 55, DRAGON_GROUND + 3, 175, 0.32)
    if (frame.hero === 'kaelis') this.drawPhoenix(poseTime, frame.ambient, state)
    else if (frame.hero === 'nyxara') this.drawAstralDragon(time, frame.ambient, state)
    else this.drawNewHeroEffect(time, frame.ambient, state, frame.hero)
    this.drawDragon(poseTime, frame.ambient, true, frame.hero)
    this.drawHeroAfterimages(time, frame.ambient, frame.hero)
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
    } else if (isNewHero(frame.hero) && !usesRangedCamera(frame.hero)) {
      state.transform.x = keyed(time, [[0, 350], [0.1, 350], [0.3, 760], [0.39, 745], [0.7, 350]], easeInOut)
      state.transform.y = keyed(time, [[0, 568], [0.12, 568], [0.3, 430], [0.4, 480], [0.7, 568]], easeInOut)
      state.transform.rotation = keyed(time, [[0, 0], [0.12, 0], [0.32, frame.hero === 'brakar' ? 30 : 45], [0.42, 8], [0.7, 0]])
    } else {
      state.transform.x = frame.hero === 'ilya' ? 400 : 350
      state.transform.y = frame.hero === 'nyxara' ? 548 : 568
      state.transform.rotation = 0
    }
    context.save()
    applyCamera(context, CAMERA_BASE)
    this.drawArena(frame.ambient, 0, frame.hero)
    if (time >= hitTime) this.drawCrater(visualTime, frame.hero)
    this.drawAmbientMotes(frame.ambient, 0.5, frame.hero)
    this.drawShadow(state.transform.x, 572, 66, 0.2)
    this.drawShadow(DRAGON_X + 55, DRAGON_GROUND + 3, 175, 0.32)
    if (frame.hero === 'nyxara' && time > 0.08) this.drawInstantAstralDragon(time)
    if (isNewHero(frame.hero) && usesRangedCamera(frame.hero) && time > 0.08) this.drawInstantNewProjectile(frame.hero, time)
    this.drawDragon(visualTime, frame.ambient, true, frame.hero)
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
    const style = heroStyle(hero)
    const gradient = context.createLinearGradient(0, 0, 0, 720)
    gradient.addColorStop(0, style.dark)
    gradient.addColorStop(0.58, `rgba(${style.rgb}, 0.16)`)
    gradient.addColorStop(1, '#091324')
    context.fillStyle = gradient
    context.fillRect(-500, -400, 2280, 1520)
    if (this.arena.complete && this.arena.naturalWidth > 0) {
      context.globalAlpha = 1 - voidAmount * 0.9
      context.drawImage(this.arena, 0, 0, 1280, 720)
      context.globalAlpha = 1
    }
    const tint = context.createLinearGradient(0, 0, 1280, 300)
    tint.addColorStop(0, `rgba(${style.rgb}, 0.05)`)
    tint.addColorStop(0.55, 'rgba(72, 122, 255, 0.025)')
    tint.addColorStop(1, `rgba(105, 235, 255, ${0.025 + Math.sin(ambient * 0.4) * 0.01})`)
    context.fillStyle = tint
    context.fillRect(0, 0, 1280, 720)
  }

  private drawVoid(ambient: number, amount: number, hero: HeroId) {
    const context = this.context
    context.save()
    context.globalAlpha = amount
    const style = heroStyle(hero)
    const gradient = context.createRadialGradient(350, 350, 20, 500, 350, 800)
    gradient.addColorStop(0, `rgba(${style.rgb}, 0.3)`)
    gradient.addColorStop(0.45, 'rgba(5, 15, 39, 0.88)')
    gradient.addColorStop(1, 'rgba(2, 5, 20, 0.98)')
    context.fillStyle = gradient
    context.fillRect(-600, -500, 2480, 1720)
    this.stars.forEach(star => {
      context.fillStyle = `rgba(${style.secondary}, ${0.3 + Math.sin(ambient * 2 + star.phase) * 0.25})`
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
      context.fillStyle = `rgba(${heroStyle(hero).rgb}, ${alpha})`
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
    const torsoPoint: [number, number] = isNewHero(hero) ? [424, 430] : hero === 'kaelis' ? [450, 400] : [435, 400]
    const point = charge > aerial
      ? rigPoint(hero, state.pose, state.transform, 'torso', torsoPoint)
      : [state.transform.x, state.transform.y - 100]
    const style = heroStyle(hero)
    context.save()
    context.translate(point[0], point[1])
    context.globalCompositeOperation = 'lighter'
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = (82 + ring * 48 + Math.sin(ambient * 2 + ring) * 7) * (0.75 + strength * 0.25)
      context.save()
      context.rotate(ambient * (ring % 2 ? -0.24 : 0.18) + ring)
      context.scale(1, 0.38 + ring * 0.12)
      context.strokeStyle = `rgba(${ring === 1 ? style.secondary : style.rgb}, ${0.18 + strength * 0.32})`
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
    const attachment = isNewHero(hero) ? NEW_ATTACHMENTS[hero] : null
    const bone = attachment?.bone ?? (hero === 'kaelis' ? 'weapon' : 'staff')
    const source: [number, number] = attachment?.point ?? (hero === 'kaelis' ? [570, 1145] : [755, 220])
    const style = heroStyle(hero)
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
      context.strokeStyle = `rgba(${style.rgb}, ${fade * index / points.length * 0.36})`
      context.lineWidth = 2 + index * 0.8
      context.beginPath()
      context.moveTo(points[index - 1][0], points[index - 1][1])
      context.lineTo(points[index][0], points[index][1])
      context.stroke()
    }
    context.restore()
  }

  private drawNewHeroEffect(time: number, ambient: number, state: SceneState, hero: NewHeroId) {
    const context = this.context
    const style = heroStyle(hero)
    const attachment = NEW_ATTACHMENTS[hero]
    const anchor = rigPoint(hero, state.pose, state.transform, attachment.bone, attachment.point)
    const power = smooth(segment(time, 0.45, 1.2)) * (1 - smooth(segment(time, 5.0, 5.9)))
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    if (hero === 'talys') {
      for (let bolt = 0; bolt < 8; bolt += 1) {
        const angle = bolt / 8 * TAU + ambient * (bolt % 2 ? 0.7 : -0.5)
        const length = 45 + bolt % 4 * 18
        context.strokeStyle = `rgba(${bolt % 2 ? style.secondary : style.rgb}, ${power * 0.65})`
        context.lineWidth = 1.5 + bolt % 3
        context.beginPath()
        context.moveTo(anchor[0], anchor[1])
        for (let step = 1; step <= 4; step += 1) {
          const distance = length * step / 4
          const jitter = Math.sin(ambient * 24 + bolt * 7 + step * 3) * 12
          context.lineTo(anchor[0] + Math.cos(angle) * distance + jitter, anchor[1] + Math.sin(angle) * distance - step * 5)
        }
        context.stroke()
      }
      const skyBolt = smooth(segment(time, 2.2, 2.55)) * (1 - smooth(segment(time, 4.5, 4.85)))
      if (skyBolt > 0) {
        context.strokeStyle = `rgba(${style.secondary}, ${skyBolt * 0.58})`
        context.lineWidth = 5
        context.beginPath()
        context.moveTo(state.transform.x + 30, 70)
        for (let step = 1; step <= 8; step += 1) {
          const y = lerp(70, anchor[1], step / 8)
          context.lineTo(lerp(state.transform.x + 30, anchor[0], step / 8) + Math.sin(step * 7 + ambient * 20) * 18, y)
        }
        context.stroke()
      }
    } else if (hero === 'ilya') {
      if (time < 3.45) {
        const alpha = smooth(segment(time, 1.1, 2.1)) * power
        this.drawCrystalArrow(anchor[0] + 28, anchor[1], 0, alpha, 'ilya', 0.85)
      } else if (time < 4.5) {
        const launchState = stateAt(hero, 3.45, ambient)
        const start = rigPoint(hero, launchState.pose, launchState.transform, attachment.bone, attachment.point)
        const amount = easeInOut(segment(time, 3.45, 4.5))
        const x = lerp(start[0] + 28, IMPACT_POINT.x, amount)
        const y = lerp(start[1], IMPACT_POINT.y, amount) - Math.sin(amount * Math.PI) * 75
        context.strokeStyle = `rgba(${style.secondary}, ${0.5 * (1 - amount * 0.35)})`
        context.lineWidth = 7
        context.beginPath()
        context.moveTo(lerp(start[0] + 28, x, 0.62), lerp(start[1], y, 0.62) - 12)
        context.lineTo(x, y)
        context.stroke()
        this.drawCrystalArrow(x, y, Math.atan2(IMPACT_POINT.y - y, IMPACT_POINT.x - x), 1, 'ilya', 1)
      }
    } else if (hero === 'nox') {
      const eclipse = smooth(segment(time, 1.65, 2.35)) * (1 - smooth(segment(time, 4.55, 5.15)))
      context.save()
      context.translate(state.transform.x, state.transform.y - 105)
      context.rotate(ambient * 0.55)
      for (let ring = 0; ring < 3; ring += 1) {
        context.strokeStyle = `rgba(${ring % 2 ? style.secondary : style.rgb}, ${eclipse * (0.42 - ring * 0.08)})`
        context.lineWidth = 5 - ring
        context.beginPath()
        context.arc(0, 0, 78 + ring * 30, ring * 0.8, Math.PI * 1.45 + ring * 0.8)
        context.stroke()
      }
      context.restore()
    } else if (hero === 'elowen') {
      for (let leaf = 0; leaf < 22; leaf += 1) {
        const angle = ambient * (0.7 + leaf % 3 * 0.12) + leaf * 2.1
        const radius = 65 + leaf % 6 * 21
        const x = state.transform.x + Math.cos(angle) * radius
        const y = state.transform.y - 110 + Math.sin(angle) * radius * 0.6 - leaf * 2
        context.save()
        context.translate(x, y)
        context.rotate(angle + 0.8)
        context.fillStyle = `rgba(${leaf % 3 ? style.rgb : style.secondary}, ${power * 0.65})`
        context.beginPath()
        context.ellipse(0, 0, 3 + leaf % 3, 7 + leaf % 4, 0, 0, TAU)
        context.fill()
        context.restore()
      }
      if (time >= 3.45 && time < 4.5) {
        const amount = easeInOut(segment(time, 3.45, 4.5))
        for (let root = 0; root < 4; root += 1) {
          const startX = state.transform.x + root * 12
          const endX = lerp(startX, IMPACT_POINT.x + root * 14 - 20, amount)
          const endY = 558 - Math.sin(amount * Math.PI) * (35 + root * 9)
          context.strokeStyle = `rgba(${root % 2 ? style.secondary : style.rgb}, ${0.48 + root * 0.08})`
          context.lineWidth = 8 - root
          context.beginPath()
          context.moveTo(startX, 560)
          context.quadraticCurveTo(lerp(startX, endX, 0.55), 500 - root * 14, endX, endY)
          context.stroke()
        }
      }
    } else if (hero === 'brakar') {
      for (let rock = 0; rock < 14; rock += 1) {
        const angle = rock / 14 * TAU + ambient * 0.35
        const radius = 42 + rock % 5 * 18
        const x = anchor[0] + Math.cos(angle) * radius
        const y = anchor[1] + Math.sin(angle) * radius * 0.65
        context.save()
        context.translate(x, y)
        context.rotate(angle + ambient)
        context.fillStyle = `rgba(${rock % 3 ? style.rgb : style.secondary}, ${power * 0.5})`
        polygon(context, [{ x: -4, y: -6 }, { x: 5, y: -4 }, { x: 7, y: 4 }, { x: -3, y: 7 }], context.fillStyle, 'transparent', 0)
        context.restore()
      }
      const rune = smooth(segment(time, 2.1, 2.6)) * (1 - smooth(segment(time, 4.45, 4.85)))
      context.save()
      context.translate(state.transform.x, 560)
      context.scale(1, 0.25)
      context.strokeStyle = `rgba(${style.rgb}, ${rune * 0.55})`
      context.lineWidth = 5
      context.beginPath()
      context.arc(0, 0, 105, 0, TAU)
      context.stroke()
      context.restore()
    }
    context.restore()
  }

  private drawCrystalArrow(x: number, y: number, angle: number, alpha: number, hero: NewHeroId, scale: number) {
    if (alpha <= 0) return
    const context = this.context
    const style = heroStyle(hero)
    context.save()
    context.translate(x, y)
    context.rotate(angle)
    context.scale(scale, scale)
    context.globalAlpha *= alpha
    context.strokeStyle = `rgba(${style.secondary}, 0.9)`
    context.lineWidth = 4
    context.beginPath()
    context.moveTo(-62, 0)
    context.lineTo(12, 0)
    context.stroke()
    polygon(context, [{ x: 28, y: 0 }, { x: 7, y: -9 }, { x: 12, y: 0 }, { x: 7, y: 9 }], `rgba(${style.rgb}, 0.9)`, `rgba(${style.secondary}, 0.95)`, 2)
    context.strokeStyle = `rgba(${style.rgb}, 0.75)`
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(-54, 0)
    context.lineTo(-65, -10)
    context.moveTo(-54, 0)
    context.lineTo(-65, 10)
    context.stroke()
    context.restore()
  }

  private drawInstantNewProjectile(hero: NewHeroId, time: number) {
    const amount = easeInOut(segment(time, 0.08, 0.34))
    const start: Point = hero === 'ilya' ? { x: 500, y: 390 } : { x: 520, y: 330 }
    const x = lerp(start.x, IMPACT_POINT.x, amount)
    const y = lerp(start.y, IMPACT_POINT.y, amount) - Math.sin(amount * Math.PI) * 45
    if (hero === 'ilya') {
      this.drawCrystalArrow(x, y, Math.atan2(IMPACT_POINT.y - y, IMPACT_POINT.x - x), 1 - segment(time, 0.34, 0.45), hero, 1)
    } else {
      const context = this.context
      const style = heroStyle(hero)
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.strokeStyle = `rgba(${style.rgb}, 0.6)`
      context.lineWidth = 8
      context.beginPath()
      context.moveTo(lerp(start.x, x, 0.55), lerp(start.y, y, 0.55))
      context.lineTo(x, y)
      context.stroke()
      context.fillStyle = `rgba(${style.secondary}, ${1 - segment(time, 0.34, 0.45)})`
      context.beginPath()
      context.arc(x, y, 10, 0, TAU)
      context.fill()
      context.restore()
    }
  }

  private drawElementImpact(elapsed: number, hero: HeroId) {
    if (!isNewHero(hero) || elapsed < 0 || elapsed > 1.55) return
    const context = this.context
    const style = heroStyle(hero)
    const enter = easeOut(segment(elapsed, 0, 0.22))
    const fade = 1 - smooth(segment(elapsed, 0.7, 1.55))
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    if (hero === 'talys') {
      for (let bolt = 0; bolt < 9; bolt += 1) {
        const angle = bolt / 9 * TAU
        context.strokeStyle = `rgba(${bolt % 2 ? style.secondary : style.rgb}, ${fade * 0.75})`
        context.lineWidth = 2 + bolt % 3
        context.beginPath()
        context.moveTo(IMPACT_POINT.x, IMPACT_POINT.y)
        for (let step = 1; step <= 4; step += 1) {
          const radius = enter * (35 + bolt % 4 * 28) * step / 4
          context.lineTo(IMPACT_POINT.x + Math.cos(angle) * radius + Math.sin(step * 8 + bolt) * 12, IMPACT_POINT.y + Math.sin(angle) * radius)
        }
        context.stroke()
      }
    } else if (hero === 'ilya') {
      for (let shard = 0; shard < 10; shard += 1) {
        const angle = shard / 10 * TAU
        const radius = 28 + shard % 4 * 24
        const x = IMPACT_POINT.x + Math.cos(angle) * radius * enter
        const y = IMPACT_POINT.y + Math.sin(angle) * radius * enter
        context.save()
        context.translate(x, y)
        context.rotate(angle + Math.PI / 2)
        context.scale(enter, enter)
        polygon(context, [{ x: 0, y: -28 }, { x: 8, y: 4 }, { x: 0, y: 14 }, { x: -8, y: 4 }], `rgba(${style.rgb}, ${fade * 0.3})`, `rgba(${style.secondary}, ${fade * 0.8})`, 2)
        context.restore()
      }
    } else if (hero === 'nox') {
      context.save()
      context.translate(IMPACT_POINT.x, IMPACT_POINT.y)
      context.rotate(0.65)
      context.strokeStyle = `rgba(${style.secondary}, ${fade * 0.85})`
      context.lineWidth = 12 * (1 - enter) + 3
      context.beginPath()
      context.moveTo(-130 * enter, 0)
      context.lineTo(130 * enter, 0)
      context.stroke()
      context.restore()
    } else if (hero === 'elowen') {
      for (let root = 0; root < 5; root += 1) {
        const offset = root * 18 - 36
        context.strokeStyle = `rgba(${root % 2 ? style.secondary : style.rgb}, ${fade * 0.58})`
        context.lineWidth = 7 - root * 0.6
        context.beginPath()
        context.moveTo(IMPACT_POINT.x + offset, 570)
        context.bezierCurveTo(IMPACT_POINT.x - 90 + offset, 520, IMPACT_POINT.x + 100 - offset, 470, IMPACT_POINT.x + offset * 0.4, 405 - enter * 25)
        context.stroke()
      }
    } else if (hero === 'brakar') {
      for (let rock = 0; rock < 8; rock += 1) {
        const x = 760 + rock * 31
        const height = (45 + rock % 4 * 24) * enter
        polygon(context, [{ x: x - 14, y: 570 }, { x: x - 8, y: 570 - height * 0.72 }, { x, y: 570 - height }, { x: x + 12, y: 570 }], `rgba(${style.rgb}, ${fade * 0.34})`, `rgba(${style.secondary}, ${fade * 0.5})`, 1.5)
      }
    }
    context.restore()
  }

  private drawHeroAfterimages(time: number, ambient: number, hero: HeroId) {
    const hasAfterimages = hero === 'kaelis' || hero === 'nox' || hero === 'talys'
    if (!hasAfterimages || time < 3.58 || time > 4.5) return
    const intensity = smooth(segment(time, 3.58, 3.82)) * (1 - smooth(segment(time, 4.38, 4.5))) * (hero === 'nox' ? 1.7 : 1)
    for (let index = 2; index >= 1; index -= 1) {
      const sampleTime = Math.max(3.45, time - index * 0.045)
      const sample = stateAt(hero, sampleTime, ambient - index * 0.045)
      this.rigs.draw(this.context, hero, sample.pose, sample.transform, ambient, sample.charge, intensity * (0.055 + index * 0.025))
    }
  }

  private drawCrater(time: number, hero: HeroId) {
    if (time < 4.5) return
    const context = this.context
    const enter = easeOut(segment(time, 4.5, 4.88))
    const glow = 1 - smooth(segment(time, 5.0, 7.8))
    const rgb = heroStyle(hero).rgb
    context.save()
    context.translate(870, 566)
    context.scale(1, 0.28)
    const crater = context.createRadialGradient(0, 0, 8, 0, 0, 128)
    crater.addColorStop(0, `rgba(3, 7, 17, ${0.76 * enter})`)
    crater.addColorStop(0.48, `rgba(18, 23, 35, ${0.64 * enter})`)
    crater.addColorStop(0.78, `rgba(${rgb}, ${0.15 * glow * enter})`)
    crater.addColorStop(1, 'rgba(5, 10, 20, 0)')
    context.fillStyle = crater
    context.beginPath()
    context.ellipse(0, 0, 128 * enter, 94 * enter, 0, 0, TAU)
    context.fill()
    context.restore()
    context.save()
    context.lineCap = 'round'
    for (let ray = 0; ray < 11; ray += 1) {
      const angle = ray / 11 * TAU + 0.17
      const length = (62 + ray % 4 * 23) * enter
      const startX = 870 + Math.cos(angle) * 26
      const startY = 566 + Math.sin(angle) * 10
      const middleX = 870 + Math.cos(angle + 0.08) * length * 0.58
      const middleY = 566 + Math.sin(angle + 0.08) * length * 0.22
      const endX = 870 + Math.cos(angle) * length
      const endY = 566 + Math.sin(angle) * length * 0.28
      context.strokeStyle = `rgba(5, 10, 20, ${0.68 * enter})`
      context.lineWidth = 4 - ray % 3 * 0.7
      context.beginPath()
      context.moveTo(startX, startY)
      context.lineTo(middleX, middleY)
      context.lineTo(endX, endY)
      context.stroke()
      context.strokeStyle = `rgba(${rgb}, ${0.26 * glow * enter})`
      context.lineWidth = 1.2
      context.stroke()
    }
    context.restore()
  }

  private drawPhoenix(time: number, ambient: number, state: SceneState) {
    const spread = smooth(segment(time, 2.0, 2.48))
    const power = spread * (1 - smooth(segment(time, 5.05, 5.65)))
    if (power <= 0.005) return
    const context = this.context
    const anchor = rigPoint('kaelis', state.pose, state.transform, 'torso', [520, 330])
    const bodyAngle = state.transform.rotation + (state.pose.torso || 0) * 0.7
    const dive = smooth(segment(time, 3.4, 4.15))
    const flap = Math.sin(ambient * 7.5) * 6 + Math.sin(ambient * 3.1) * 3
    const flipTuck = smooth(segment(time, 2.35, 2.6)) * (1 - smooth(segment(time, 3.15, 3.45)))
    const scale = 0.21 * state.transform.scale * (0.48 + spread * 0.52) * (1 - flipTuck * 0.16)
    context.save()
    context.shadowColor = 'rgba(255, 126, 36, 0.5)'
    context.shadowBlur = 10 * power
    for (const side of [-1, 1] as const) {
      const rotation = bodyAngle + side * ((1 - spread) * 58 - 10 - flap * spread + dive * 18)
      this.creatures.drawWing(context, anchor[0], anchor[1], rotation, scale, side, power * 0.96)
    }
    context.restore()
    context.save()
    context.globalCompositeOperation = 'lighter'
    const rootGlow = context.createRadialGradient(anchor[0], anchor[1], 0, anchor[0], anchor[1], 62)
    rootGlow.addColorStop(0, `rgba(255, 225, 143, ${0.34 * power})`)
    rootGlow.addColorStop(1, 'rgba(255, 112, 24, 0)')
    context.fillStyle = rootGlow
    context.beginPath()
    context.arc(anchor[0], anchor[1], 62, 0, TAU)
    context.fill()
    for (let ember = 0; ember < 20; ember += 1) {
      const age = (ambient * (0.32 + ember % 4 * 0.035) + ember * 0.137) % 1
      const side = ember % 2 ? -1 : 1
      const x = anchor[0] + side * (45 + ember * 9) * spread + Math.sin(ambient * 3 + ember) * 12
      const y = anchor[1] - 35 - age * 150 + Math.cos(ember * 2.2) * 32
      context.fillStyle = `rgba(255, ${150 + ember % 5 * 18}, 65, ${power * (1 - age) * 0.72})`
      context.beginPath()
      context.arc(x, y, 1.2 + ember % 3 * 0.7, 0, TAU)
      context.fill()
    }
    context.restore()
  }

  private drawAstralDragon(time: number, ambient: number, state: SceneState) {
    const appear = smooth(segment(time, 1.7, 2.15)) * (1 - smooth(segment(time, 4.72, 5.25)))
    if (appear <= 0.005) return
    const dive = easeInOut(segment(time, 3.45, 4.5))
    const orbit = smooth(segment(time, 1.7, 3.45))
    const post = segment(time, 4.5, 4.9)
    let x: number
    let y: number
    let rotation: number
    let scale = 1
    if (time < 3.45) {
      x = lerp(430, 610, orbit) + Math.sin(ambient * 1.8) * 18
      y = lerp(290, 230, orbit) - Math.sin(orbit * Math.PI) * 50
      rotation = lerp(-18, -12, orbit) + Math.sin(ambient * 2) * 5
      scale = lerp(0.72, 1, smooth(segment(time, 1.7, 2.4)))
    } else {
      x = lerp(610, 670, dive) + Math.sin(dive * Math.PI) * 40 + post * 30
      y = lerp(230, 450, dive) - Math.sin(dive * Math.PI) * 85 + post * 15
      rotation = lerp(-12, 20, dive) - Math.sin(dive * Math.PI) * 14 + post * 8
    }
    const transform: RigTransform = { x, y, scale, rotation, facing: 1 }
    const pose: CreaturePose = {
      body: Math.sin(ambient * 2.4) * 2.5,
      tail: Math.sin(ambient * 3.2 + 0.8) * 10 + dive * 9,
      neck: Math.sin(ambient * 2.1) * 2 - dive * 8,
      head: Math.sin(ambient * 2.8 + 1.2) * 2.5 + dive * 8,
      claws: -dive * 12 + Math.sin(ambient * 3.6) * 3,
    }
    // The staff remains the visual origin of the summon during its first orbit.
    if (time < 2.35) {
      const staff = rigPoint('nyxara', state.pose, state.transform, 'staff', [755, 220])
      const link = 1 - smooth(segment(time, 2.0, 2.35))
      transform.x = lerp(transform.x, staff[0] - 80, link * 0.35)
      transform.y = lerp(transform.y, staff[1] - 20, link * 0.35)
    }
    this.context.save()
    this.context.shadowColor = 'rgba(100, 225, 255, 0.48)'
    this.context.shadowBlur = 13 * appear
    this.creatures.draw(this.context, 'astral', pose, transform, appear * 0.96)
    this.context.restore()
  }

  private drawInstantAstralDragon(time: number) {
    const amount = easeInOut(segment(time, 0.08, 0.34))
    const alpha = 1 - smooth(segment(time, 0.35, 0.55))
    const transform: RigTransform = {
      x: lerp(520, 670, amount),
      y: lerp(260, 450, amount),
      scale: 0.78,
      rotation: lerp(-12, 20, amount),
      facing: 1,
    }
    const pose: CreaturePose = {
      body: 0,
      tail: -10 + amount * 18,
      neck: -amount * 8,
      head: amount * 8,
      claws: -amount * 12,
    }
    this.creatures.draw(this.context, 'astral', pose, transform, alpha * 0.9)
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

  private drawDragon(time: number, ambient: number, cinematic: boolean, hero: HeroId) {
    const state = dragonState(time, ambient, cinematic)
    const context = this.context
    this.creatures.draw(context, 'dragon', state.pose, state.transform)
    const roar = smooth(segment(time, 4.62, 4.82)) * (1 - smooth(segment(time, 5.35, 5.9)))
    const eye = creaturePoint('dragon', state.pose, state.transform, 'head', [200, 280])
    context.save()
    context.globalCompositeOperation = 'lighter'
    const eyeGlow = context.createRadialGradient(eye[0], eye[1], 0, eye[0], eye[1], 18 + roar * 12)
    eyeGlow.addColorStop(0, `rgba(160, 250, 255, ${0.5 + roar * 0.3})`)
    eyeGlow.addColorStop(0.25, `rgba(61, 216, 255, ${0.25 + roar * 0.25})`)
    eyeGlow.addColorStop(1, 'rgba(32, 145, 255, 0)')
    context.fillStyle = eyeGlow
    context.beginPath()
    context.arc(eye[0], eye[1], 18 + roar * 12, 0, TAU)
    context.fill()
    if (roar > 0.02) {
      const mouth = creaturePoint('dragon', state.pose, state.transform, 'head', [158, 315])
      const breath = context.createRadialGradient(mouth[0], mouth[1], 0, mouth[0], mouth[1], 54)
      breath.addColorStop(0, `rgba(170, 248, 255, ${roar * 0.34})`)
      breath.addColorStop(0.35, `rgba(71, 183, 255, ${roar * 0.16})`)
      breath.addColorStop(1, 'rgba(50, 110, 255, 0)')
      context.fillStyle = breath
      context.beginPath()
      context.arc(mouth[0], mouth[1], 54, 0, TAU)
      context.fill()
    }
    if (time >= 4.5) {
      const scar = easeOut(segment(time, 4.5, 4.82))
      const wound = creaturePoint('dragon', state.pose, state.transform, 'neck', [320, 380])
      const rgb = heroStyle(hero).rgb
      const glow = context.createRadialGradient(wound[0], wound[1], 0, wound[0], wound[1], 52)
      glow.addColorStop(0, `rgba(${rgb}, ${0.4 * scar})`)
      glow.addColorStop(1, `rgba(${rgb}, 0)`)
      context.fillStyle = glow
      context.beginPath()
      context.arc(wound[0], wound[1], 52, 0, TAU)
      context.fill()
      context.strokeStyle = `rgba(${rgb}, ${0.82 * scar})`
      context.lineWidth = 2.4
      context.lineCap = 'round'
      for (let cut = -1; cut <= 1; cut += 1) {
        context.beginPath()
        context.moveTo(wound[0] - 24 + cut * 9, wound[1] - 30)
        context.lineTo(wound[0] + 18 + cut * 9, wound[1] + 28)
        context.stroke()
      }
    }
    context.restore()
  }

  private drawImpactWorld(time: number, ambient: number, hero: HeroId) {
    if (time < 4.5 || time > 6.35) return
    const context = this.context
    const elapsed = time - 4.5
    const origin = IMPACT_POINT
    const ring = easeOut(segment(elapsed, 0, 0.82))
    const burst = easeOut(segment(elapsed, 0, 0.2))
    const fade = 1 - smooth(segment(elapsed, 0.75, 1.75))
    const rgb = heroStyle(hero).rgb
    const secondary = heroStyle(hero).secondary
    context.save()
    context.globalCompositeOperation = 'lighter'

    const pillar = smooth(segment(elapsed, 0.025, 0.14)) * (1 - smooth(segment(elapsed, 0.42, 1.15)))
    if (pillar > 0) {
      const width = 34 + burst * 68
      const beam = context.createLinearGradient(origin.x - width, 0, origin.x + width, 0)
      beam.addColorStop(0, `rgba(${rgb}, 0)`)
      beam.addColorStop(0.36, `rgba(${rgb}, ${pillar * 0.1})`)
      beam.addColorStop(0.5, `rgba(${secondary}, ${pillar * 0.34})`)
      beam.addColorStop(0.64, `rgba(${rgb}, ${pillar * 0.1})`)
      beam.addColorStop(1, `rgba(${rgb}, 0)`)
      context.fillStyle = beam
      context.fillRect(origin.x - width, 130, width * 2, 450)
    }

    context.save()
    context.translate(origin.x, origin.y)
    context.rotate(hero === 'kaelis' ? -0.48 : 0.28)
    context.lineCap = 'round'
    const slashAlpha = (1 - smooth(segment(elapsed, 0.08, 0.48))) * burst
    context.strokeStyle = `rgba(${rgb}, ${slashAlpha * 0.72})`
    context.lineWidth = 5 + (1 - burst) * 25
    context.beginPath()
    context.arc(0, 0, 45 + burst * 142, -2.42, 0.68)
    context.stroke()
    context.strokeStyle = `rgba(255, 255, 255, ${slashAlpha * 0.86})`
    context.lineWidth = 2 + (1 - burst) * 6
    context.beginPath()
    context.arc(0, 0, 45 + burst * 142, -2.38, 0.58)
    context.stroke()
    context.restore()

    context.strokeStyle = `rgba(${secondary}, ${0.72 * (1 - ring)})`
    context.lineWidth = 9 * (1 - ring) + 1
    context.beginPath()
    context.arc(origin.x, origin.y, 22 + ring * 350, 0, TAU)
    context.stroke()
    context.save()
    context.translate(870, 560)
    context.scale(1, 0.25)
    context.strokeStyle = `rgba(${rgb}, ${0.74 * (1 - ring)})`
    context.lineWidth = 12 * (1 - ring) + 1
    context.beginPath()
    context.arc(0, 0, 35 + ring * 470, 0, TAU)
    context.stroke()
    context.restore()

    for (let ray = 0; ray < 18; ray += 1) {
      const angle = ray / 18 * TAU + 0.13
      const inner = 30 + ring * 105
      const outer = inner + (1 - ring) * (85 + ray % 4 * 34)
      context.strokeStyle = `rgba(${ray % 3 ? secondary : rgb}, ${0.72 * (1 - ring)})`
      context.lineWidth = 2 + ray % 3
      context.beginPath()
      context.moveTo(origin.x + Math.cos(angle) * inner, origin.y + Math.sin(angle) * inner)
      context.lineTo(origin.x + Math.cos(angle) * outer, origin.y + Math.sin(angle) * outer)
      context.stroke()
    }
    for (let spark = 0; spark < 28; spark += 1) {
      const angle = spark * 2.399 + 0.4
      const speed = 80 + spark % 7 * 35
      const travel = easeOut(segment(elapsed, 0, 1.05))
      const x = origin.x + Math.cos(angle) * speed * travel
      const y = origin.y + Math.sin(angle) * speed * travel + 90 * elapsed * elapsed
      const alpha = fade * (0.35 + spark % 4 * 0.13)
      context.fillStyle = `rgba(${spark % 3 ? secondary : rgb}, ${alpha})`
      context.beginPath()
      context.arc(x, y, 1.4 + spark % 3, 0, TAU)
      context.fill()
    }
    context.restore()

    for (let cloud = 0; cloud < 7; cloud += 1) {
      const localTime = Math.max(0, elapsed - cloud * 0.025)
      if (localTime <= 0 || localTime > 1.35) continue
      const direction = cloud % 2 ? -1 : 1
      const x = 870 + direction * (25 + cloud * 17) * easeOut(segment(localTime, 0, 1.1))
      const y = 558 - localTime * (25 + cloud * 5)
      const radius = 28 + localTime * 58
      const dust = context.createRadialGradient(x, y, 0, x, y, radius)
      dust.addColorStop(0, `rgba(110, 125, 143, ${0.16 * (1 - localTime / 1.35)})`)
      dust.addColorStop(1, 'rgba(65, 79, 99, 0)')
      context.fillStyle = dust
      context.beginPath()
      context.arc(x, y, radius, 0, TAU)
      context.fill()
    }

    this.debris.forEach((piece, index) => {
      const localTime = Math.max(0, elapsed - index % 4 * 0.012)
      if (localTime <= 0 || localTime > 1.45) return
      const x = origin.x + Math.cos(piece.angle) * piece.speed * localTime
      const y = origin.y + Math.sin(piece.angle) * piece.speed * localTime + 310 * localTime * localTime - piece.lift * localTime
      context.save()
      context.translate(x, y)
      context.rotate(piece.spin * localTime + ambient * 0.2)
      context.globalAlpha = 1 - segment(localTime, 0.9, 1.45)
      polygon(context, [{ x: -piece.size, y: -piece.size * 0.4 }, { x: piece.size * 0.7, y: -piece.size * 0.7 }, { x: piece.size, y: piece.size * 0.5 }, { x: -piece.size * 0.5, y: piece.size }], index % 4 === 0 ? '#8defff' : '#35485e', '#9db4c1', 1)
      context.restore()
    })
    this.drawElementImpact(elapsed, hero)
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
      context.strokeStyle = `rgba(${heroStyle(hero).secondary}, ${intensity * (0.07 + index % 4 * 0.025)})`
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
    const flash = Math.max(0, 1 - elapsed / 0.09) * 0.48
    if (flash > 0) {
      const gradient = context.createRadialGradient(IMPACT_POINT.x, IMPACT_POINT.y, 8, IMPACT_POINT.x, IMPACT_POINT.y, 540)
      gradient.addColorStop(0, `rgba(255, 255, 255, ${flash})`)
      gradient.addColorStop(0.24, `rgba(${heroStyle(hero).rgb}, ${flash * 0.42})`)
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
    const style = heroStyle(hero)
    context.save()
    context.globalAlpha = enter * leave * opacity
    context.translate(930, y)
    context.rotate(-0.055)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 26px Manrope, sans-serif'
    context.fillStyle = style.color
    context.shadowColor = '#071225'
    context.shadowBlur = 8
    const impactLabel = hero === 'kaelis' ? 'CRITIQUE · AUBE' : hero === 'nyxara' ? 'MARQUE ASTRALE' : presentation.status.split(' · ')[0].toUpperCase()
    context.fillText(impactLabel, 0, -42)
    context.font = 'italic 900 68px Manrope, sans-serif'
    const value = presentation.damage.toLocaleString('fr-FR')
    context.lineWidth = 9
    context.strokeStyle = '#10213c'
    context.strokeText(value, 0, 6)
    const gradient = context.createLinearGradient(0, -30, 0, 35)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.45, style.color)
    gradient.addColorStop(1, `rgba(${style.rgb}, 1)`)
    context.fillStyle = gradient
    context.fillText(value, 0, 6)
    context.restore()
  }

  private drawCinematicText(time: number, hero: HeroId) {
    const context = this.context
    const presentation = HERO_PRESENTATION[hero]
    const style = heroStyle(hero)
    const titleAlpha = smooth(segment(time, 0.68, 0.86)) * (1 - smooth(segment(time, 1.18, 1.34)))
    if (titleAlpha > 0) {
      const [firstLine, secondLine] = ULTIMATE_LINES[hero]
      context.save()
      context.globalAlpha = titleAlpha
      context.textAlign = 'left'
      context.fillStyle = style.color
      context.font = '600 15px Cinzel, serif'
      context.fillText(`${presentation.name.toUpperCase()} · ${presentation.element.split(' · ')[0].toUpperCase()}`, 76, 477)
      context.fillStyle = '#f4f8ff'
      context.shadowColor = '#071225'
      context.shadowBlur = 12
      context.font = `600 ${firstLine.length > 12 ? 34 : 40}px Cinzel, serif`
      context.fillText(firstLine, 72, 530)
      context.fillStyle = style.color
      context.font = `600 ${secondLine.length > 12 ? 30 : 38}px Cinzel, serif`
      context.fillText(secondLine, 72, 578)
      context.fillRect(75, 596, 160 * titleAlpha, 2)
      context.restore()
    }
    const lines = CINEMATIC_LINES[hero]
    let subtitle = ''
    if (time >= 0.62 && time < 1.3) subtitle = lines.intro
    else if (time >= 2.48 && time < 3.35) subtitle = lines.middle
    else if (time >= 3.8 && time < 4.62) subtitle = presentation.subtitle
    else if (time >= 5.85 && time < 6.65) subtitle = lines.end
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

const BASE_SHOTS: Record<'kaelis' | 'nyxara', Array<{ at: number; name: string; detail: string }>> = {
  kaelis: [
    { at: 0, name: 'Le dragon du Zénith', detail: 'Plan d’ensemble · le dragon respire et Kaelis prend appui' },
    { at: 0.55, name: 'Le serment de l’aube', detail: 'Gros plan · le regard, la lame et les braises' },
    { at: 1.35, name: 'La charge solaire', detail: 'Traveling · appuis stables, cape et envol' },
    { at: 2.35, name: 'Les ailes du phénix', detail: 'Caméra orbitale · déploiement et rotation complète' },
    { at: 3.45, name: 'La chute incandescente', detail: 'Caméra poursuite · dragon en garde et entaille' },
    { at: 4.5, name: 'Le ciel se fend', detail: 'Impact unique · cratère et rugissement du dragon' },
    { at: 5.65, name: 'Après l’incandescence', detail: 'Réception · ailes repliées et retour au combat' },
  ],
  nyxara: [
    { at: 0, name: 'L’oracle et le dragon', detail: 'Plan d’ensemble · la première constellation' },
    { at: 0.55, name: 'La carte céleste', detail: 'Gros plan · regard et bâton astral' },
    { at: 1.35, name: 'L’ascension de Nyxara', detail: 'Lévitation · cheveux, robe et incantation' },
    { at: 2.35, name: 'Le dragon astral', detail: 'Caméra orbitale · la créature cosmique se déploie' },
    { at: 3.45, name: 'Requiem des Constellations', detail: 'Caméra poursuite · plongée du dragon astral' },
    { at: 4.5, name: 'Collision astrale', detail: 'Impact unique · marque, cratère et rugissement' },
    { at: 5.65, name: 'Silence cosmique', detail: 'Descente · récupération et retour au combat' },
  ],
}

export function shotAt(time: number, hero: HeroId = 'kaelis') {
  const times = [0, 0.55, 1.35, 2.35, 3.45, 4.5, 5.65]
  const shots = isNewHero(hero)
    ? NEW_STORYBOARDS[hero].map((entry, index) => ({ at: times[index], name: entry[2], detail: entry[3] }))
    : BASE_SHOTS[hero]
  if (time >= 6.75) return { index: 7, name: 'Retour au combat', detail: 'La caméra et les contrôles sont restitués' }
  let index = 0
  for (let shot = 1; shot < shots.length; shot += 1) if (time >= shots[shot].at) index = shot
  return { index: index + 1, name: shots[index].name, detail: shots[index].detail }
}
