import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { suspend } from 'suspend-react'
import * as THREE from 'three'
import gsap from 'gsap'
import vert from '../shaders/head.vert.glsl?raw'
import frag from '../shaders/head.frag.glsl?raw'
import { loadFace } from '../lib/faceMaps'
import { flight } from '../lib/flightState'
import { FLIGHT } from '../config/flight'
import { QUALITY, prefersReducedMotion, isMobile } from '../lib/quality'
import { DEBUG } from '../lib/debug'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Head of ~20–40k cubes. Turns from profile to the front on load and scatters as the flight starts. */
export function Head() {
  const face = suspend(() => loadFace(QUALITY.faceGrid, import.meta.env.BASE_URL), ['face', QUALITY.faceGrid])
  const group = useRef<THREE.Group>(null!)
  const mouse = useRef({ x: 0, y: 0, s: 0 })

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(face.offsets, 3))
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(face.colors, 3))
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(face.rand, 1))
    geo.setAttribute('aSurfN', new THREE.InstancedBufferAttribute(face.normals, 3))
    geo.setAttribute('aBack', new THREE.InstancedBufferAttribute(face.backs, 1))
    return geo
  }, [face])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uCell: { value: face.cell },
          uProgress: { value: 0 },
          uMouse: { value: new THREE.Vector2(9, 9) },
          uMouseStrength: { value: 0 },
          uMaxDepth: { value: face.maxDepth },
          uGlow: { value: new THREE.Color('#7d93ff') },
          uIntro: { value: prefersReducedMotion ? 1 : 0 },
        },
      }),
    [face],
  )

  // intro: profile -> front
  useEffect(() => {
    const g = group.current
    if (import.meta.env.DEV) Object.assign(window, { __head: g, __faceCount: face.count, __faceSource: face.source })
    if (prefersReducedMotion || DEBUG.pose !== null) {
      g.rotation.y = DEBUG.pose ?? 0
      material.uniforms.uIntro.value = 1
      return
    }
    g.rotation.y = FLIGHT.intro.fromRotationY
    let tween: gsap.core.Tween | null = null
    const start = () => {
      tween = gsap.to(g.rotation, {
        y: 0,
        duration: FLIGHT.intro.duration,
        ease: FLIGHT.intro.ease,
        delay: FLIGHT.intro.delay,
      })
      gsap.to(material.uniforms.uIntro, { value: 1, duration: 1.2, ease: 'power2.out' })
    }
    if (flight.introStarted) start()
    else window.addEventListener('flight:intro', start, { once: true })
    return () => {
      window.removeEventListener('flight:intro', start)
      tween?.kill()
    }
  }, [material, face])

  useFrame((state, dt) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uProgress.value = smooth(FLIGHT.explode[0], FLIGHT.explode[1], flight.progress)

    // pointer -> face plane (local units), eased so the bump follows softly
    const m = mouse.current
    const tx = flight.pointer.x * 2.1
    const ty = flight.pointer.y * 1.55
    m.x += (tx - m.x) * Math.min(1, dt * 8)
    m.y += (ty - m.y) * Math.min(1, dt * 8)
    m.s += ((prefersReducedMotion ? 0 : 1) - m.s) * Math.min(1, dt * 2)
    u.uMouse.value.set(m.x, m.y)
    u.uMouseStrength.value = m.s * (1 - u.uProgress.value)

    // a slight look toward the pointer once the intro is done
    if (!prefersReducedMotion && group.current) {
      group.current.rotation.x += (-flight.pointer.y * 0.08 - group.current.rotation.x) * Math.min(1, dt * 3)
    }
  })

  return (
    <group ref={group} position={[isMobile ? 0 : 0.9, isMobile ? 1.05 : 0, 0]} scale={isMobile ? 0.62 : 1}>
      <instancedMesh args={[geometry, material, face.count]} frustumCulled={false} />
    </group>
  )
}
