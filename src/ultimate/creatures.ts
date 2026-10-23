import rawCreatureData from './creature-rigs.json'
import { radians } from './math'
import type { RigTransform } from './rig'

export type CreatureId = 'dragon' | 'astral'
export type CreaturePose = Record<string, number>
type Matrix = [number, number, number, number, number, number]
type BoneDefinition = { parent: string | null; pivot: [number, number] }
type PartMeta = {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  bone: string
}
type CreatureRigData = {
  width: number
  height: number
  drawOrder: string[]
  parts: Record<string, PartMeta>
}
type CreatureData = Record<CreatureId, CreatureRigData> & {
  wing: { width: number; height: number; pivot: [number, number] }
}

const data = rawCreatureData as unknown as CreatureData
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const ROOTS: Record<CreatureId, [number, number]> = {
  dragon: [400, 735],
  astral: [700, 400],
}
export const CREATURE_BASE_SCALE: Record<CreatureId, number> = {
  dragon: 0.43,
  astral: 0.31,
}

const BONES: Record<CreatureId, Record<string, BoneDefinition>> = {
  dragon: {
    root: { parent: null, pivot: [400, 735] },
    body: { parent: 'root', pivot: [430, 500] },
    wingRear: { parent: 'body', pivot: [450, 320] },
    wingFront: { parent: 'body', pivot: [500, 150] },
    tail: { parent: 'body', pivot: [570, 450] },
    legRear: { parent: 'body', pivot: [570, 480] },
    legFront: { parent: 'body', pivot: [350, 500] },
    neck: { parent: 'body', pivot: [350, 450] },
    head: { parent: 'neck', pivot: [320, 310] },
  },
  astral: {
    root: { parent: null, pivot: [700, 400] },
    body: { parent: 'root', pivot: [650, 430] },
    tail: { parent: 'body', pivot: [430, 450] },
    claws: { parent: 'body', pivot: [1000, 570] },
    neck: { parent: 'body', pivot: [980, 400] },
    head: { parent: 'neck', pivot: [1090, 270] },
  },
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

function apply(matrix: Matrix, point: [number, number]): [number, number] {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ]
}

function boneMatrices(creature: CreatureId, pose: CreaturePose) {
  const matrices: Record<string, Matrix> = {}
  const definitions = BONES[creature]
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
  const angle = radians(transform.rotation)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return multiply(
    translation(transform.x, transform.y),
    multiply(
      [cosine, sine, -sine, cosine, 0, 0],
      [scale * transform.facing, 0, 0, scale, 0, 0],
    ),
  )
}

export function creaturePoint(
  creature: CreatureId,
  pose: CreaturePose,
  transform: RigTransform,
  bone: string,
  point: [number, number],
): [number, number] {
  const matrices = boneMatrices(creature, pose)
  const root = ROOTS[creature]
  const local = apply(matrices[bone], point)
  return apply(rootMatrix(transform, CREATURE_BASE_SCALE[creature]), [local[0] - root[0], local[1] - root[1]])
}

export class CreatureLibrary {
  private readonly images: Record<CreatureId | 'wing', HTMLImageElement>

  constructor() {
    this.images = {
      dragon: this.load('./assets/ultimate/zenith-dragon-rig.webp'),
      astral: this.load('./assets/ultimate/astral-dragon-rig.webp'),
      wing: this.load('./assets/ultimate/phoenix-wing.webp'),
    }
  }

  draw(
    context: CanvasRenderingContext2D,
    creature: CreatureId,
    pose: CreaturePose,
    transform: RigTransform,
    alpha = 1,
  ) {
    const image = this.images[creature]
    if (!image.complete || image.naturalWidth === 0 || alpha <= 0) return
    const rig = data[creature]
    const matrices = boneMatrices(creature, pose)
    const [rootX, rootY] = ROOTS[creature]
    context.save()
    context.globalAlpha *= alpha
    context.translate(transform.x, transform.y)
    context.rotate(radians(transform.rotation))
    const scale = transform.scale * CREATURE_BASE_SCALE[creature]
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
    context.restore()
  }

  drawWing(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    side: -1 | 1,
    alpha: number,
  ) {
    const image = this.images.wing
    if (!image.complete || image.naturalWidth === 0 || alpha <= 0 || scale <= 0) return
    const { pivot } = data.wing
    context.save()
    context.globalAlpha *= alpha
    context.translate(x, y)
    context.rotate(radians(rotation))
    context.scale(scale * side, scale)
    context.drawImage(image, -pivot[0], -pivot[1])
    context.restore()
  }

  private load(path: string) {
    const image = new Image()
    image.decoding = 'async'
    image.src = path
    return image
  }
}
