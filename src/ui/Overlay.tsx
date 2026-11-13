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
          <p className="hero-aside">
            {site.location}
            <br />
            {site.intro}
          </p>
        </div>
      </section>

      <section className="scene-text about" style={at(FLIGHT.anchors.about)} aria-labelledby="about-title">
        <LiquidGlass radius={28} className="about-card">
          <div className="about-inner">
            <h2 id="about-title">{site.about.title}</h2>
            <p>{site.about.text}</p>
            <dl className="facts">
              {site.about.facts.map((f) => (
                <div key={f.value}>
                  <dt>{f.value}</dt>
                  <dd>{f.label}</dd>
                </div>
              ))}
            </dl>
            <a className="more" href={site.about.href} target="_blank" rel="noopener">Full story and experience</a>
          </div>
        </LiquidGlass>
      </section>

      <section className="scene-text gallery" style={at(FLIGHT.anchors.gallery)} aria-labelledby="gallery-title">
        <h2 id="gallery-title">{s.gallery.title}</h2>
        <p>{s.gallery.text}</p>
        <p className="hint">Hover a card to tilt it, click to open the project</p>
        <ul className="projects">
          {projects.filter((p) => p.featured).map((p) => (
            <li key={p.id}>
              <LiquidGlass radius={18}>
                <button type="button" className="project" onClick={() => window.dispatchEvent(new CustomEvent('project:open', { detail: p.id }))}>
                  <span className="project-kind" style={{ color: p.tint }}>{p.kind}</span>
                  <span className="project-title">{p.title}</span>
                </button>
              </LiquidGlass>
            </li>
          ))}
        </ul>
        <details className="all-projects">
          <summary>All {projects.length} projects</summary>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <a href={p.href} target="_blank" rel="noopener">
                  <span className="ap-title">{p.title}</span>
                  <span className="ap-meta">{p.category} — {p.stack}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="scene-text tunnel" style={at(FLIGHT.anchors.tunnel)} aria-labelledby="tunnel-title">
        <h2 id="tunnel-title">{s.tunnel.title}</h2>
        <p>{s.tunnel.text}</p>
        <ul className="stack">
          {site.stack.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </section>

      <section className="scene-text beam" style={at(FLIGHT.anchors.beam)} aria-labelledby="beam-title">
        <h2 id="beam-title">{s.beam.title}</h2>
        <p>{s.beam.text}</p>
        <p className="hint">Press and hold to turn the light up</p>
      </section>

      <section className="scene-text blog" style={at(FLIGHT.anchors.blog)} aria-labelledby="blog-title">
        <h2 id="blog-title">{site.blog.title}</h2>
        <p>{site.blog.text}</p>
        <ol className="posts">
          {site.blog.posts.map((p) => (
            <li key={p.href}>
              <LiquidGlass radius={18}>
                <a className="post" href={p.href} target="_blank" rel="noopener">
                  <span className="post-date">{p.date}</span>
                  <span className="post-title">{p.title}</span>
                  <span className="post-summary">{p.summary}</span>
                </a>
              </LiquidGlass>
            </li>
          ))}
        </ol>
        <a className="more" href={site.blog.href} target="_blank" rel="noopener">All notes on the blog</a>
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
