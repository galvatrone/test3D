import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import vert from '../shaders/grid.vert.glsl?raw'
import frag from '../shaders/grid.frag.glsl?raw'
import { flight } from '../lib/flightState'

const Z = 2.4

/** Curved shader grid floating over the head. Fades out as soon as the flight begins. */
export function HeroGrid() {
  const { viewport, camera } = useThree()
  const size = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, Z))
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        extensions: { derivatives: true } as never,
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2() },
          uOpacity: { value: 0.12 },
          uAspect: { value: 1 },
          uColor: { value: new THREE.Color('#6f82e8') },
        },
      }),
    [],
  )

  useFrame((state) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uMouse.value.set(flight.pointer.x, flight.pointer.y)
    u.uAspect.value = size.width / size.height
    u.uOpacity.value = 0.12 * Math.max(0, 1 - flight.progress / 0.05)
  })

  return (
    <mesh position={[0, 0, Z]} material={material} renderOrder={2}>
      <planeGeometry args={[size.width * 1.1, size.height * 1.1]} />
    </mesh>
  )
}
