/**
 * Images used by the page, imported so the build can inline them as data URLs.
 * Inlined images keep the site working when dist/index.html is opened straight from disk
 * (file://), where the browser refuses to let a canvas read pixels from separate files.
 */
import portrait from '../assets/portrait.jpg'
import logoMark from '../assets/logo-mark.svg'

const projectImages = import.meta.glob('../assets/projects/*.{webp,jpg,png}', { eager: true, import: 'default' }) as Record<string, string>

export const ASSETS = { portrait, logoMark }

/** projects.json stores images as "projects/name.webp". */
export function projectImage(name: string): string {
  const url = projectImages['../assets/' + name]
  if (!url) throw new Error(`Missing project image src/assets/${name}`)
  return url
}
