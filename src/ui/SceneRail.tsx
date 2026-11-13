import { useEffect, useState } from 'react'
import { FLIGHT, type SceneName } from '../config/flight'
import { flight } from '../lib/flightState'
import { prefersReducedMotion } from '../lib/quality'

const SCENES: { key: Exclude<SceneName, 'outro'>; label: string }[] = [
  { key: 'hero', label: 'Portrait' },
  { key: 'about', label: 'About' },
  { key: 'gallery', label: 'Work' },
  { key: 'tunnel', label: 'Approach' },
  { key: 'beam', label: 'Light' },
  { key: 'blog', label: 'Notes' },
  { key: 'contact', label: 'Contact' },
]

export function goToScene(key: Exclude<SceneName, 'outro'>) {
  const h = document.documentElement.scrollHeight - window.innerHeight
  if (prefersReducedMotion) {
    document.getElementById(`${key === 'hero' ? 'hero' : key}-title`)?.scrollIntoView()
    return
  }
  window.dispatchEvent(new CustomEvent('flight:goto', { detail: FLIGHT.anchors[key] * h }))
}

/** Scene dots on the right edge. Shows where the flight is; click or use the keyboard to jump. */
export function SceneRail() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = flight.progress
      let best = 0
      SCENES.forEach((s, i) => { if (Math.abs(FLIGHT.anchors[s.key] - p) < Math.abs(FLIGHT.anchors[SCENES[best].key] - p)) best = i })
      setActive((a) => (a === best ? a : best))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [role="dialog"]')) return
      const next = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0
      if (!next || prefersReducedMotion) return
      e.preventDefault()
      setActive((a) => {
        const i = Math.max(0, Math.min(SCENES.length - 1, a + next))
        goToScene(SCENES[i].key)
        return i
      })
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <nav className="rail" aria-label="Scenes">
      {SCENES.map((s, i) => (
        <button
          key={s.key}
          type="button"
          className={i === active ? 'is-active' : ''}
          aria-current={i === active ? 'step' : undefined}
          onClick={() => goToScene(s.key)}
        >
          <span className="rail-label">{s.label}</span>
          <span className="rail-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
