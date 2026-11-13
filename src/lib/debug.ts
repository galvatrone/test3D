/**
 * URL switches for checking a frame without scrolling:
 *   ?pose=-1.57  freeze the head rotation (radians), skipping the intro turn
 *   ?p=0.35      freeze flight progress (0..1), scroll is ignored
 *   ?assemble=0.5 freeze the particle portrait mid-assembly (0..1)
 */
const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const num = (k: string) => (q.has(k) ? Number(q.get(k)) : null)
export const DEBUG = { pose: num('pose'), progress: num('p'), assemble: num('assemble') }
