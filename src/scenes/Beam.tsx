import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import vert from '../shaders/beam.vert.glsl?raw'
import frag from '../shaders/beam.frag.glsl?raw'
import { FLIGHT } from '../config/flight'

const HEIGHT = 9

/** A single shaft of light falling through fog, with dust drifting in it. */
export function Beam() {
  const z = FLIGHT.scenes.beam.z
  const dust = useRef<THREE.Points>(null!)
  const spot = useRef<THREE.SpotLight>(null!)
  const { gl, camera } = useThree()
  const hold = useRef({ down: false, v: 0, spin: 0 })

  // press and hold near the beam: the light swells and the dust speeds up
  useEffect(() => {
    const el = gl.domElement
    const down = () => { if (Math.abs(camera.position.z - z) < 16) hold.current.down = true }
    const up = () => { hold.current.down = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl, camera, z])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#b9c6ff') }, uHeight: { value: HEIGHT } },
      }),
    [],
  )

  const dustGeo = useMemo(() => {
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const y = (Math.random() - 0.5) * HEIGHT
      const r = Math.random() * (0.4 + ((HEIGHT / 2 - y) / HEIGHT) * 1.6)
      const a = Math.random() * Math.PI * 2
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  const base = useMemo(() => new THREE.Color('#b9c6ff'), [])
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const h = hold.current
    h.v += ((h.down ? 1 : 0) - h.v) * Math.min(1, dt * (h.down ? 1.6 : 3))
    h.spin += dt * (0.05 + h.v * 1.2)
    material.uniforms.uTime.value = t * (1 + h.v * 2)
    material.uniforms.uColor.value.copy(base).multiplyScalar(1 + h.v * 2.2)
    dust.current.rotation.y = h.spin
    dust.current.position.y = Math.sin(t * 0.3) * 0.15
    if (spot.current) spot.current.intensity = 180 + h.v * 420
  })

  // the cone shader ignores fog, so only show the beam once the camera is close
  const root = useRef<THREE.Group>(null!)
  useFrame(({ camera: c }) => { root.current.visible = c.position.z < z + 34 })

  return (
    <group ref={root} position={[0.2, 1.8, z]}>
      <mesh material={material}>
        <cylinderGeometry args={[0.35, 2.2, HEIGHT, 48, 1, true]} />
      </mesh>
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial size={0.035} color={[2.4, 2.6, 3.2]} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </points>
      {/* the pool of light on the floor */}
      <spotLight ref={spot} position={[0, HEIGHT / 2, 0]} angle={0.42} penumbra={0.8} intensity={180} distance={20} color="#c7d1ff" target-position={[0.2, -10, z]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -HEIGHT / 2 + 0.01, 0]}>
        <circleGeometry args={[2.4, 48]} />
        <meshBasicMaterial color={[0.5, 0.56, 0.8]} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -HEIGHT / 2, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#07080c" roughness={0.6} />
      </mesh>
      {/* the fixture the light comes from */}
      <mesh position={[0, HEIGHT / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 32]} />
        <meshBasicMaterial color={[3, 3.2, 4]} toneMapped={false} />
      </mesh>
    </group>
  )
}
