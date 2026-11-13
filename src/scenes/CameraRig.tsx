import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'
import { flight } from '../lib/flightState'
import { DEBUG } from '../lib/debug'

export const flightCurve = new THREE.CatmullRomCurve3(
  FLIGHT.path.map((p) => new THREE.Vector3(...p)),
  false,
  'centripetal',
)

/** Curve position (0..1) closest to a world point. */
function curveU(p: THREE.Vector3, samples = 1200) {
  let best = 0, bestD = Infinity
  const v = new THREE.Vector3()
  for (let i = 0; i <= samples; i++) {
    flightCurve.getPointAt(i / samples, v)
    const d = v.distanceToSquared(p)
    if (d < bestD) { bestD = d; best = i / samples }
  }
  return best
}

/** Scroll anchor -> curve position pairs, sorted by anchor. */
const STATIONS = (Object.keys(FLIGHT.anchors) as (keyof typeof FLIGHT.anchors)[])
  .map((k) => ({ a: FLIGHT.anchors[k] as number, u: curveU(new THREE.Vector3(...FLIGHT.stations[k])) }))
  .sort((x, y) => x.a - y.a)
STATIONS[0].u = 0
STATIONS[STATIONS.length - 1].u = 1

/** Piecewise-linear map from scroll progress to curve position, smoothed inside each segment. */
export function scrollToCurve(p: number) {
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const s = STATIONS[i], e = STATIONS[i + 1]
    if (p <= e.a) {
      const t = (p - s.a) / Math.max(1e-6, e.a - s.a)
      return s.u + (e.u - s.u) * t
    }
  }
  return 1
}

/** Moves the camera along the spline. Progress comes from scroll; a small pointer sway adds life. */
export function CameraRig() {
  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const sway = useMemo(() => new THREE.Vector2(), [])
  const prev = useMemo(() => ({ p: 0 }), [])

  useFrame(({ camera }, dt) => {
    if (DEBUG.progress !== null) flight.progress = DEBUG.progress
    const sp = Math.min(1, Math.max(0, flight.progress))
    const p = scrollToCurve(sp)
    flightCurve.getPointAt(p, pos)
    flightCurve.getPointAt(Math.min(1, p + FLIGHT.lookAhead), look)
    if (p >= 1 - FLIGHT.lookAhead) look.set(pos.x, pos.y, pos.z - 1)

    sway.x += (flight.pointer.x * 0.18 - sway.x) * Math.min(1, dt * 2.5)
    sway.y += (flight.pointer.y * 0.12 - sway.y) * Math.min(1, dt * 2.5)
    camera.position.set(pos.x + sway.x, pos.y + sway.y, pos.z)
    camera.lookAt(look)

    // speed of the flight drives the transition distortion
    const v = dt > 0 ? (sp - prev.p) / dt : 0
    prev.p = sp
    flight.velocity += (v - flight.velocity) * Math.min(1, dt * 6)
    const target = Math.min(1, Math.abs(flight.velocity) / FLIGHT.velocityForFullDistortion)
    flight.distortion += (target - flight.distortion) * Math.min(1, dt * 5)
  })
  return null
}
