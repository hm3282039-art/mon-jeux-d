import { clamp, easeIn, easeInOut, easeOut, keyed, lerp, segment, smooth } from './math'
import { NEW_HEROES } from './new-heroes'
import type { NewHeroId } from './new-heroes'
import type { RigPose, RigTransform } from './rig'

export type NewSceneState = { transform: RigTransform; pose: RigPose; charge: number }
export const NEW_ATTACHMENTS: Record<NewHeroId, { bone: string; point: [number, number] }> = {
  talys: { bone: 'forearmRight', point: [650, 650] },
  ilya: { bone: 'weaponLeft', point: [180, 540] },
  nox: { bone: 'weaponRight', point: [780, 420] },
  elowen: { bone: 'weaponRight', point: [745, 130] },
  brakar: { bone: 'forearmRight', point: [700, 680] },
}

function commonPose(time: number, ambient: number): RigPose {
  return {
    head: keyed(time, [[0, 0], [0.55, -5], [1.25, 2], [2.35, 6], [3.45, -5], [4.5, -7], [5.4, 5], [6.6, 0], [8, 0]]),
    hair: Math.sin(ambient * 4.2) * 3,
    clothLeft: Math.sin(ambient * 3.4) * 2.5,
    clothRight: -Math.sin(ambient * 3.1 + 0.8) * 2.5,
    eye: keyed(time, [[0, 1], [0.52, 0.2], [0.72, 0.1], [0.96, 1], [4.48, 1], [4.58, 0.3], [4.76, 1], [8, 1]]),
    shout: keyed(time, [[0, 0], [3.7, 0], [4.05, 0.7], [4.5, 0.9], [4.88, 0], [8, 0]]),
  }
}

function stabilizeLegs(pose: RigPose, time: number) {
  const stability = smooth(segment(time, 1.9, 2.3)) * (1 - smooth(segment(time, 4.9, 5.5)))
  pose.legFront = lerp(pose.legFront || 0, -8, stability)
  pose.legBack = lerp(pose.legBack || 0, 10, stability)
  pose.legFrontLower = lerp(pose.legFrontLower || 0, 12, stability)
  pose.legBackLower = lerp(pose.legBackLower || 0, 14, stability)
  pose.legFront = clamp(pose.legFront || 0, -26, 26)
  pose.legBack = clamp(pose.legBack || 0, -26, 26)
  pose.legFrontLower = clamp(pose.legFrontLower || 0, -8, 32)
  pose.legBackLower = clamp(pose.legBackLower || 0, -8, 32)
}

function meleeState(hero: NewHeroId, time: number, ambient: number): NewSceneState {
  const assassin = hero === 'nox'
  const titan = hero === 'brakar'
  const pose = commonPose(time, ambient)
  const run = time >= 1.35 && time < 2.15 ? Math.sin((time - 1.35) * (titan ? 14 : 19)) : 0
  pose.torso = keyed(time, [[0, 0], [0.5, titan ? 4 : 7], [1.3, 2], [2.35, -8], [3.45, 10], [4.5, titan ? 24 : 18], [5.2, 8], [6.4, 0], [8, 0]])
  pose.armLeft = keyed(time, [[0, 0], [0.55, assassin ? -22 : 18], [1.3, assassin ? -35 : 24], [2.35, assassin ? -62 : 55], [3.45, assassin ? -75 : 80], [4.5, assassin ? 48 : -48], [5.3, 12], [6.5, 0], [8, 0]], easeInOut)
  pose.armRight = keyed(time, [[0, 0], [0.55, assassin ? 22 : -18], [1.3, assassin ? 35 : -30], [2.35, assassin ? 62 : -65], [3.45, assassin ? 75 : -90], [4.5, assassin ? -48 : 58], [5.3, -12], [6.5, 0], [8, 0]], easeInOut)
  pose.forearmLeft = keyed(time, [[0, 0], [1.3, -12], [2.35, -22], [3.45, -30], [4.5, 20], [5.6, 0], [8, 0]])
  pose.forearmRight = keyed(time, [[0, 0], [1.3, 12], [2.35, 22], [3.45, 30], [4.5, -20], [5.6, 0], [8, 0]])
  pose.legFront = run * (titan ? 14 : 23)
  pose.legBack = -run * (titan ? 14 : 23)
  pose.legFrontLower = 8 + Math.max(0, -run) * 22
  pose.legBackLower = 8 + Math.max(0, run) * 22
  pose.clothLeft = (pose.clothLeft || 0) + smooth(segment(time, 1.35, 2.2)) * 10
  pose.clothRight = (pose.clothRight || 0) - smooth(segment(time, 1.35, 2.2)) * 10
  pose.hair = (pose.hair || 0) + smooth(segment(time, 1.35, 2.3)) * 6
  if (assassin) {
    pose.weaponLeft = keyed(time, [[0, 0], [1.3, -20], [2.35, -80], [3.45, -130], [4.5, 55], [5.35, 100], [6.4, 360], [8, 360]], easeInOut)
    pose.weaponRight = keyed(time, [[0, 0], [1.3, 20], [2.35, 80], [3.45, 130], [4.5, -55], [5.35, -100], [6.4, -360], [8, -360]], easeInOut)
  }
  stabilizeLegs(pose, time)

  const transform: RigTransform = { x: 350, y: 568, scale: titan ? 1.04 : 1, rotation: 0, facing: 1 }
  transform.y += keyed(time, [[0, 0], [0.5, titan ? 10 : 17], [1.3, 0], [8, 0]])
  if (time >= 1.35 && time < 2.35) {
    const amount = easeInOut(segment(time, 1.35, 2.35))
    transform.x = lerp(350, 630, amount)
    transform.y = 568 - easeOut(segment(time, 1.92, 2.35)) * (titan ? 95 : 145) - Math.abs(run) * 4
    transform.rotation = run * (titan ? 1.2 : 2.5)
  } else if (time >= 2.35 && time < 3.45) {
    const amount = smooth(segment(time, 2.35, 3.45))
    transform.x = lerp(630, 770, amount)
    transform.y = lerp(titan ? 473 : 423, titan ? 315 : 270, amount) - Math.sin(amount * Math.PI) * (titan ? 25 : 55)
    transform.rotation = assassin ? lerp(-10, 350, easeInOut(amount)) : lerp(-8, titan ? -18 : 4, amount)
  } else if (time >= 3.45 && time < 4.5) {
    const amount = easeIn(segment(time, 3.45, 4.5))
    transform.x = lerp(770, 765, amount)
    transform.y = lerp(titan ? 315 : 270, 420, amount)
    transform.rotation = assassin ? lerp(350, 395, amount) : lerp(titan ? -18 : 4, titan ? 32 : 28, amount)
  } else if (time >= 4.5 && time < 5.65) {
    const amount = easeOut(segment(time, 4.5, 5.65))
    transform.x = lerp(765, 545, amount)
    transform.y = lerp(420, 568, amount) - Math.sin(amount * Math.PI) * 22
    transform.rotation = assassin ? lerp(395, 360, amount) : lerp(titan ? 32 : 28, 0, amount)
  } else if (time >= 5.65) {
    transform.x = keyed(time, [[5.65, 545], [7, 545], [8, 350]], easeInOut)
  }
  const power = smooth(segment(time, 0.45, 1.2)) * (1 - smooth(segment(time, 5.1, 6.2)))
  return { transform, pose, charge: 0.15 + power * 0.85 }
}

function ilyaState(time: number, ambient: number): NewSceneState {
  const pose = commonPose(time, ambient)
  const draw = smooth(segment(time, 0.55, 2.7)) * (1 - smooth(segment(time, 4.55, 5.35)))
  pose.torso = keyed(time, [[0, 0], [0.55, 4], [1.35, -4], [2.35, -8], [3.45, -5], [4.5, 8], [5.6, 0], [8, 0]])
  pose.armLeft = lerp(0, 64, draw)
  pose.forearmLeft = lerp(0, 20, draw)
  pose.weaponLeft = lerp(0, 10, draw)
  pose.armRight = keyed(time, [[0, 0], [1.35, -20], [2.35, -58], [3.45, -65], [4.35, -65], [4.5, 15], [5.5, 0], [8, 0]], easeInOut)
  pose.forearmRight = keyed(time, [[0, 0], [1.35, -20], [2.35, -55], [4.35, -55], [4.5, 20], [5.5, 0], [8, 0]])
  pose.legFront = -8 * draw
  pose.legBack = 10 * draw
  pose.legFrontLower = 12 * draw
  pose.legBackLower = 14 * draw
  pose.clothLeft = (pose.clothLeft || 0) - draw * 7
  pose.clothRight = (pose.clothRight || 0) + draw * 7
  pose.hair = (pose.hair || 0) + draw * 8
  const transform: RigTransform = { x: 350, y: 568, scale: 1, rotation: 0, facing: 1 }
  if (time >= 1.35 && time < 2.35) {
    const amount = easeInOut(segment(time, 1.35, 2.35))
    transform.x = lerp(350, 300, amount)
    transform.y = lerp(568, 405, amount) - Math.sin(amount * Math.PI) * 30
    transform.rotation = lerp(0, -8, amount)
  } else if (time >= 2.35 && time < 3.45) {
    const amount = smooth(segment(time, 2.35, 3.45))
    transform.x = lerp(300, 440, amount)
    transform.y = lerp(405, 320, amount) - Math.sin(amount * Math.PI) * 25
    transform.rotation = lerp(-8, 3, amount)
  } else if (time >= 3.45 && time < 4.5) {
    transform.x = 440
    transform.y = 320 + Math.sin(ambient * 2) * 3
    transform.rotation = 3
  } else if (time >= 4.5 && time < 5.65) {
    const amount = easeOut(segment(time, 4.5, 5.65))
    transform.x = lerp(440, 400, amount)
    transform.y = lerp(320, 568, amount) - Math.sin(amount * Math.PI) * 20
    transform.rotation = lerp(12, 0, amount)
  } else if (time >= 5.65) {
    transform.x = keyed(time, [[5.65, 400], [7, 400], [8, 350]], easeInOut)
  }
  return { transform, pose, charge: 0.15 + draw * 0.85 }
}

function elowenState(time: number, ambient: number): NewSceneState {
  const pose = commonPose(time, ambient)
  const power = smooth(segment(time, 0.45, 2.4)) * (1 - smooth(segment(time, 5.1, 6.3)))
  pose.torso = keyed(time, [[0, 0], [0.55, 4], [1.35, -4], [2.35, -7], [3.45, 8], [4.5, 13], [5.2, -5], [6.5, 0], [8, 0]])
  pose.armRight = keyed(time, [[0, 0], [0.7, -12], [1.35, -28], [2.35, -45], [3.45, -25], [4.5, 38], [5.3, 5], [6.6, 0], [8, 0]], easeInOut)
  pose.forearmRight = keyed(time, [[0, 0], [1.35, -18], [2.35, -32], [3.45, -15], [4.5, 28], [5.5, 0], [8, 0]])
  pose.weaponRight = keyed(time, [[0, 0], [1.35, -8], [2.35, -18], [3.45, -10], [4.5, 22], [5.5, 0], [8, 0]])
  pose.armLeft = keyed(time, [[0, 0], [0.7, 12], [1.35, 25], [2.35, 48], [3.45, 25], [4.5, -35], [5.4, 0], [8, 0]], easeInOut)
  pose.forearmLeft = -power * 25
  pose.legFront = -6 * power
  pose.legBack = 8 * power
  pose.legFrontLower = 10 * power
  pose.legBackLower = 12 * power
  pose.clothLeft = (pose.clothLeft || 0) - power * 10
  pose.clothRight = (pose.clothRight || 0) + power * 10
  pose.hair = (pose.hair || 0) + power * 9
  const transform: RigTransform = { x: 350, y: 568, scale: 1, rotation: 0, facing: 1 }
  if (time >= 1.35 && time < 2.35) {
    const amount = easeInOut(segment(time, 1.35, 2.35))
    transform.x = lerp(350, 500, amount)
    transform.y = lerp(568, 355, amount) - Math.sin(amount * Math.PI) * 30
    transform.rotation = lerp(0, -6, amount)
  } else if (time >= 2.35 && time < 3.45) {
    const amount = smooth(segment(time, 2.35, 3.45))
    transform.x = lerp(500, 635, amount)
    transform.y = lerp(355, 295, amount) - Math.sin(amount * Math.PI) * 25
    transform.rotation = keyed(time, [[2.35, -6], [2.85, 6], [3.45, -3]], easeInOut)
  } else if (time >= 3.45 && time < 4.5) {
    const amount = easeInOut(segment(time, 3.45, 4.5))
    transform.x = lerp(635, 665, amount)
    transform.y = lerp(295, 345, amount)
    transform.rotation = lerp(-3, 7, amount)
  } else if (time >= 4.5 && time < 5.65) {
    const amount = easeOut(segment(time, 4.5, 5.65))
    transform.x = lerp(665, 500, amount)
    transform.y = lerp(345, 568, amount) - Math.sin(amount * Math.PI) * 25
    transform.rotation = lerp(7, 0, amount)
  } else if (time >= 5.65) {
    transform.x = keyed(time, [[5.65, 500], [7, 500], [8, 350]], easeInOut)
  }
  return { transform, pose, charge: 0.15 + power * 0.85 }
}

export function newHeroState(hero: NewHeroId, time: number, ambient: number): NewSceneState {
  const archetype = NEW_HEROES[hero].archetype
  if (archetype === 'archer') return ilyaState(time, ambient)
  if (archetype === 'druid') return elowenState(time, ambient)
  return meleeState(hero, time, ambient)
}

export function idleNewHeroState(hero: NewHeroId, ambient: number): NewSceneState {
  const titan = hero === 'brakar'
  return {
    transform: { x: 350, y: 568 + Math.sin(ambient * 1.5) * (titan ? 0.8 : 2), scale: titan ? 1.04 : 1, rotation: 0, facing: 1 },
    pose: {
      torso: Math.sin(ambient * 1.5) * 0.9,
      head: Math.sin(ambient * 1.1 + 0.4) * 1.3,
      hair: Math.sin(ambient * 3.4) * 3,
      clothLeft: Math.sin(ambient * 2.8) * 2,
      clothRight: -Math.sin(ambient * 3.1) * 2,
      eye: 1,
    },
    charge: 0.16,
  }
}
