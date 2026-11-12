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

/** Moves the camera along the spline. Progress comes from scroll; a small pointer sway adds life. */
export function CameraRig() {
  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const sway = useMemo(() => new THREE.Vector2(), [])
  const prev = useMemo(() => ({ p: 0 }), [])

  useFrame(({ camera }, dt) => {
    if (DEBUG.progress !== null) flight.progress = DEBUG.progress
    const p = Math.min(1, Math.max(0, flight.progress))
    flightCurve.getPointAt(p, pos)
    flightCurve.getPointAt(Math.min(1, p + FLIGHT.lookAhead), look)
    if (p >= 1 - FLIGHT.lookAhead) look.set(pos.x, pos.y, pos.z - 1)

    sway.x += (flight.pointer.x * 0.18 - sway.x) * Math.min(1, dt * 2.5)
    sway.y += (flight.pointer.y * 0.12 - sway.y) * Math.min(1, dt * 2.5)
    camera.position.set(pos.x + sway.x, pos.y + sway.y, pos.z)
    camera.lookAt(look)

    // speed of the flight drives the transition distortion
    const v = dt > 0 ? (p - prev.p) / dt : 0
    prev.p = p
    flight.velocity += (v - flight.velocity) * Math.min(1, dt * 6)
    const target = Math.min(1, Math.abs(flight.velocity) / FLIGHT.velocityForFullDistortion)
    flight.distortion += (target - flight.distortion) * Math.min(1, dt * 5)
  })
  return null
}
