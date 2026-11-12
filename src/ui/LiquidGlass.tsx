/**
 * Liquid glass surface for HTML UI over the live WebGL scene.
 *
 * Adapted from dashersw/liquid-glass-js (MIT, https://github.com/dashersw/liquid-glass-js).
 * That library refracts a static html2canvas snapshot of the page in its own WebGL context
 * per element, which cannot see a live three.js canvas and gets heavy with many panels.
 * Here the same idea runs in the compositor instead: the rounded-rect SDF edge refraction
 * becomes a displacement map fed to an SVG filter used by backdrop-filter, so the glass
 * bends whatever is rendered behind it, every frame, with no extra GL context.
 * Browsers without SVG backdrop filters fall back to a plain frosted blur.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

function displacementMap(w: number, h: number, r: number, band: number): string {
  const s = 0.5 // half resolution is enough for a smooth map
  const W = Math.max(2, Math.round(w * s))
  const H = Math.max(2, Math.round(h * s))
  const R = r * s
  const B = band * s
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const hw = W / 2, hh = H / 2
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // signed distance to the rounded rectangle (negative inside)
      const px = x + 0.5 - hw, py = y + 0.5 - hh
      const qx = Math.abs(px) - (hw - R), qy = Math.abs(py) - (hh - R)
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0)
      const d = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - R
      // outward normal of the nearest edge
      let nx = 0, ny = 0
      if (qx > 0 || qy > 0) { const l = Math.hypot(ox, oy) || 1; nx = (ox / l) * Math.sign(px); ny = (oy / l) * Math.sign(py) }
      else if (qx > qy) nx = Math.sign(px)
      else ny = Math.sign(py)
      const t = Math.min(1, Math.max(0, 1 + d / B)) // 0 in the middle, 1 at the rim
      const m = t * t * t
      const i = (y * W + x) * 4
      img.data[i] = 128 - nx * m * 127
      img.data[i + 1] = 128 - ny * m * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

export function LiquidGlass({
  children,
  radius = 24,
  strength = 46,
  className = '',
}: {
  children: ReactNode
  radius?: number
  strength?: number
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [map, setMap] = useState('')

  useEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height)
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!size.w || !size.h) return
    setMap(displacementMap(size.w, size.h, radius, Math.min(28, Math.min(size.w, size.h) * 0.3)))
  }, [size.w, size.h, radius])

  return (
    <div
      ref={ref}
      className={`lg ${className}`}
      style={{ borderRadius: radius, ['--lg-filter' as string]: map ? `url(#lg-${id})` : 'none' }}
    >
      {map && (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id={`lg-${id}`} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} result="map" preserveAspectRatio="none" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="soft" />
            <feDisplacementMap in="soft" in2="map" scale={strength} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      {children}
    </div>
  )
}
