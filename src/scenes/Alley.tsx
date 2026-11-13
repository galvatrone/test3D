import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'
import { QUALITY } from '../lib/quality'

/** Red alley: two rows of buildings, neon signs, wet asphalt. The contact form sits over the end of it. */
export function Alley() {
  const { from, to } = FLIGHT.scenes.alley
  const signs = useRef<THREE.Group>(null!)
  const lite = QUALITY.post === 'lite'
  const kicked = useRef<number[]>([])
  const clock = useThree((s) => s.clock)

  const blocks = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; shade: number }[] = []
    for (const side of [-1, 1]) {
      let z = from
      while (z > to) {
        const d = 2 + Math.random() * 3.5
        const h = 5 + Math.random() * 9
        const w = 2 + Math.random() * 1.5
        out.push({ pos: [side * (2.9 + w / 2), h / 2 - 2.6, z - d / 2], size: [w, h, d - 0.15], shade: 0.04 + Math.random() * 0.05 })
        z -= d
      }
    }
    return out
  }, [from, to])

  const signList = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const z = from - 3 - i * ((from - to - 8) / 14)
        return {
          pos: [side * 2.85, 0.4 + Math.random() * 3.5, z] as [number, number, number],
          size: [0.06, 0.25 + Math.random() * 0.9, 0.6 + Math.random() * 1.6] as [number, number, number],
          hot: Math.random() > 0.35,
          flicker: Math.random(),
        }
      }),
    [from, to],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    signs.current.children.forEach((m, i) => {
      const s = signList[i]
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial
      // a few signs stutter like old neon
      const since = t - (kicked.current[i] ?? -99)
      const kick = since < 1.4 ? (Math.sin(since * 60) > 0 ? 1.6 : 0.1) : 1
      const on = (s.flicker > 0.8 ? (Math.sin(t * 23 + i) > -0.6 ? 1 : 0.25) : 1) * kick
      mat.color.setRGB((s.hot ? 4 : 2.2) * on, (s.hot ? 0.25 : 0.5) * on, (s.hot ? 0.35 : 0.9) * on)
    })
  })

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={new THREE.Color(b.shade * 1.4, b.shade * 0.7, b.shade * 0.75)} roughness={0.8} />
        </mesh>
      ))}
      <group ref={signs}>
        {signList.map((s, i) => (
          <mesh
            key={i}
            position={s.pos}
            onClick={(e) => { e.stopPropagation(); kicked.current[i] = clock.elapsedTime }}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = '' }}
          >
            <boxGeometry args={s.size} />
            <meshBasicMaterial toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* end of the alley: a dark wall with a neon doorway the camera drifts toward */}
      <group position={[0, 0, to + 4]}>
        <mesh position={[0, 4, -0.2]}>
          <planeGeometry args={[6, 14]} />
          <meshStandardMaterial color="#0b0405" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, -0.1]}>
          <planeGeometry args={[2.2, 3.6]} />
          <meshBasicMaterial color={[0.5, 0.02, 0.05]} toneMapped={false} />
        </mesh>
        {[
          [0, 2.2, 2.3, 0.05],
          [0, -1.4, 2.3, 0.05],
          [-1.13, 0.4, 0.05, 3.65],
          [1.13, 0.4, 0.05, 3.65],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.05]} />
            <meshBasicMaterial color={[5, 0.3, 0.45]} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {[0.15, 0.45, 0.75].map((f) => (
        <pointLight key={f} position={[0, 3, from - (from - to) * f]} color="#ff2f43" intensity={40} distance={18} decay={2} />
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.6, (from + to) / 2]}>
        <planeGeometry args={[6, from - to]} />
        {lite ? (
          <meshStandardMaterial color="#0a0506" roughness={0.15} metalness={0.8} />
        ) : (
          <MeshReflectorMaterial
            resolution={512}
            mirror={0.6}
            mixBlur={6}
            mixStrength={3}
            blur={[300, 80]}
            roughness={0.85}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0d0607"
            metalness={0.6}
          />
        )}
      </mesh>
    </group>
  )
}
