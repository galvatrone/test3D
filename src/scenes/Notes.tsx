import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'

/** Ruled paper texture drawn once on a canvas. */
function paperTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 340
  const g = c.getContext('2d')!
  g.fillStyle = '#efe8da'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = 'rgba(70, 90, 160, 0.28)'
  g.lineWidth = 1.2
  for (let y = 46; y < c.height - 14; y += 16) {
    g.beginPath(); g.moveTo(18, y); g.lineTo(c.width - 18, y); g.stroke()
  }
  g.strokeStyle = 'rgba(200, 60, 60, 0.35)'
  g.beginPath(); g.moveTo(40, 0); g.lineTo(40, c.height); g.stroke()
  // a few lines of "handwriting"
  g.strokeStyle = 'rgba(30, 30, 40, 0.55)'
  g.lineWidth = 1.4
  for (let row = 0; row < 9; row++) {
    const y = 42 + row * 16
    let x = 48
    const end = 48 + 120 + Math.random() * 70
    g.beginPath(); g.moveTo(x, y)
    while (x < end) { x += 4 + Math.random() * 5; g.lineTo(x, y - 2 - Math.random() * 5) }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The side room the path turns into: sheets of notes hanging in warm light. */
export function Notes() {
  const { x, z } = FLIGHT.scenes.notes
  const sheets = useRef<THREE.Group>(null!)
  const textures = useMemo(() => Array.from({ length: 5 }, paperTexture), [])
  const layout = useMemo(
    () =>
      textures.map((_, i) => ({
        pos: [x + 1.5 - (i % 2) * 1.2, 0.9 + ((i * 53) % 7) * 0.18, z - 1.4 - i * 1.25] as [number, number, number],
        rotY: Math.PI / 2 + (i % 2 ? -0.35 : 0.25),
        phase: i * 1.7,
      })),
    [textures, x, z],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    sheets.current.children.forEach((s, i) => {
      s.rotation.y = layout[i].rotY + Math.sin(t * 0.5 + layout[i].phase) * 0.12
      s.rotation.z = Math.sin(t * 0.7 + layout[i].phase) * 0.03
    })
  })

  return (
    <group>
      <group ref={sheets}>
        {layout.map((l, i) => (
          <group key={i} position={l.pos} rotation={[0, l.rotY, 0]}>
            <mesh>
              <planeGeometry args={[1.25, 1.66]} />
              <meshStandardMaterial map={textures[i]} side={THREE.DoubleSide} roughness={0.9} emissive="#3a2a12" emissiveIntensity={0.25} />
            </mesh>
            {/* the thread it hangs from */}
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 3.6, 4]} />
              <meshBasicMaterial color="#8c7a5a" />
            </mesh>
          </group>
        ))}
      </group>
      {/* a warm lamp over the room */}
      <pointLight position={[x + 1, 4, z - 3]} color="#ffcf8a" intensity={60} distance={18} decay={2} />
      <mesh position={[x + 1, 4.3, z - 3]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={[4, 3, 1.6]} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[x, -2.6, z - 3]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#120d08" roughness={0.8} />
      </mesh>
    </group>
  )
}
