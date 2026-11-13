import { useEffect, useRef, useState } from 'react'
import { flight } from '../lib/flightState'
import { prefersReducedMotion } from '../lib/quality'
import { DEBUG } from '../lib/debug'

/**
 * End of the flight: once the camera has passed through the neon door, the screen floods red,
 * the page jumps back to the top under the flash, and the portrait assembles again.
 */
export function LoopBack() {
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')
  const busy = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion || DEBUG.progress !== null) return
    let raf = 0
    const tick = () => {
      if (!busy.current && flight.progress > 0.995 && flight.velocity > 0) {
        busy.current = true
        setPhase('in')
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flight:jump', { detail: 0 }))
          window.dispatchEvent(new Event('flight:reassemble'))
          setPhase('out')
          window.setTimeout(() => {
            setPhase('idle')
            busy.current = false
          }, 1100)
        }, 650)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <div className={`loop-flash is-${phase}`} aria-hidden="true" />
}
