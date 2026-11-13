import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIGHT } from '../config/flight'
import { flight } from '../lib/flightState'
import { isMobile } from '../lib/quality'

/**
 * Track: a winding line to the right of the flight path, from the about section to the notes room.
 * Inside the tunnel (z -34..-66) it keeps close to the centre so it never cuts through the walls;
 * outside it swings wider. y is the rail height.
 */
const TRACK_POINTS: [number, number, number][] = [
  [2.6, -2.15, 0],
  [3.6, -2.15, -8],
  [2.4, -2.15, -15],
  [3.4, -2.15, -23],
  [2.0, -2.15, -30],
  [1.35, -2.15, -36],
  [1.1, -2.15, -44],
  [1.45, -2.15, -52],
  [1.1, -2.15, -60],
  [1.4, -2.15, -66],
  [2.8, -2.15, -72],
  [4.2, -2.15, -79],
  [3.2, -2.15, -86],
  [4.4, -2.15, -92],
  [3.6, -2.15, -99],
]
const curve = new THREE.CatmullRomCurve3(TRACK_POINTS.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
const LENGTH = curve.getLength()
const SPEED = 6.5

type Kind = 'loco' | 'passenger' | 'box' | 'tank' | 'flat'
const SEQUENCE: Kind[] = ['loco', 'passenger', 'passenger', 'passenger', 'box', 'tank', 'flat', 'box', 'passenger', 'tank', 'flat', 'flat', 'box', 'passenger']
const CAR_LEN: Record<Kind, number> = { loco: 2.6, passenger: 2.4, box: 2.1, tank: 2.0, flat: 2.2 }
const GAP = 0.18
const CONTAINER_COLORS = ['#b8432f', '#2f6db8', '#d9a33a', '#3f8f5a', '#8a8f99']

function mats() {
  return {
    body: new THREE.MeshStandardMaterial({ color: '#1d2129', metalness: 0.75, roughness: 0.32 }),
    roof: new THREE.MeshStandardMaterial({ color: '#2b303b', metalness: 0.6, roughness: 0.45 }),
    stripe: new THREE.MeshStandardMaterial({ color: '#c23b2b', metalness: 0.4, roughness: 0.5 }),
    rust: new THREE.MeshStandardMaterial({ color: '#4a2a1d', metalness: 0.5, roughness: 0.7 }),
    tank: new THREE.MeshStandardMaterial({ color: '#9aa1ad', metalness: 0.9, roughness: 0.22 }),
    deck: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.85 }),
    under: new THREE.MeshStandardMaterial({ color: '#0d0e11', roughness: 0.8, metalness: 0.4 }),
    wheel: new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: 0.9, roughness: 0.3 }),
    window: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.4, 1.5), toneMapped: false }),
    head: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.8), toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.3), toneMapped: false }),
    containers: CONTAINER_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.55 })),
  }
}
type Mats = ReturnType<typeof mats>

const box = (w: number, h: number, l: number) => new THREE.BoxGeometry(w, h, l)

/** Builds one car as a group; its local +z is the direction of travel's back, origin at rail level. */
function buildCar(kind: Kind, m: Mats, seed: number): THREE.Group {
  const g = new THREE.Group()
  const L = CAR_LEN[kind]
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.rotation.set(rx, ry, rz)
    g.add(mesh)
    return mesh
  }
  // chassis and bogies with wheels
  add(box(0.7, 0.1, L - 0.1), m.under, 0, 0.32, 0)
  for (const bz of [-L / 2 + 0.4, L / 2 - 0.4]) {
    add(box(0.62, 0.12, 0.6), m.under, 0, 0.2, bz)
    for (const wz of [bz - 0.18, bz + 0.18]) for (const wx of [-0.3, 0.3]) {
      add(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), m.wheel, wx, 0.11, wz, 0, 0, Math.PI / 2)
    }
  }
  // couplers
  add(box(0.08, 0.06, 0.18), m.under, 0, 0.3, -L / 2 - 0.05)
  add(box(0.08, 0.06, 0.18), m.under, 0, 0.3, L / 2 + 0.05)

  if (kind === 'loco') {
    add(box(0.78, 0.66, L - 0.3), m.body, 0, 0.72, 0.1)
    add(box(0.8, 0.08, L - 0.3), m.stripe, 0, 0.52, 0.1)
    add(box(0.74, 0.2, 0.9), m.roof, 0, 1.12, -0.5) // cab roof hump
    add(box(0.7, 0.16, 0.4), m.window, 0, 0.88, -L / 2 + 0.18) // windscreen
    add(box(0.12, 0.08, 0.04), m.head, -0.22, 0.48, -L / 2 + 0.13)
    add(box(0.12, 0.08, 0.04), m.head, 0.22, 0.48, -L / 2 + 0.13)
    add(box(0.18, 0.1, 0.04), m.head, 0, 1.05, -L / 2 + 0.13)
    for (let i = 0; i < 5; i++) add(box(0.6, 0.04, 0.12), m.under, 0, 1.06, 0.2 + i * 0.22) // roof vents
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), m.wheel, 0.2, 1.3, 0.9) // pantograph post
    add(box(0.5, 0.02, 0.04), m.wheel, 0.2, 1.46, 0.9)
    add(box(0.01, 0.12, 0.3), m.window, -0.395, 0.86, -0.75)
    add(box(0.01, 0.12, 0.3), m.window, 0.395, 0.86, -0.75)
  } else if (kind === 'passenger') {
    add(box(0.78, 0.64, L - 0.12), m.body, 0, 0.72, 0)
    add(new THREE.CylinderGeometry(0.39, 0.39, L - 0.12, 16, 1, false, -Math.PI / 2, Math.PI), m.roof, 0, 1.04, 0, Math.PI / 2, 0, 0).scale.set(1, 1, 0.28)
    add(box(0.8, 0.05, L - 0.12), m.stripe, 0, 0.5, 0)
    const n = 6
    for (let i = 0; i < n; i++) {
      const z = -L / 2 + 0.35 + i * ((L - 0.7) / (n - 1))
      const lit = (seed * 7 + i * 3) % 5 !== 0
      for (const sx of [-1, 1]) add(box(0.01, 0.16, 0.24), lit ? m.window : m.under, sx * 0.395, 0.82, z)
    }
    for (const sx of [-1, 1]) for (const dz of [-L / 2 + 0.12, L / 2 - 0.12]) add(box(0.012, 0.42, 0.14), m.roof, sx * 0.396, 0.68, dz) // doors
  } else if (kind === 'box') {
    const mat = seed % 2 ? m.rust : m.body
    add(box(0.8, 0.72, L - 0.1), mat, 0, 0.76, 0)
    for (let i = 0; i <= 8; i++) for (const sx of [-1, 1]) add(box(0.02, 0.72, 0.03), m.under, sx * 0.405, 0.76, -L / 2 + 0.1 + i * ((L - 0.2) / 8))
    for (const sx of [-1, 1]) add(box(0.015, 0.6, 0.55), m.roof, sx * 0.41, 0.74, 0) // sliding door
    add(box(0.82, 0.04, L - 0.06), m.roof, 0, 1.14, 0)
  } else if (kind === 'tank') {
    add(new THREE.CylinderGeometry(0.36, 0.36, L - 0.3, 20), m.tank, 0, 0.78, 0, Math.PI / 2, 0, 0)
    for (const dz of [-(L - 0.3) / 2, (L - 0.3) / 2]) add(new THREE.SphereGeometry(0.36, 16, 8), m.tank, 0, 0.78, dz).scale.set(1, 1, 0.3)
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), m.tank, 0, 1.17, 0) // dome
    for (const r of [-0.5, 0, 0.5]) add(new THREE.TorusGeometry(0.365, 0.012, 6, 24), m.under, 0, 0.78, r)
    add(box(0.5, 0.02, 0.5), m.under, 0, 1.13, 0.1) // walkway
  } else {
    add(box(0.8, 0.08, L - 0.1), m.deck, 0, 0.42, 0)
    const c1 = m.containers[seed % m.containers.length]
    const c2 = m.containers[(seed + 2) % m.containers.length]
    const single = seed % 3 === 0
    const pieces = single ? [[0, L - 0.3, c1]] as const : [[-(L - 0.2) / 4, (L - 0.4) / 2, c1], [(L - 0.2) / 4, (L - 0.4) / 2, c2]] as const
    for (const [z, len, mat] of pieces) {
      add(box(0.74, 0.62, len), mat, 0, 0.78, z)
      for (let i = 0; i <= 6; i++) for (const sx of [-1, 1]) add(box(0.015, 0.6, 0.02), m.under, sx * 0.375, 0.78, z - len / 2 + 0.05 + i * ((len - 0.1) / 6))
    }
  }
  // a red marker on the very last car of each run of the sequence
  if (seed % SEQUENCE.length === SEQUENCE.length - 1) {
    add(box(0.08, 0.08, 0.02), m.tail, -0.25, 0.6, L / 2 + 0.01)
    add(box(0.08, 0.08, 0.02), m.tail, 0.25, 0.6, L / 2 + 0.01)
  }
  return g
}

/**
 * An endless train on a winding track. Cars of different kinds are spread over the whole track
 * and wrap around, so the train never starts or ends.
 */
export function Train() {
  const root = useRef<THREE.Group>(null!)
  const offset = useRef(0)

  const { cars, rails, sleepers } = useMemo(() => {
    const m = mats()
    const list: { group: THREE.Group; at: number; half: number }[] = []
    let at = 0
    let i = 0
    const budget = isMobile ? LENGTH * 0.55 : LENGTH
    while (at + CAR_LEN.passenger < budget) {
      const kind = SEQUENCE[i % SEQUENCE.length]
      const L = CAR_LEN[kind]
      list.push({ group: buildCar(kind, m, i), at: at + L / 2, half: L / 2 })
      at += L + GAP
      i++
    }

    // rails follow the curve as thin tubes, sleepers as one instanced mesh
    const railMat = new THREE.MeshStandardMaterial({ color: '#7a808c', metalness: 0.95, roughness: 0.22 })
    const railGroup = new THREE.Group()
    for (const side of [-0.3, 0.3]) {
      const pts = Array.from({ length: 220 }, (_, k) => {
        const u = k / 219
        const p = curve.getPointAt(u)
        const t = curve.getTangentAt(u)
        const n = new THREE.Vector3(-t.z, 0, t.x).normalize()
        return p.add(n.multiplyScalar(side)).add(new THREE.Vector3(0, -0.36, 0))
      })
      railGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.022, 5), railMat))
    }
    const count = Math.floor(LENGTH / 0.75)
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.05, 0.14), new THREE.MeshStandardMaterial({ color: '#191510', roughness: 0.9 }), count)
    const o = new THREE.Object3D()
    for (let k = 0; k < count; k++) {
      const u = k / count
      curve.getPointAt(u, o.position)
      o.position.y -= 0.42
      const t = curve.getTangentAt(u)
      o.rotation.set(0, Math.atan2(t.x, t.z), 0)
      o.updateMatrix()
      sl.setMatrixAt(k, o.matrix)
    }
    return { cars: list, rails: railGroup, sleepers: sl }
  }, [])

  const tmpP = useMemo(() => new THREE.Vector3(), [])
  const tmpA = useMemo(() => new THREE.Vector3(), [])
  const tmpB = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    root.current.visible = flight.progress > FLIGHT.anchors.about * 0.6 && flight.progress < FLIGHT.anchors.blog + 0.08
    if (!root.current.visible) return
    offset.current = (offset.current + dt * SPEED) % LENGTH
    for (const c of cars) {
      // distance along the track, moving toward -z, wrapping around
      // the first car built (the locomotive) leads, so order runs backward from it
      const d = (LENGTH - c.at + offset.current) % LENGTH
      const u = d / LENGTH
      const ua = Math.max(0, (d - c.half * 0.8) / LENGTH)
      const ub = Math.min(1, (d + c.half * 0.8) / LENGTH)
      curve.getPointAt(u, tmpP)
      curve.getPointAt(ua, tmpA)
      curve.getPointAt(ub, tmpB)
      c.group.position.set(tmpP.x, tmpP.y - 0.45, tmpP.z)
      // orient the car between its two bogies so it bends with the curve
      c.group.rotation.set(0, Math.atan2(tmpA.x - tmpB.x, tmpA.z - tmpB.z), 0)
      // hide the car while it wraps from the far end back to the start
      c.group.visible = d > c.half && d < LENGTH - c.half
    }
  })

  return (
    <group ref={root}>
      {cars.map((c, i) => <primitive key={i} object={c.group} />)}
      <primitive object={rails} />
      <primitive object={sleepers} />
    </group>
  )
}
