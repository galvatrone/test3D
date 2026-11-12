import site from '../data/site.json'
import projects from '../data/projects.json'
import { FLIGHT } from '../config/flight'
import { prefersReducedMotion } from '../lib/quality'
import { LiquidGlass } from './LiquidGlass'
import { ContactForm } from './ContactForm'

/** Places a text block at a point of the flight (anchor in progress units). */
const at = (anchor: number) =>
  prefersReducedMotion ? undefined : ({ top: `calc(${anchor} * (${FLIGHT.scrollLengthVh}vh - 100vh))` } as const)

/** Accessible HTML over the canvas. The tall #flight block is what the scroll drives. */
export function Overlay({ entered }: { entered: boolean }) {
  const length = prefersReducedMotion ? undefined : `${FLIGHT.scrollLengthVh}vh`
  const s = site.sections
  return (
    <main id="flight" className={entered ? 'is-entered' : ''} style={{ height: length }}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-main">
          <h1 id="hero-title">{site.name}</h1>
          <p className="hero-role">{site.role}</p>
        </div>
        <p className="hero-aside">
          {site.location}
          <br />
          {site.intro}
        </p>
      </section>

      <section className="scene-text gallery" style={at(FLIGHT.anchors.gallery)} aria-labelledby="gallery-title">
        <h2 id="gallery-title">{s.gallery.title}</h2>
        <p>{s.gallery.text}</p>
        <ul className="projects">
          {projects.map((p) => (
            <li key={p.id}>
              <LiquidGlass radius={20}>
                <a className="project" href={p.href} target="_blank" rel="noopener">
                  <span className="project-kind" style={{ color: p.tint }}>{p.kind}</span>
                  <span className="project-title">{p.title}</span>
                  <span className="project-summary">{p.summary}</span>
                </a>
              </LiquidGlass>
            </li>
          ))}
        </ul>
      </section>

      <section className="scene-text tunnel" style={at(FLIGHT.anchors.tunnel)} aria-labelledby="tunnel-title">
        <h2 id="tunnel-title">{s.tunnel.title}</h2>
        <p>{s.tunnel.text}</p>
      </section>

      <section className="scene-text beam" style={at(FLIGHT.anchors.beam)} aria-labelledby="beam-title">
        <h2 id="beam-title">{s.beam.title}</h2>
        <p>{s.beam.text}</p>
      </section>

      <section className="scene-text contact" style={at(FLIGHT.anchors.contact)} aria-labelledby="contact-title">
        <div className="contact-copy">
          <h2 id="contact-title">{s.contact.title}</h2>
          <p>{s.contact.text}</p>
          <ul className="links">
            {site.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <ContactForm />
      </section>
    </main>
  )
}
