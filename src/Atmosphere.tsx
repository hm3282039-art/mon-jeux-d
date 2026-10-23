import { memo, useEffect, useRef } from 'react'

export type RenderQuality = 'auto' | 'ultra' | 'balanced' | 'eco'

type AtmosphereProps = {
  enabled: boolean
  quality: RenderQuality
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  sprite: number
  stretch: number
}

const qualitySettings: Record<RenderQuality, { count: number; dpr: number; label: string }> = {
  auto: { count: 80, dpr: 1, label: 'AUTO' },
  ultra: { count: 140, dpr: 1.25, label: 'ULTRA' },
  balanced: { count: 56, dpr: 1, label: 'FLUIDE' },
  eco: { count: 26, dpr: 1, label: 'ÉCO' },
}

function makeGlowSprite(color: string, core: string) {
  const sprite = document.createElement('canvas')
  sprite.width = 32
  sprite.height = 32
  const context = sprite.getContext('2d')
  if (!context) return sprite

  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  glow.addColorStop(0, core)
  glow.addColorStop(0.12, color)
  glow.addColorStop(0.38, color.replace('1)', '.34)'))
  glow.addColorStop(1, color.replace('1)', '0)'))
  context.fillStyle = glow
  context.fillRect(0, 0, 32, 32)
  return sprite
}

/**
 * A single compositor-friendly canvas for all ambient particles.
 * The loop is deliberately not capped: requestAnimationFrame follows the
 * physical display refresh rate (60, 120, 144, 165, 240 Hz and beyond).
 */
export const Atmosphere = memo(function Atmosphere({ enabled, quality }: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const status = statusRef.current
    if (!canvas || !status) return

    // Keep a regular transparent canvas. Desynchronized contexts can be
    // composited as opaque black by some Opera/GPU combinations, hiding the city.
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let animationFrame = 0
    let width = 1
    let height = 1
    let pixelRatio = 1
    let particles: Particle[] = []
    let lastTime = performance.now()
    let sampleStart = lastTime
    let sampledFrames = 0
    let lowFpsSamples = 0
    let running = true

    const settings = qualitySettings[quality]
    const cores = ['rgba(255,238,170,1)', 'rgba(126,246,255,1)', 'rgba(221,169,255,1)']
    const colors = ['rgba(255,202,91,1)', 'rgba(70,225,255,1)', 'rgba(178,100,255,1)']
    const sprites = colors.map((color, index) => makeGlowSprite(color, cores[index]))

    const createParticle = (index: number, randomY = true): Particle => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : height + 20,
      vx: 2 + Math.random() * 8,
      vy: -(5 + Math.random() * 14),
      size: 4 + Math.random() * 12,
      alpha: 0.22 + Math.random() * 0.58,
      phase: Math.random() * Math.PI * 2,
      sprite: index % 3,
      stretch: index % 11 === 0 ? 2.8 : 1,
    })

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      pixelRatio = Math.min(window.devicePixelRatio || 1, settings.dpr)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      const areaScale = Math.min(1.25, Math.max(0.55, (width * height) / 1_100_000))
      const targetCount = Math.round(settings.count * areaScale)
      particles = Array.from({ length: targetCount }, (_, index) => createParticle(index))
    }

    const draw = (now: number) => {
      if (!running) return
      animationFrame = requestAnimationFrame(draw)

      const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000))
      lastTime = now
      const warmingUp = now < sampleStart
      if (!warmingUp) sampledFrames += 1

      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        particle.phase += delta * 0.9
        particle.x += (particle.vx + Math.sin(particle.phase) * 3) * delta
        particle.y += particle.vy * delta

        if (particle.y < -24 || particle.x > width + 24) {
          particle.x = Math.random() * width * 0.82 - 20
          particle.y = height + Math.random() * 45
        }

        const pulse = 0.72 + Math.sin(particle.phase * 1.7) * 0.28
        context.globalAlpha = particle.alpha * pulse
        const drawSize = particle.size
        context.drawImage(
          sprites[particle.sprite],
          particle.x - drawSize / 2,
          particle.y - (drawSize * particle.stretch) / 2,
          drawSize,
          drawSize * particle.stretch,
        )
      }

      context.globalAlpha = 1

      if (!warmingUp && now - sampleStart >= 1000) {
        const fps = Math.round((sampledFrames * 1000) / (now - sampleStart))
        if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`
        status.dataset.fps = String(fps)

        if (quality === 'auto' && fps < 45 && particles.length > 32) {
          lowFpsSamples += 1
          if (lowFpsSamples >= 3) {
            const targetCount = Math.max(32, Math.floor(particles.length * 0.8))
            particles.splice(0, particles.length - targetCount)
            status.dataset.adaptive = 'true'
            lowFpsSamples = 0
          }
        } else {
          lowFpsSamples = 0
        }

        sampleStart = now
        sampledFrames = 0
      }
    }

    const start = () => {
      if (!enabled || document.hidden) return
      running = true
      lastTime = performance.now()
      sampleStart = lastTime + 800
      sampledFrames = 0
      lowFpsSamples = 0
      status.dataset.running = 'true'
      status.dataset.fps = 'pending'
      if (fpsRef.current) fpsRef.current.textContent = 'SYNC…'
      animationFrame = requestAnimationFrame(draw)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(animationFrame)
      status.dataset.running = 'false'
    }

    const onVisibilityChange = () => {
      stop()
      if (!document.hidden) start()
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (enabled) {
      start()
    } else {
      status.dataset.running = 'false'
      if (fpsRef.current) fpsRef.current.textContent = 'FX COUPÉS'
      context.clearRect(0, 0, width, height)
    }

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, quality])

  return (
    <>
      <canvas ref={canvasRef} className="atmosphere-canvas" aria-hidden="true" data-engine="raf-uncapped" />
      <div ref={statusRef} className="engine-status" data-quality={quality} title="Fréquence réelle mesurée sur votre écran">
        <i aria-hidden="true" />
        <span ref={fpsRef}>— FPS</span>
        <small>{qualitySettings[quality].label}</small>
      </div>
    </>
  )
})
