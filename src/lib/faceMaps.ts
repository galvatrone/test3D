/**
 * Face data for the cube head.
 *
 * Reads /face-depth.png (white = closest to the viewer, black = background) and
 * /face-color.png from /public. If either is missing, a procedural stand-in face is generated,
 * so the hero always renders. Both maps are a front view of the face.
 */
export interface FaceData {
  /** Number of cubes. */
  count: number
  /** xy = position on the face plane (world units), z = relief height (world units). */
  offsets: Float32Array
  colors: Float32Array
  /** Surface normal of the face at each cube (from the depth gradient). */
  normals: Float32Array
  /** How far each cube reaches behind the face plane (skull volume, so the profile is a full head). */
  backs: Float32Array
  rand: Float32Array
  cell: number
  /** Highest relief value, used to normalise brightness in the shader. */
  maxDepth: number
  source: 'image' | 'procedural'
}

const HEAD_HEIGHT = 3.3
const MAX_RELIEF = 1.35

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function readPixels(img: HTMLImageElement, n: number): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = n
  c.height = n
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, n, n)
  return ctx.getImageData(0, 0, n, n).data
}

const g = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-((x - cx) ** 2 / (2 * sx * sx) + (y - cy) ** 2 / (2 * sy * sy)))

/** Cheap value noise for the hair texture. */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Procedural front-view face. u, v in -1..1 (v up).
 * Returns relief 0..1 (0 = outside the head) and a colour.
 */
function proceduralSample(u: number, v: number): { d: number; r: number; gC: number; b: number } {
  const hx = u / 0.6
  const hy = (v - 0.14) / 0.8
  const r2 = hx * hx + hy * hy
  const inNeck = Math.abs(u) < 0.27 && v < -0.48 && v > -1
  if (r2 > 1 && !inNeck) return { d: 0, r: 0, gC: 0, b: 0 }

  let d = r2 <= 1 ? Math.sqrt(1 - r2) * 0.56 : 0
  if (inNeck && r2 > 1) {
    const nx = u / 0.27
    d = Math.max(d, Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.32 * Math.min(1, (v + 1.05) / 0.4))
  }

  // features
  d += 0.15 * g(u, v, 0, -0.04, 0.06, 0.14) + 0.07 * g(u, v, 0, -0.19, 0.08, 0.05) // nose
  d += 0.07 * g(u, v, 0, 0.26, 0.36, 0.05) // brow ridge
  d -= 0.1 * (g(u, v, -0.21, 0.13, 0.085, 0.05) + g(u, v, 0.21, 0.13, 0.085, 0.05)) // eye sockets
  d += 0.035 * (g(u, v, -0.21, 0.12, 0.045, 0.028) + g(u, v, 0.21, 0.12, 0.045, 0.028)) // eyes
  d += 0.05 * (g(u, v, -0.33, -0.12, 0.1, 0.1) + g(u, v, 0.33, -0.12, 0.1, 0.1)) // cheekbones
  d += 0.06 * g(u, v, 0, -0.4, 0.14, 0.04) - 0.035 * g(u, v, 0, -0.415, 0.13, 0.009) // lips
  d += 0.06 * g(u, v, 0, -0.61, 0.13, 0.07) // chin
  const sm = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
  const hairMask = Math.max(sm(0.34, 0.5, v), sm(0.44, 0.56, Math.abs(u)) * sm(-0.05, 0.15, v))
  d += hairMask * ((hash(Math.floor(u * 60), Math.floor(v * 60)) - 0.5) * 0.05 + 0.03)

  d = Math.max(0.02, Math.min(1, d))

  // colour: bone skin, ion-blue hair, warm lips, dark eyes
  const n = hash(Math.floor(u * 40), Math.floor(v * 40))
  let r = 0.93 + (0.3 + n * 0.12 - 0.93) * hairMask
  let gC = 0.89 + (0.34 + n * 0.12 - 0.89) * hairMask
  let b = 0.83 + (0.62 + n * 0.2 - 0.83) * hairMask
  const lip = g(u, v, 0, -0.41, 0.12, 0.03)
  r = r * (1 - lip) + 0.95 * lip; gC = gC * (1 - lip) + 0.48 * lip; b = b * (1 - lip) + 0.46 * lip
  const eye = g(u, v, -0.21, 0.12, 0.05, 0.03) + g(u, v, 0.21, 0.12, 0.05, 0.03)
  r -= eye * 0.45; gC -= eye * 0.42; b -= eye * 0.25
  return { d, r, gC, b }
}

export async function loadFace(grid: number, baseUrl: string): Promise<FaceData> {
  const [depthImg, colorImg] = await Promise.all([
    loadImage(baseUrl + 'face-depth.png'),
    loadImage(baseUrl + 'face-color.png'),
  ])
  const useImage = !!depthImg
  const depthPx = depthImg ? readPixels(depthImg, grid) : null
  const colorPx = colorImg ? readPixels(colorImg, grid) : null

  const cell = HEAD_HEIGHT / grid
  const raw = new Float32Array(grid * grid)
  const colGrid = new Float32Array(grid * grid * 3)

  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const u = (i / (grid - 1)) * 2 - 1
      const v = 1 - (j / (grid - 1)) * 2
      const idx = j * grid + i
      let d = 0, r = 0, gC = 0, b = 0
      if (depthPx) {
        const k = idx * 4
        d = depthPx[k] / 255
        if (d < 0.04) d = 0
        if (colorPx) { r = colorPx[k] / 255; gC = colorPx[k + 1] / 255; b = colorPx[k + 2] / 255 }
        else { r = gC = b = 0.6 + d * 0.4 }
      } else {
        const s = proceduralSample(u, v)
        d = s.d; r = s.r; gC = s.gC; b = s.b
      }
      raw[idx] = d * MAX_RELIEF
      colGrid[idx * 3] = r; colGrid[idx * 3 + 1] = gC; colGrid[idx * 3 + 2] = b
    }
  }

  // fit an ellipse to the head mask and use it as the back of the skull
  let minU = 1, maxU = -1, minV = 1, maxV = -1
  for (let j = 0; j < grid; j++) for (let i = 0; i < grid; i++) {
    if (raw[j * grid + i] <= 0) continue
    const u = (i / (grid - 1)) * 2 - 1, v = 1 - (j / (grid - 1)) * 2
    minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v)
  }
  const ecx = (minU + maxU) / 2, erx = (maxU - minU) / 2
  const ecy = minV + (maxV - minV) * 0.6, ery = (maxV - minV) * 0.5
  const backAt = (u: number, v: number) => {
    const q = 1 - ((u - ecx) / erx) ** 2 - ((v - ecy) / ery) ** 2
    const skull = q > 0 ? Math.pow(q, 0.5) * MAX_RELIEF * 1.2 : 0
    const neck = v < ecy - ery * 0.7 ? MAX_RELIEF * 0.3 * Math.max(0, 1 - Math.abs((u - ecx) / (erx * 0.5))) : 0
    return Math.max(skull, neck, cell)
  }

  const at = (i: number, j: number) => raw[Math.min(grid - 1, Math.max(0, j)) * grid + Math.min(grid - 1, Math.max(0, i))]
  const offs: number[] = []
  const cols: number[] = []
  const norms: number[] = []
  const rnd: number[] = []
  const backs: number[] = []
  let maxDepth = 0
  const step = cell * 1.6

  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const idx = j * grid + i
      const rv = raw[idx]
      if (rv <= 0) continue
      // surface normal from the smooth relief (before terracing), so light follows the face shape
      const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * cell)
      const dy = (at(i, j - 1) - at(i, j + 1)) / (2 * cell)
      const len = Math.hypot(dx, dy, 1)
      norms.push(-dx / len, -dy / len, 1 / len)
      const relief = Math.max(step, Math.round(rv / step) * step)
      maxDepth = Math.max(maxDepth, relief)
      const u = (i / (grid - 1)) * 2 - 1
      const v = 1 - (j / (grid - 1)) * 2
      offs.push(u * HEAD_HEIGHT * 0.5, v * HEAD_HEIGHT * 0.5, relief)
      backs.push(Math.round(backAt(u, v) / step) * step)
      cols.push(colGrid[idx * 3], colGrid[idx * 3 + 1], colGrid[idx * 3 + 2])
      rnd.push(Math.random())
    }
  }

  return {
    count: rnd.length,
    offsets: new Float32Array(offs),
    colors: new Float32Array(cols),
    normals: new Float32Array(norms),
    backs: new Float32Array(backs),
    rand: new Float32Array(rnd),
    cell,
    maxDepth,
    source: useImage ? 'image' : 'procedural',
  }
}

/**
 * Renders the procedural stand-in face to two PNG data URLs (depth + colour).
 * Used once to produce public/face-depth.png and public/face-color.png; also handy as a template
 * for the framing a real scan should follow. In dev: window.__exportFaceMaps(512).
 */
export function exportProceduralMaps(size = 512): { depth: string; color: string } {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c }
  const dc = mk(), cc = mk()
  const dctx = dc.getContext('2d')!, cctx = cc.getContext('2d')!
  const di = dctx.createImageData(size, size), ci = cctx.createImageData(size, size)
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i / (size - 1)) * 2 - 1, v = 1 - (j / (size - 1)) * 2
    const s = proceduralSample(u, v), k = (j * size + i) * 4
    const d = Math.round(Math.min(1, s.d) * 255)
    di.data[k] = di.data[k + 1] = di.data[k + 2] = d; di.data[k + 3] = 255
    ci.data[k] = Math.round(Math.max(0, s.r) * 255); ci.data[k + 1] = Math.round(Math.max(0, s.gC) * 255)
    ci.data[k + 2] = Math.round(Math.max(0, s.b) * 255); ci.data[k + 3] = 255
  }
  dctx.putImageData(di, 0, 0); cctx.putImageData(ci, 0, 0)
  return { depth: dc.toDataURL('image/png'), color: cc.toDataURL('image/png') }
}

if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __exportFaceMaps: exportProceduralMaps })
