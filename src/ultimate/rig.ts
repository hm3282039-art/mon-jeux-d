import rawRigData from './rigs.json'
import rawNewRigData from './new-rigs.json'
import { NEW_HEROES } from './new-heroes'
import type { NewHeroId, HeroArchetype } from './new-heroes'
import { radians } from './math'

export type HeroId = 'kaelis' | 'nyxara' | NewHeroId
export type RigPose = Record<string, number>
export type RigTransform = {
  x: number
  y: number
  scale: number
  rotation: number
  facing: number
}

type PartMeta = {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  bone: string
  pivot: [number, number]
}

type HeroRigData = {
  width: number
  height: number
  atlasWidth: number
  atlasHeight: number
  drawOrder: string[]
  parts: Record<string, PartMeta>
}

type RigData = Record<HeroId, HeroRigData>
type FaceMeta = {
  eyes: Array<[number, number, number]>
  mouth: [number, number]
  skin: string
}
type NewRigMeta = HeroRigData & {
  root: [number, number]
  baseScale: number
  bones: Record<string, BoneDefinition>
  face: FaceMeta
  headPoint: [number, number]
}
export type Matrix = [number, number, number, number, number, number]
type BoneDefinition = { parent: string | null; pivot: [number, number] }

const newData = rawNewRigData as unknown as Record<NewHeroId, NewRigMeta>
const data = { ...rawRigData, ...newData } as unknown as RigData
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

const BONES: Record<HeroId, Record<string, BoneDefinition>> = {
  kaelis: {
    root: { parent: null, pivot: [450, 1100] },
    torso: { parent: 'root', pivot: [450, 540] },
    head: { parent: 'torso', pivot: [455, 260] },
    hair: { parent: 'head', pivot: [405, 190] },
    cape: { parent: 'torso', pivot: [565, 315] },
    capeTip: { parent: 'cape', pivot: [650, 640] },
    skirt: { parent: 'root', pivot: [450, 545] },
    armWeapon: { parent: 'torso', pivot: [345, 340] },
    forearmWeapon: { parent: 'armWeapon', pivot: [265, 435] },
    weapon: { parent: 'forearmWeapon', pivot: [185, 435] },
    armFree: { parent: 'torso', pivot: [585, 365] },
    forearmFree: { parent: 'armFree', pivot: [610, 490] },
    legBack: { parent: 'root', pivot: [400, 565] },
    legBackLower: { parent: 'legBack', pivot: [375, 800] },
    legFront: { parent: 'root', pivot: [515, 565] },
    legFrontLower: { parent: 'legFront', pivot: [550, 800] },
  },
  nyxara: {
    root: { parent: null, pivot: [450, 1100] },
    torso: { parent: 'root', pivot: [440, 520] },
    head: { parent: 'torso', pivot: [435, 300] },
    hairLeft: { parent: 'head', pivot: [385, 280] },
    hairRight: { parent: 'head', pivot: [485, 280] },
    dressLeft: { parent: 'root', pivot: [390, 520] },
    dressRight: { parent: 'root', pivot: [480, 520] },
    dressCenter: { parent: 'root', pivot: [435, 520] },
    armLeft: { parent: 'torso', pivot: [365, 355] },
    forearmLeft: { parent: 'armLeft', pivot: [305, 405] },
    armRight: { parent: 'torso', pivot: [510, 355] },
    forearmRight: { parent: 'armRight', pivot: [575, 450] },
    staff: { parent: 'forearmRight', pivot: [635, 515] },
    legBack: { parent: 'root', pivot: [460, 650] },
    legBackLower: { parent: 'legBack', pivot: [500, 870] },
    legFront: { parent: 'root', pivot: [410, 650] },
    legFrontLower: { parent: 'legFront', pivot: [450, 870] },
  },
  talys: newData.talys.bones,
  ilya: newData.ilya.bones,
  nox: newData.nox.bones,
  elowen: newData.elowen.bones,
  brakar: newData.brakar.bones,
}

const ROOTS: Record<HeroId, [number, number]> = {
  kaelis: [450, 1120],
  nyxara: [450, 1100],
  talys: newData.talys.root,
  ilya: newData.ilya.root,
  nox: newData.nox.root,
  elowen: newData.elowen.root,
  brakar: newData.brakar.root,
}

export const BASE_RIG_SCALE: Record<HeroId, number> = {
  kaelis: 0.255,
  nyxara: 0.265,
  talys: newData.talys.baseScale,
  ilya: newData.ilya.baseScale,
  nox: newData.nox.baseScale,
  elowen: newData.elowen.baseScale,
  brakar: newData.brakar.baseScale,
}

export const RIG_HEAD_POINTS: Record<HeroId, [number, number]> = {
  kaelis: [455, 180],
  nyxara: [435, 225],
  talys: newData.talys.headPoint,
  ilya: newData.ilya.headPoint,
  nox: newData.nox.headPoint,
  elowen: newData.elowen.headPoint,
  brakar: newData.brakar.headPoint,
}

export type HeroPresentation = {
  name: string
  title: string
  ultimate: string
  element: string
  portrait: string
  damage: number
  status: string
  statusDetail: string
  subtitle: string
  archetype?: HeroArchetype
  color?: string
  rgb?: string
  secondary?: string
  dark?: string
}

export const HERO_PRESENTATION: Record<HeroId, HeroPresentation> = {
  kaelis: {
    name: 'Kaelis',
    title: 'La Lame de l’Aube',
    ultimate: 'Aube Incarnée',
    element: 'Lumière · Épée solaire',
    portrait: './assets/heroes/kaelis-portrait.webp',
    damage: 32600,
    status: 'Brûlure solaire · 3 tours',
    statusDetail: 'Brûlure · 3 tours',
    subtitle: '« Que l’aube tranche la nuit ! »',
  },
  nyxara: {
    name: 'Nyxara',
    title: 'L’Oracle du Néant',
    ultimate: 'Requiem des Constellations',
    element: 'Cosmos · Bâton astral',
    portrait: './assets/heroes/nyxara-portrait.webp',
    damage: 33400,
    status: 'Marque astrale · 2 tours',
    statusDetail: 'Vitesse −20 % · 2 tours',
    subtitle: '« Les étoiles ont déjà choisi. »',
  },
  ...NEW_HEROES,
}

export function isNewHero(hero: HeroId): hero is NewHeroId {
  return hero in NEW_HEROES
}

function multiply(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ]
}

function translation(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y]
}

function rotationAbout(x: number, y: number, degrees: number): Matrix {
  const angle = radians(degrees)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return multiply(translation(x, y), multiply([cosine, sine, -sine, cosine, 0, 0], translation(-x, -y)))
}

function scaleAbout(x: number, y: number, scaleX: number, scaleY: number, facing: number): Matrix {
  return multiply(translation(x, y), multiply([scaleX * facing, 0, 0, scaleY, 0, 0], translation(-x, -y)))
}

function apply(matrix: Matrix, point: [number, number]): [number, number] {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ]
}

export function boneMatrices(hero: HeroId, pose: RigPose) {
  const matrices: Record<string, Matrix> = {}
  const definitions = BONES[hero]
  const resolve = (name: string): Matrix => {
    if (matrices[name]) return matrices[name]
    const definition = definitions[name]
    const parent = definition.parent ? resolve(definition.parent) : IDENTITY
    matrices[name] = multiply(parent, rotationAbout(definition.pivot[0], definition.pivot[1], pose[name] || 0))
    return matrices[name]
  }
  Object.keys(definitions).forEach(resolve)
  return matrices
}

function rootMatrix(transform: RigTransform, baseScale: number) {
  const scale = transform.scale * baseScale
  return multiply(
    translation(transform.x, transform.y),
    multiply(
      [Math.cos(radians(transform.rotation)), Math.sin(radians(transform.rotation)), -Math.sin(radians(transform.rotation)), Math.cos(radians(transform.rotation)), 0, 0],
      scaleAbout(0, 0, scale, scale, transform.facing),
    ),
  )
}

export function rigPoint(
  hero: HeroId,
  pose: RigPose,
  transform: RigTransform,
  bone: string,
  point: [number, number],
): [number, number] {
  const matrices = boneMatrices(hero, pose)
  const root = ROOTS[hero]
  const local = apply(matrices[bone], point)
  return apply(rootMatrix(transform, BASE_RIG_SCALE[hero]), [local[0] - root[0], local[1] - root[1]])
}

export class RigLibrary {
  private readonly images: Record<HeroId, HTMLImageElement>

  constructor() {
    this.images = {
      kaelis: this.load('./assets/ultimate/kaelis-rig.webp'),
      nyxara: this.load('./assets/ultimate/nyxara-rig.webp'),
      talys: this.load('./assets/ultimate/talys-rig.webp'),
      ilya: this.load('./assets/ultimate/ilya-rig.webp'),
      nox: this.load('./assets/ultimate/nox-rig.webp'),
      elowen: this.load('./assets/ultimate/elowen-rig.webp'),
      brakar: this.load('./assets/ultimate/brakar-rig.webp'),
    }
  }

  isReady(hero: HeroId) {
    const image = this.images[hero]
    return image.complete && image.naturalWidth > 0
  }

  draw(
    context: CanvasRenderingContext2D,
    hero: HeroId,
    pose: RigPose,
    transform: RigTransform,
    ambient: number,
    charge: number,
    alpha = 1,
  ) {
    if (!this.isReady(hero) || alpha <= 0) return
    const rig = data[hero]
    const image = this.images[hero]
    const matrices = boneMatrices(hero, pose)
    const [rootX, rootY] = ROOTS[hero]
    context.save()
    context.globalAlpha *= alpha
    context.translate(transform.x, transform.y)
    context.rotate(radians(transform.rotation))
    const scale = transform.scale * BASE_RIG_SCALE[hero]
    context.scale(scale * transform.facing, scale)
    context.translate(-rootX, -rootY)
    for (const name of rig.drawOrder) {
      const part = rig.parts[name]
      if (!part) continue
      const matrix = matrices[part.bone]
      context.save()
      context.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5])
      context.drawImage(image, part.x, part.y, part.w, part.h, part.cx, part.cy, part.w, part.h)
      context.restore()
    }
    this.drawFace(context, hero, matrices.head, pose, ambient, charge)
    context.restore()
  }

  private load(path: string) {
    const image = new Image()
    image.decoding = 'async'
    image.src = path
    return image
  }

  private drawFace(
    context: CanvasRenderingContext2D,
    hero: HeroId,
    head: Matrix,
    pose: RigPose,
    ambient: number,
    charge: number,
  ) {
    const heroIndex = Object.keys(HERO_PRESENTATION).indexOf(hero)
    const blinkDuration = 3.7 + heroIndex % 4 * 0.17
    const blinkCycle = ambient % blinkDuration
    const naturalBlink = blinkCycle > blinkDuration - 0.14 ? 0.08 : 1
    const eye = Math.max(0.06, Math.min(1, (pose.eye ?? 1) * naturalBlink))
    const shout = pose.shout || 0
    const customFace = isNewHero(hero) ? newData[hero].face : null
    const eyes: Array<[number, number, number]> = customFace?.eyes ?? (hero === 'kaelis'
      ? [[429, 184, 18], [482, 183, 17]]
      : [[413, 239, 17], [459, 238, 17]])
    const skin = customFace?.skin ?? (hero === 'kaelis' ? '#d9a17d' : '#d9a6b5')
    const glow = HERO_PRESENTATION[hero].color ?? (hero === 'kaelis' ? '#ffe28a' : '#83fff4')
    context.save()
    context.transform(head[0], head[1], head[2], head[3], head[4], head[5])
    if (eye < 0.98) {
      eyes.forEach(([x, y, width]) => {
        const cover = (1 - eye) * 12
        context.fillStyle = skin
        context.beginPath()
        context.moveTo(x - width * 0.65, y - 7)
        context.quadraticCurveTo(x, y - 11, x + width * 0.65, y - 7)
        context.lineTo(x + width * 0.58, y - 7 + cover)
        context.quadraticCurveTo(x, y - 3 + cover, x - width * 0.58, y - 7 + cover)
        context.closePath()
        context.fill()
        if (eye < 0.35) {
          context.strokeStyle = hero === 'kaelis' ? '#5a3735' : '#613346'
          context.lineWidth = 2
          context.beginPath()
          context.moveTo(x - width * 0.55, y)
          context.quadraticCurveTo(x, y + 4, x + width * 0.55, y - 1)
          context.stroke()
        }
      })
    }
    if (charge > 0.35 && eye > 0.5) {
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.fillStyle = glow
      context.shadowColor = glow
      context.shadowBlur = 7 + charge * 8
      eyes.forEach(([x, y]) => {
        context.beginPath()
        context.ellipse(x, y, 3.2, 2.1, 0, 0, Math.PI * 2)
        context.fill()
      })
      context.restore()
    }
    if (shout > 0.08) {
      const [mouthX, mouthY] = customFace?.mouth ?? (hero === 'kaelis' ? [457, 224] : [438, 276])
      context.fillStyle = hero === 'kaelis' ? '#703c3b' : '#77374f'
      context.beginPath()
      context.ellipse(mouthX, mouthY, 7 + shout * 3, 1.2 + shout * 4.5, 0, 0, Math.PI * 2)
      context.fill()
      if (shout > 0.5) {
        context.strokeStyle = '#f5d8d1'
        context.lineWidth = 1.6
        context.beginPath()
        context.moveTo(mouthX - 6, mouthY - 2)
        context.lineTo(mouthX + 6, mouthY - 2)
        context.stroke()
      }
    }
    context.restore()
  }
}
