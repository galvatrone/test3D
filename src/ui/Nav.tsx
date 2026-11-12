import site from '../data/site.json'
import { LiquidGlass } from './LiquidGlass'
import { LiquidLogo } from './LiquidLogo'
import { FLIGHT, type SceneName } from '../config/flight'
import { prefersReducedMotion } from '../lib/quality'

const go = (scene: SceneName) => (e: React.MouseEvent) => {
  if (prefersReducedMotion) return
  e.preventDefault()
  const h = document.documentElement.scrollHeight - window.innerHeight
  window.dispatchEvent(new CustomEvent('flight:goto', { detail: FLIGHT.anchors[scene] * h }))
}

export function Nav() {
  return (
    <header className="nav">
      <a className="nav-brand" href="#hero-title" onClick={go('hero')} aria-label={`${site.name}, back to the start`}>
        <LiquidLogo size={40} />
      </a>
      <LiquidGlass radius={999} className="nav-links">
        <nav aria-label="Sections">
          <a href="#gallery-title" onClick={go('gallery')}>Work</a>
          <a href="#tunnel-title" onClick={go('tunnel')}>Approach</a>
          <a href="#contact-title" onClick={go('contact')}>Contact</a>
        </nav>
      </LiquidGlass>
    </header>
  )
}
