import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'

/**
 * Fog and background change with the camera's depth, so every scene has its own air:
 * clear ink at the head, sodium haze in the tunnel, blue mist at the beam, red smog in the alley.
 */
const STOPS = [
  { z: 8, color: '#06070d', near: 9, far: 19 },
  { z: FLIGHT.scenes.gallery.z, color: '#07080f', near: 8, far: 40 },
  { z: FLIGHT.scenes.tunnel.from - 6, color: '#120b05', near: 3, far: 26 },
  { z: FLIGHT.scenes.beam.z, color: '#060915', near: 2, far: 22 },
  { z: FLIGHT.scenes.notes.z, color: '#140f0a', near: 3, far: 24 },
  { z: FLIGHT.scenes.alley.from - 8, color: '#1a0306', near: 2, far: 26 },
]

export function Atmosphere() {
  const { scene, camera } = useThree()
  const fog = useMemo(() => new THREE.Fog('#06070d', 9, 19), [])
  const cols = useMemo(() => STOPS.map((s) => new THREE.Color(s.color)), [])
  const bg = useMemo(() => new THREE.Color(), [])
  scene.fog = fog

  useFrame(() => {
    const z = camera.position.z
    let i = 0
    while (i < STOPS.length - 2 && z < STOPS[i + 1].z) i++
    const a = STOPS[i], b = STOPS[i + 1]
    const t = THREE.MathUtils.clamp((a.z - z) / (a.z - b.z), 0, 1)
    const s = t * t * (3 - 2 * t)
    fog.color.copy(cols[i]).lerp(cols[i + 1], s)
    fog.near = THREE.MathUtils.lerp(a.near, b.near, s)
    fog.far = THREE.MathUtils.lerp(a.far, b.far, s)
    bg.copy(fog.color)
    scene.background = bg
  })
  return null
}
