import { useCallback, useEffect, useRef, useState } from 'react'
import allProjects from '../data/projects.json'
import { LiquidGlass } from './LiquidGlass'

const featured = allProjects.filter((p) => p.featured)

/** Glass panel with one project. Opened by clicking a 3D card or a list item (event 'project:open'). */
export function ProjectPanel() {
  const [id, setId] = useState<string | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const opener = useRef<Element | null>(null)
  const p = allProjects.find((x) => x.id === id)
  const fi = featured.findIndex((x) => x.id === id)

  const close = useCallback(() => {
    setId(null)
    ;(opener.current as HTMLElement | null)?.focus?.()
  }, [])
  const step = useCallback((d: number) => {
    if (fi < 0) return
    setId(featured[(fi + d + featured.length) % featured.length].id)
  }, [fi])

  useEffect(() => {
    const open = (e: Event) => {
      opener.current = document.activeElement
      setId((e as CustomEvent<string>).detail)
    }
    window.addEventListener('project:open', open)
    return () => window.removeEventListener('project:open', open)
  }, [])

  useEffect(() => {
    if (!id) return
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); step(-1) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [id, close, step])

  if (!p) return null
  const tint = 'tint' in p ? (p.tint as string) : 'var(--bone)'
  return (
    <div className="panel-backdrop" onClick={close}>
      <div className="panel-wrap" role="dialog" aria-modal="true" aria-labelledby="panel-title" onClick={(e) => e.stopPropagation()}>
        <LiquidGlass radius={28} className="panel">
          {'image' in p && p.image && <img className="panel-img" src={import.meta.env.BASE_URL + p.image} alt="" />}
          <div className="panel-body">
            <p className="panel-kind" style={{ color: tint }}>{'kind' in p ? p.kind : p.category}</p>
            <h2 id="panel-title">{p.title}</h2>
            <p className="panel-summary">{p.summary}</p>
            {'detail' in p && <p className="panel-detail">{p.detail}</p>}
            <p className="panel-stack">{p.stack}</p>
            <div className="panel-actions">
              <a className="panel-link" href={p.href} target="_blank" rel="noopener">Open the project page</a>
              {fi >= 0 && (
                <span className="panel-nav">
                  <button type="button" onClick={() => step(-1)} aria-label="Previous project">←</button>
                  <span className="panel-count">{fi + 1} of {featured.length}</span>
                  <button type="button" onClick={() => step(1)} aria-label="Next project">→</button>
                </span>
              )}
            </div>
          </div>
          <button ref={closeBtn} type="button" className="panel-close" onClick={close} aria-label="Close project">×</button>
        </LiquidGlass>
      </div>
    </div>
  )
}
