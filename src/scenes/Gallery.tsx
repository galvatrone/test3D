import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, RoundedBox, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import projects from '../data/projects.json'
import { FLIGHT } from '../config/flight'
import { flight } from '../lib/flightState'
import { QUALITY } from '../lib/quality'

const W = 3.2
const H = 2.0

/**
 * Three project cards floating beside the flight path.
 * Each card is the project screenshot inside a liquid-glass frame (MeshTransmissionMaterial).
 */
export function Gallery() {
  const urls = projects.map((p) => import.meta.env.BASE_URL + p.image)
  const textures = useTexture(urls)
  textures.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
  })

  const z0 = FLIGHT.scenes.gallery.z
  // cards alternate sides and step down the path so the camera passes each one
  const layout = useMemo(
    () =>
      projects.map((_, i) => {
        const z = z0 + 4 - i * 4.2
        const side = i % 2 === 0 ? -1 : 1
        return {
          position: new THREE.Vector3(side * 2.1, 0.35 + (i === 1 ? 0.5 : 0), z),
          rotationY: side * -0.38,
        }
      }),
    [z0],
  )

  return (
    <group>
      {projects.map((p, i) => (
        <Card key={p.id} texture={textures[i]} tint={p.tint} {...layout[i]} index={i} />
      ))}
    </group>
  )
}

function Card({
  texture,
  tint,
  position,
  rotationY,
  index,
}: {
  texture: THREE.Texture
  tint: string
  position: THREE.Vector3
  rotationY: number
  index: number
}) {
  const ref = useRef<THREE.Group>(null!)
  const lite = QUALITY.post === 'lite'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // a slow drift, like objects hanging in still air
    ref.current.position.y = position.y + Math.sin(t * 0.6 + index * 2) * 0.06
    ref.current.rotation.y = rotationY + Math.sin(t * 0.4 + index) * 0.03 + flight.pointer.x * 0.05
  })

  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      {/* the screenshot */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* liquid glass frame: a rounded glass slab behind the screenshot, visible as a refracting border */}
      <RoundedBox args={[W + 0.36, H + 0.36, 0.14]} radius={0.16} smoothness={4} position={[0, 0, -0.09]}>
        {lite ? (
          <meshPhysicalMaterial transmission={1} roughness={0.08} thickness={0.4} ior={1.35} color={tint} transparent opacity={0.35} />
        ) : (
          <MeshTransmissionMaterial
            samples={6}
            resolution={512}
            thickness={0.35}
            roughness={0.04}
            ior={1.32}
            chromaticAberration={0.18}
            anisotropy={0.2}
            distortion={0.35}
            distortionScale={0.4}
            temporalDistortion={0.08}
            color={tint}
            attenuationColor={tint}
            attenuationDistance={2.5}
            backside={false}
          />
        )}
      </RoundedBox>
      {/* thin emissive edge so the frame catches bloom */}
      <mesh position={[0, -H / 2 - 0.2, 0.02]}>
        <planeGeometry args={[W * 0.4, 0.012]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
    </group>
  )
}
