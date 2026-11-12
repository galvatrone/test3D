import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'
import { QUALITY } from '../lib/quality'

const RADIUS = 3.4

/** Procedural tunnel: a ring of boxes per step, irregular depth, with sodium lights running away from the camera. */
export function Tunnel() {
  const { from, to } = FLIGHT.scenes.tunnel
  const walls = useRef<THREE.InstancedMesh>(null!)
  const lights = useRef<THREE.InstancedMesh>(null!)

  const { count, matrices, colors } = useMemo(() => {
    const m: THREE.Matrix4[] = []
    const c: THREE.Color[] = []
    const o = new THREE.Object3D()
    const length = from - to
    const rings = Math.floor(QUALITY.tunnelBoxes / 18)
    const step = length / rings
    for (let r = 0; r < rings; r++) {
      const z = from - r * step
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2 + (r % 2) * 0.17
        if (Math.sin(a) < -0.85) continue // leave the floor open
        const depth = 0.4 + Math.random() * 1.4
        const rr = RADIUS + depth * 0.5 + Math.random() * 0.2
        o.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.8, z + (Math.random() - 0.5) * step * 0.4)
        o.rotation.set(0, 0, a)
        o.scale.set(depth, 0.9 + Math.random() * 0.9, step * (0.6 + Math.random() * 0.7))
        o.updateMatrix()
        m.push(o.matrix.clone())
        const v = 0.05 + Math.random() * 0.07
        c.push(new THREE.Color(v * 1.1, v, v * 0.9))
      }
    }
    return { count: m.length, matrices: m, colors: c }
  }, [from, to])

  const lightCount = 64
  const lightSeeds = useMemo(
    () => Array.from({ length: lightCount }, (_, i) => ({ a: (i % 8) / 8 * Math.PI * 2 + 0.2, phase: Math.random(), speed: 3 + Math.random() * 4 })),
    [],
  )

  useLayoutEffect(() => {
    matrices.forEach((mat, i) => {
      walls.current.setMatrixAt(i, mat)
      walls.current.setColorAt(i, colors[i])
    })
    walls.current.instanceMatrix.needsUpdate = true
    if (walls.current.instanceColor) walls.current.instanceColor.needsUpdate = true
  }, [matrices, colors])

  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const length = from - to
    lightSeeds.forEach((s, i) => {
      // lights travel down the tunnel, away from the camera, and wrap around
      const d = ((s.phase * length + t * s.speed) % length)
      const r = RADIUS - 0.05
      o.position.set(Math.cos(s.a) * r, Math.sin(s.a) * r * 0.8, from - d)
      o.rotation.set(0, 0, s.a)
      o.scale.set(0.05, 0.05, 0.9)
      o.updateMatrix()
      lights.current.setMatrixAt(i, o.matrix)
    })
    lights.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={walls} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.55} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, lightCount]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={[3.2, 1.9, 0.6]} toneMapped={false} />
      </instancedMesh>
      {/* a few warm lights so the walls catch some colour */}
      {[0.2, 0.5, 0.8].map((f) => (
        <pointLight key={f} position={[0, 1.6, from - (from - to) * f]} color="#ffb547" intensity={22} distance={16} decay={2} />
      ))}
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.6, (from + to) / 2]}>
        <planeGeometry args={[9, from - to + 6]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}
