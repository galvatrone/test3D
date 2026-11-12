import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FLIGHT } from '../config/flight'
import { flight } from './flightState'
import { prefersReducedMotion } from './quality'

gsap.registerPlugin(ScrollTrigger)

/** Lenis smooth scroll + one ScrollTrigger that maps the whole page to flight progress. */
export function useFlightScroll(enabled: boolean) {
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      flight.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      flight.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    if (!enabled || prefersReducedMotion) return () => window.removeEventListener('pointermove', onPointer)

    const lenis = new Lenis({ lerp: FLIGHT.lenis.lerp, wheelMultiplier: FLIGHT.lenis.wheelMultiplier })
    lenis.on('scroll', ScrollTrigger.update)
    if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const st = ScrollTrigger.create({
      trigger: '#flight',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        flight.progress = self.progress
      },
    })

    const goTo = (e: Event) => lenis.scrollTo((e as CustomEvent<string>).detail, { duration: 2.2 })
    window.addEventListener('flight:goto', goTo)

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('flight:goto', goTo)
      st.kill()
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [enabled])
}
