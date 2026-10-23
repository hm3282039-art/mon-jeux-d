export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 720

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount
export const invLerp = (a: number, b: number, value: number) => clamp((value - a) / (b - a))
export const smooth = (value: number) => {
  const x = clamp(value)
  return x * x * (3 - 2 * x)
}
export const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
export const easeIn = (value: number) => Math.pow(clamp(value), 3)
export const easeInOut = (value: number) => {
  const x = clamp(value)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
export const segment = (time: number, start: number, end: number) => clamp((time - start) / (end - start))
export const radians = (degrees: number) => degrees * Math.PI / 180
export const pulse = (time: number, center: number, width: number) => clamp(1 - Math.abs(time - center) / width)

export function keyed(time: number, frames: Array<[number, number]>, easing: (value: number) => number = smooth) {
  if (time <= frames[0][0]) return frames[0][1]
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]
    const next = frames[index]
    if (time <= next[0]) {
      const amount = easing((time - previous[0]) / (next[0] - previous[0]))
      return lerp(previous[1], next[1], amount)
    }
  }
  return frames[frames.length - 1][1]
}

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function formatTime(time: number) {
  return `${time.toFixed(2).replace('.', ',')} s`
}
