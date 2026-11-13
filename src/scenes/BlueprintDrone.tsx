import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { FLIGHT } from '../config/flight'
import { flight } from '../lib/flightState'

/** Build progress of the beam scene: 0 while approaching, 1 when the section text is on screen. */
function buildProgress() {
  const end = FLIGHT.anchors.beam
  const start = end - 0.11
  return Math.min(1, Math.max(0, (flight.progress - start) / (end - start)))
}

type MatKey = 'carbon' | 'shell' | 'metal' | 'battery' | 'strap' | 'glass' | 'rubber'

const MATERIALS: Record<MatKey, () => THREE.Material> = {
  carbon: () => new THREE.MeshStandardMaterial({ color: '#191b21', metalness: 0.45, roughness: 0.42 }),
  shell: () => new THREE.MeshPhysicalMaterial({ color: '#d8dbe2', metalness: 0.1, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
  metal: () => new THREE.MeshStandardMaterial({ color: '#8e939e', metalness: 0.95, roughness: 0.2 }),
  battery: () => new THREE.MeshStandardMaterial({ color: '#22304a', metalness: 0.3, roughness: 0.5 }),
  strap: () => new THREE.MeshStandardMaterial({ color: '#e0622a', metalness: 0.1, roughness: 0.7 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#0a0e18', metalness: 0, roughness: 0.04, clearcoat: 1 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.9 }),
}

const ARMS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const ARM_END = (sx: number, sz: number) => new THREE.Vector3(sx * 0.86, 0.06, sz * 0.74)

/** Collects transformed geometry per material. */
class Kit {
  parts: { geo: THREE.BufferGeometry; mat: MatKey }[] = []
  add(geo: THREE.BufferGeometry, mat: MatKey, pos: THREE.Vector3Like = { x: 0, y: 0, z: 0 }, rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    )
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m)
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k)
    this.parts.push({ geo: g, mat })
  }
  /** A tube from a to b (cylinder aligned between two points). */
  tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: MatKey, seg = 10) {
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    const g = new THREE.CylinderGeometry(r1, r0, len, seg)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))
    const out = g.toNonIndexed().applyMatrix4(m)
    out.deleteAttribute('uv')
    this.parts.push({ geo: out, mat })
  }
}

function buildDrone() {
  const k = new Kit()
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  // fuselage, top shell, vents
  k.add(new RoundedBoxGeometry(1.0, 0.22, 0.56, 3, 0.07), 'carbon')
  k.add(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 'shell', v(0.05, 0.1, 0), [0, 0, 0], [0.92, 0.32, 0.56])
  for (let i = 0; i < 5; i++) k.add(new THREE.BoxGeometry(0.03, 0.012, 0.22), 'carbon', v(-0.28 - i * 0.05, 0.255 - i * 0.012, 0))
  // front lidar dome and sensor strip
  k.add(new THREE.SphereGeometry(0.06, 16, 10), 'glass', v(0.52, 0.02, 0))
  k.add(new THREE.BoxGeometry(0.02, 0.04, 0.3), 'glass', v(0.5, -0.06, 0))
  // battery with straps
  k.add(new RoundedBoxGeometry(0.52, 0.12, 0.3, 2, 0.025), 'battery', v(-0.05, -0.18, 0))
  for (const x of [-0.2, 0.1]) k.add(new THREE.BoxGeometry(0.04, 0.15, 0.32), 'strap', v(x, -0.17, 0))
  // GPS mast and puck, two antennas
  k.tube(v(-0.3, 0.17, 0), v(-0.3, 0.38, 0), 0.012, 0.01, 'metal')
  k.add(new THREE.CylinderGeometry(0.07, 0.075, 0.03, 20), 'shell', v(-0.3, 0.4, 0))
  for (const sz of [-1, 1]) k.tube(v(-0.42, 0.1, sz * 0.16), v(-0.56, 0.32, sz * 0.24), 0.008, 0.005, 'rubber', 6)
  // camera gimbal under the nose
  k.add(new THREE.BoxGeometry(0.03, 0.12, 0.2), 'metal', v(0.34, -0.17, 0))
  for (const sz of [-1, 1]) k.add(new THREE.BoxGeometry(0.1, 0.1, 0.015), 'metal', v(0.38, -0.24, sz * 0.08))
  k.add(new RoundedBoxGeometry(0.13, 0.1, 0.13, 2, 0.02), 'carbon', v(0.4, -0.26, 0))
  k.add(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 18), 'metal', v(0.48, -0.26, 0), [0, 0, Math.PI / 2])
  k.add(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 18), 'glass', v(0.512, -0.26, 0), [0, 0, Math.PI / 2])

  // arms, clamps, motors with screws
  for (const [sx, sz] of ARMS) {
    const a = v(sx * 0.32, 0.03, sz * 0.2)
    const e = ARM_END(sx, sz)
    k.tube(a, e, 0.046, 0.032, 'carbon', 12)
    k.add(new THREE.BoxGeometry(0.1, 0.07, 0.1), 'metal', a.clone().lerp(e, 0.08))
    k.add(new THREE.BoxGeometry(0.07, 0.06, 0.07), 'metal', a.clone().lerp(e, 0.86))
    k.add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), 'carbon', v(e.x, e.y + 0.03, e.z))
    k.add(new THREE.CylinderGeometry(0.075, 0.08, 0.09, 20), 'metal', v(e.x, e.y + 0.085, e.z))
    k.add(new THREE.CylinderGeometry(0.06, 0.075, 0.025, 20), 'carbon', v(e.x, e.y + 0.14, e.z))
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2 + Math.PI / 4
      k.add(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), 'metal', v(e.x + Math.cos(ang) * 0.04, e.y + 0.155, e.z + Math.sin(ang) * 0.04))
    }
    // a little ESC fin under each arm
    k.add(new THREE.BoxGeometry(0.12, 0.02, 0.05), 'carbon', a.clone().lerp(e, 0.5).add(v(0, -0.05, 0)), [0, Math.atan2(-(e.z - a.z), e.x - a.x), 0])
  }

  // landing gear: two struts per side down to a skid, with feet
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) k.tube(v(sx * 0.22, -0.1, sz * 0.18), v(sx * 0.3, -0.5, sz * 0.32), 0.02, 0.016, 'carbon', 8)
    k.tube(v(-0.48, -0.52, sz * 0.32), v(0.48, -0.52, sz * 0.32), 0.022, 0.022, 'carbon', 10)
    for (const sx of [-1, 1]) {
      k.add(new THREE.SphereGeometry(0.03, 10, 8), 'rubber', v(sx * 0.48, -0.52, sz * 0.32))
      k.add(new THREE.CylinderGeometry(0.04, 0.045, 0.02, 12), 'rubber', v(sx * 0.3, -0.55, sz * 0.32))
    }
  }

  // merge per material for the solid view, and all edges in build order for the blueprint
  const byMat = new Map<MatKey, THREE.BufferGeometry[]>()
  const edges: THREE.BufferGeometry[] = []
  for (const p of k.parts) {
    if (!byMat.has(p.mat)) byMat.set(p.mat, [])
    byMat.get(p.mat)!.push(p.geo)
    edges.push(new THREE.EdgesGeometry(p.geo, 28))
  }
  const solids = [...byMat.entries()].map(([mat, list]) => {
    const g = mergeGeometries(list)!
    g.computeVertexNormals()
    return { mat, geo: g }
  })
  return { solids, lines: mergeGeometries(edges)! }
}

/** Two-blade propeller with a little pitch and a hub. */
function propeller() {
  const k = new Kit()
  for (const side of [0, Math.PI]) {
    k.add(new THREE.BoxGeometry(0.34, 0.006, 0.05), 'carbon', { x: Math.cos(side) * 0.17, y: 0, z: -Math.sin(side) * 0.17 }, [Math.cos(side) * 0.18, side, 0])
    k.add(new THREE.BoxGeometry(0.05, 0.007, 0.035), 'strap', { x: Math.cos(side) * 0.33, y: 0, z: -Math.sin(side) * 0.33 }, [0, side, 0])
  }
  k.add(new THREE.CylinderGeometry(0.025, 0.03, 0.03, 12), 'metal')
  const groups = new Map<MatKey, THREE.BufferGeometry[]>()
  for (const p of k.parts) { if (!groups.has(p.mat)) groups.set(p.mat, []); groups.get(p.mat)!.push(p.geo) }
  return [...groups.entries()].map(([mat, list]) => ({ mat, geo: mergeGeometries(list)! }))
}

/**
 * "From sketch to a working prototype": a detailed drone that starts as a glowing blueprint,
 * draws itself part by part as you scroll, turns solid with real materials, lights up and spins.
 * Holding the pointer (see Beam) spins the rotors up and lifts it.
 */
export function BlueprintDrone({ boost }: { boost: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null!)
  const rotors = useRef<THREE.Group>(null!)
  const spin = useRef(0)

  const built = useMemo(() => {
    const { solids, lines } = buildDrone()
    const mats = Object.fromEntries((Object.keys(MATERIALS) as MatKey[]).map((key) => {
      const m = MATERIALS[key]() as THREE.MeshStandardMaterial
      m.transparent = true
      m.opacity = 0
      return [key, m]
    })) as Record<MatKey, THREE.MeshStandardMaterial>
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.1, 1.5, 3.2), toneMapped: false, transparent: true })
    const prop = propeller()
    const blur = new THREE.MeshBasicMaterial({ color: '#c7d1ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    const leds = {
      red: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.3), toneMapped: false, transparent: true, opacity: 0 }),
      green: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 5, 1), toneMapped: false, transparent: true, opacity: 0 }),
      white: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5), toneMapped: false, transparent: true, opacity: 0 }),
    }
    return { solids, lines, mats, lineMat, prop, blur, leds, segCount: lines.attributes.position.count / 2 }
  }, [])

  useFrame((state, dt) => {
    const b = buildProgress()
    const hold = boost.current ?? 0
    const { lines, lineMat, mats, segCount, blur, leds } = built
    // 1) blueprint lines draw part by part, 2) materials fill in, 3) lights and rotors start
    lines.setDrawRange(0, Math.floor(segCount * Math.min(1, b / 0.55)) * 2)
    lineMat.opacity = 1 - THREE.MathUtils.smoothstep(b, 0.72, 1) * 0.8
    const fill = THREE.MathUtils.smoothstep(b, 0.5, 0.86)
    for (const m of Object.values(mats)) m.opacity = fill
    const run = THREE.MathUtils.smoothstep(b, 0.82, 1)
    const t = state.clock.elapsedTime
    leds.red.opacity = leds.green.opacity = run
    leds.white.opacity = run * (Math.sin(t * 9) > 0.7 ? 1 : 0.1) // strobe
    spin.current += dt * (run * 22 + hold * 45)
    blur.opacity = Math.min(0.28, (run * 0.6 + hold) * 0.25)
    rotors.current.children.forEach((r, i) => {
      r.visible = b > 0.42
      r.children[0].rotation.y = spin.current * (i % 2 ? 1 : -1)
    })
    group.current.position.y = 0.2 + run * Math.sin(t * 1.4) * 0.06 + hold * 0.7
    group.current.rotation.y = -0.6 + t * 0.12 * (0.3 + run)
    group.current.rotation.z = run * Math.sin(t * 0.9) * 0.035 + hold * 0.05
  })

  const { solids, lines, mats, lineMat, prop, blur, leds } = built
  return (
    <group ref={group} scale={1.7}>
      <lineSegments geometry={lines} material={lineMat} />
      {solids.map((s) => <mesh key={s.mat} geometry={s.geo} material={mats[s.mat]} />)}
      <group ref={rotors}>
        {ARMS.map(([sx, sz], i) => {
          const e = ARM_END(sx, sz)
          return (
            <group key={i} position={[e.x, e.y + 0.17, e.z]}>
              <group>
                {prop.map((p) => <mesh key={p.mat} geometry={p.geo} material={mats[p.mat]} />)}
              </group>
              <mesh rotation-x={-Math.PI / 2} material={blur}>
                <circleGeometry args={[0.36, 32]} />
              </mesh>
            </group>
          )
        })}
      </group>
      {/* navigation lights: red left, green right, white strobes at the back */}
      <mesh position={[0.86, -0.02, -0.74]} material={leds.red}><sphereGeometry args={[0.025, 10, 8]} /></mesh>
      <mesh position={[0.86, -0.02, 0.74]} material={leds.green}><sphereGeometry args={[0.025, 10, 8]} /></mesh>
      <mesh position={[-0.86, -0.02, -0.74]} material={leds.white}><sphereGeometry args={[0.022, 10, 8]} /></mesh>
      <mesh position={[-0.86, -0.02, 0.74]} material={leds.white}><sphereGeometry args={[0.022, 10, 8]} /></mesh>
    </group>
  )
}
