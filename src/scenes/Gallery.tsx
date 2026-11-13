import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTexture, RoundedBox, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import allProjects from '../data/projects.json'
import { FLIGHT } from '../config/flight'
import { flight } from '../lib/flightState'
import { QUALITY } from '../lib/quality'
import { projectImage } from '../lib/assets'

type Project = (typeof allProjects)[number]
const featured = allProjects.filter((p) => p.featured) as (Project & { image: string; tint: string })[]

/** Cards only react once the flight has left the hero, otherwise clicks on the portrait would reach them. */
const live = () => flight.progress > 0.035

const W = 3.0
const H = 1.875

/**
 * Featured projects as cards along the path, alternating sides.
 * Hover tilts the card toward the pointer and lights its frame; click opens the project panel.
 */
export function Gallery() {
  const textures = useTexture(featured.map((p) => projectImage(p.image)))
  textures.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
  })

  const z0 = FLIGHT.scenes.gallery.z
  const layout = useMemo(
    () =>
      featured.map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        return {
          position: new THREE.Vector3(side * 2.25, 0.25 + ((i * 37) % 5) * 0.12, z0 + 6 - i * 3.3),
          rotationY: side * -0.42,
        }
      }),
    [z0],
  )

  // glass ignores fog, so keep the cards hidden until the flight leaves the hero
  const root = useRef<THREE.Group>(null!)
  useFrame(() => { root.current.visible = flight.progress > 0.035 })

  return (
    <group ref={root}>
      {featured.map((p, i) => (
        <Card key={p.id} id={p.id} texture={textures[i]} tint={p.tint} index={i} {...layout[i]} />
      ))}
    </group>
  )
}

function Card({
  id,
  texture,
  tint,
  position,
  rotationY,
  index,
}: {
  id: string
  texture: THREE.Texture
  tint: string
  position: THREE.Vector3
  rotationY: number
  index: number
}) {
  const ref = useRef<THREE.Group>(null!)
  const edge = useRef<THREE.MeshBasicMaterial>(null!)
  const [hovered, setHovered] = useState(false)
  const local = useRef(new THREE.Vector2())
  const hover = useRef(0)
  const lite = QUALITY.post === 'lite'
  const tintColor = useMemo(() => new THREE.Color(tint), [tint])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    hover.current += ((hovered ? 1 : 0) - hover.current) * Math.min(1, dt * 8)
    const h = hover.current
    ref.current.position.y = position.y + Math.sin(t * 0.6 + index * 2) * 0.06
    ref.current.rotation.y = rotationY * (1 - h * 0.6) + local.current.x * 0.25 * h + flight.pointer.x * 0.04
    ref.current.rotation.x = -local.current.y * 0.18 * h
    ref.current.scale.setScalar(1 + h * 0.05)
    edge.current.color.copy(tintColor).multiplyScalar(1 + h * 3)
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const p = e.object.worldToLocal(e.point.clone())
    local.current.set(p.x / (W / 2), p.y / (H / 2))
  }

  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      <mesh
        position={[0, 0, 0.002]}
        onPointerOver={(e) => {
          if (!live()) return
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
        onPointerMove={onMove}
        onClick={(e) => {
          if (!live()) return
          e.stopPropagation()
          window.dispatchEvent(new CustomEvent('project:open', { detail: id }))
        }}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* liquid glass frame behind the image, visible as a refracting border */}
      <RoundedBox args={[W + 0.36, H + 0.36, 0.14]} radius={0.16} smoothness={4} position={[0, 0, -0.09]}>
        {lite ? (
          <meshPhysicalMaterial transmission={1} roughness={0.08} thickness={0.4} ior={1.35} color={tint} transparent opacity={0.35} />
        ) : (
          <MeshTransmissionMaterial
            samples={5}
            resolution={384}
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
      {/* glowing underline that brightens on hover */}
      <mesh position={[0, -H / 2 - 0.22, 0.02]}>
        <planeGeometry args={[W * 0.5, 0.014]} />
        <meshBasicMaterial ref={edge} color={tint} toneMapped={false} />
      </mesh>
    </group>
  )
}
