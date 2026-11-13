/**
 * Particle portrait data.
 *
 * Source, in order of preference:
 *  1. a frame sequence in public/head-frames/, declared in config/flight.ts (HEAD.sequence);
 *     scripts/video-to-frames.sh makes one from a short video of the head turning
 *  2. a single photo, public/portrait.jpg
 * The background is removed by colour: the average of the four corners is treated as backdrop,
 * so a plain studio or wall background works best.
 */
export interface Frame {
  pos: Float32Array // xyz per particle
  col: Float32Array // rgba per particle, a = mask
}

export interface PortraitSource {
  grid: number
  frames: HTMLImageElement[]
  fps: number
  sample: (img: HTMLImageElement) => Frame
}

const HEIGHT = 3.8

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function makeSampler(grid: number) {
  const c = document.createElement('canvas')
  c.width = c.height = grid
  const ctx = c.getContext('2d', { willReadFrequently: true })!

  return (img: HTMLImageElement): Frame => {
    // cover-fit the image into a square
    const s = Math.min(img.naturalWidth, img.naturalHeight)
    ctx.clearRect(0, 0, grid, grid)
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, grid, grid)
    const px = ctx.getImageData(0, 0, grid, grid).data

    // backdrop colour from the corners
    const corner = (x: number, y: number) => { const k = (y * grid + x) * 4; return [px[k], px[k + 1], px[k + 2]] }
    const cs = [corner(1, 1), corner(grid - 2, 1), corner(1, grid - 2), corner(grid - 2, grid - 2)]
    const bg = [0, 1, 2].map((i) => cs.reduce((a, c) => a + c[i], 0) / 4)

    const n = grid * grid
    const mask = new Float32Array(n)
    let minX = grid, maxX = 0, minY = grid, maxY = 0
    for (let i = 0; i < n; i++) {
      const k = i * 4
      const d = Math.hypot(px[k] - bg[0], px[k + 1] - bg[1], px[k + 2] - bg[2])
      const m = Math.min(1, Math.max(0, (d - 82) / 36))
      mask[i] = m
      if (m > 0.5) { const x = i % grid, y = (i / grid) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
    }
    const cx = (minX + maxX) / 2, rx = Math.max(1, (maxX - minX) / 2)
    const cy = minY + (maxY - minY) * 0.38, ry = Math.max(1, (maxY - minY) * 0.55)

    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 4)
    for (let j = 0; j < grid; j++) {
      for (let i = 0; i < grid; i++) {
        const idx = j * grid + i, k = idx * 4
        const r = px[k] / 255, g = px[k + 1] / 255, b = px[k + 2] / 255
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        // pseudo depth: a dome over the figure plus a little relief from brightness
        const q = 1 - ((i - cx) / rx) ** 2 - ((j - cy) / ry) ** 2
        const z = (q > 0 ? Math.sqrt(q) * 0.7 : 0) + (lum - 0.5) * 0.18
        pos[idx * 3] = (i / (grid - 1) - 0.5) * HEIGHT
        pos[idx * 3 + 1] = (0.5 - j / (grid - 1)) * HEIGHT
        pos[idx * 3 + 2] = z * mask[idx]
        col[k] = r; col[k + 1] = g; col[k + 2] = b; col[k + 3] = mask[idx]
      }
    }
    return { pos, col }
  }
}

export interface SequenceConfig { count: number; pattern: string; fps: number }

export async function loadPortrait(grid: number, base: string, photo: string, sequence: SequenceConfig | null): Promise<PortraitSource> {
  let frames: HTMLImageElement[] = []
  if (sequence) {
    const names = Array.from({ length: sequence.count }, (_, i) => sequence.pattern.replace('%04d', String(i + 1).padStart(4, '0')))
    frames = (await Promise.all(names.map((n) => loadImage(base + 'head-frames/' + n)))).filter(Boolean) as HTMLImageElement[]
  }
  if (!frames.length) {
    const img = await loadImage(base + photo)
    if (img) frames = [img]
  }
  if (!frames.length) throw new Error(`No portrait: add public/${photo} or a head-frames sequence`)
  return { grid, frames, fps: sequence?.fps ?? 24, sample: makeSampler(grid) }
}
