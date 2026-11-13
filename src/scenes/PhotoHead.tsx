import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { suspend } from 'suspend-react'
import * as THREE from 'three'
import gsap from 'gsap'
import vert from '../shaders/photoHead.vert.glsl?raw'
import frag from '../shaders/photoHead.frag.glsl?raw'
import { loadPortrait } from '../lib/photoHead'
import { flight } from '../lib/flightState'
import { FLIGHT, HEAD } from '../config/flight'
import { QUALITY, prefersReducedMotion, isMobile } from '../lib/quality'
import { DEBUG } from '../lib/debug'
import { ASSETS } from '../lib/assets'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Particle portrait. On load the particles fly in and assemble the photo (or play the head-turn
 * sequence); the pointer pushes them; a click sends a ring wave through them; scrolling scatters them.
 */
export function PhotoHead() {
  const src = suspend(
    () => loadPortrait(QUALITY.photoGrid, import.meta.env.BASE_URL, ASSETS.portrait, HEAD.sequence),
    ['portrait', QUALITY.photoGrid],
  )
  const n = src.grid * src.grid
  const group = useRef<THREE.Group>(null!)
  const { gl, camera } = useThree()
  const pointer = useRef({ x: 0, y: 0, s: 0 })
  const seq = useRef({ index: 0, playing: false, t: 0 })
  const [caster, plane, ndc, hitP, q, wp] = useMemo(
    () => [new THREE.Raycaster(), new THREE.Plane(), new THREE.Vector2(), new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3()] as const,
    [],
  )

  const { geometry, attrs } = useMemo(() => {
    const first = src.sample(src.frames[0])
    const g = new THREE.BufferGeometry()
    const posA = new THREE.BufferAttribute(first.pos.slice(), 3)
    const posB = new THREE.BufferAttribute(first.pos.slice(), 3)
    const colA = new THREE.BufferAttribute(first.col.slice(), 4)
    const colB = new THREE.BufferAttribute(first.col.slice(), 4)
    const scatter = new Float32Array(n * 3)
    const rand = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // a loose cloud around and behind the portrait
      const r = 3 + Math.random() * 5
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      scatter[i * 3] = r * Math.sin(ph) * Math.cos(th)
      scatter[i * 3 + 1] = r * Math.cos(ph) * 0.7
      scatter[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 2
      rand[i] = Math.random()
    }
    g.setAttribute('position', posA) // drives bounds only; the shader uses aPosA/aPosB
    g.setAttribute('aPosA', posA)
    g.setAttribute('aPosB', posB)
    g.setAttribute('aColA', colA)
    g.setAttribute('aColB', colB)
    g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    return { geometry: g, attrs: { posA, posB, colA, colB } }
  }, [src, n])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uFrameMix: { value: 0 },
          uAssemble: { value: DEBUG.assemble ?? (prefersReducedMotion || DEBUG.pose !== null ? 1 : 0) },
          uProgress: { value: 0 },
          uMouse: { value: new THREE.Vector2(9, 9) },
          uMouseStrength: { value: 0 },
          uBurst: { value: new THREE.Vector2(0, 0) },
          uBurstAge: { value: 99 },
          uSize: { value: HEAD.pointSize * (isMobile ? 0.9 : 1) * (230 / src.grid) },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, QUALITY.dpr[1]) },
          uIntro: { value: prefersReducedMotion || DEBUG.pose !== null || DEBUG.assemble !== null ? 1 : 0 },
        },
      }),
    [src],
  )

  /** Load frame i into slot B and blend toward it. */
  const loadFrame = (i: number, intoA = false) => {
    const f = src.sample(src.frames[i])
    const pos = intoA ? attrs.posA : attrs.posB
    const col = intoA ? attrs.colA : attrs.colB
    ;(pos.array as Float32Array).set(f.pos)
    ;(col.array as Float32Array).set(f.col)
    pos.needsUpdate = true
    col.needsUpdate = true
  }

  // intro: particles assemble; with a sequence, the head turn plays at the same time
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __particles: n, __frames: src.frames.length, __photoMat: material })
    if (prefersReducedMotion || DEBUG.pose !== null || DEBUG.assemble !== null) return
    const start = () => {
      gsap.to(material.uniforms.uIntro, { value: 1, duration: 0.6, ease: 'power2.out' })
      gsap.to(material.uniforms.uAssemble, { value: 1, duration: FLIGHT.intro.duration + 0.6, ease: 'power2.inOut', delay: FLIGHT.intro.delay })
      if (src.frames.length > 1) seq.current = { index: 0, playing: true, t: 0 }
    }
    if (flight.introStarted) start()
    else window.addEventListener('flight:intro', start, { once: true })
    return () => window.removeEventListener('flight:intro', start)
  }, [material, src, n])

  // click on the canvas near the portrait: ring wave from the click point
  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const hit = new THREE.Vector3()
    const onDown = (e: PointerEvent) => {
      if (flight.progress > FLIGHT.explode[1] * 0.5) return
      const r = el.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      plane.normal.set(0, 0, 1).applyQuaternion(group.current.getWorldQuaternion(new THREE.Quaternion()))
      plane.constant = -plane.normal.dot(group.current.getWorldPosition(new THREE.Vector3()))
      if (!ray.ray.intersectPlane(plane, hit)) return
      group.current.worldToLocal(hit)
      if (Math.abs(hit.x) > 2.2 || Math.abs(hit.y) > 2.2) return
      material.uniforms.uBurst.value.set(hit.x, hit.y)
      material.uniforms.uBurstAge.value = 0
    }
    el.addEventListener('pointerdown', onDown)
    return () => el.removeEventListener('pointerdown', onDown)
  }, [gl, camera, material])

  useFrame((state, dt) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uProgress.value = smooth(FLIGHT.explode[0], FLIGHT.explode[1], flight.progress)
    u.uBurstAge.value += dt

    // frame-by-frame playback
    const s = seq.current
    if (s.playing) {
      s.t += dt * src.fps
      while (s.t >= 1 && s.index < src.frames.length - 1) {
        s.t -= 1
        s.index++
        loadFrame(s.index - 1, true)
        loadFrame(s.index)
      }
      u.uFrameMix.value = Math.min(1, s.t)
      if (s.index >= src.frames.length - 1) { s.playing = false; u.uFrameMix.value = 1 }
    }

    // pointer projected exactly onto the portrait plane, in the portrait's own coordinates
    const g = group.current
    ndc.set(flight.pointer.x, flight.pointer.y)
    caster.setFromCamera(ndc, state.camera)
    plane.normal.set(0, 0, 1).applyQuaternion(g.getWorldQuaternion(q))
    plane.constant = -plane.normal.dot(g.getWorldPosition(wp))
    const m = pointer.current
    if (caster.ray.intersectPlane(plane, hitP)) {
      g.worldToLocal(hitP)
      m.x += (hitP.x - m.x) * Math.min(1, dt * 14)
      m.y += (hitP.y - m.y) * Math.min(1, dt * 14)
    }
    m.s += ((prefersReducedMotion ? 0 : 1) - m.s) * Math.min(1, dt * 2)
    u.uMouse.value.set(m.x, m.y)
    u.uMouseStrength.value = m.s * (1 - u.uProgress.value) * u.uAssemble.value

    if (!prefersReducedMotion) {
      group.current.rotation.y += (flight.pointer.x * 0.12 - group.current.rotation.y) * Math.min(1, dt * 2)
      group.current.rotation.x += (-flight.pointer.y * 0.06 - group.current.rotation.x) * Math.min(1, dt * 2)
    }
  })

  return (
    <group ref={group} position={[isMobile ? 0 : 1.05, isMobile ? 0.9 : -0.1, 0]} scale={isMobile ? 0.66 : 1}>
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
    </group>
  )
}
