import { Environment, Lightformer } from '@react-three/drei'
import { Head } from './Head'
import { HeroGrid } from './HeroGrid'
import { CameraRig } from './CameraRig'
import { PostFX } from './PostFX'
import { Gallery } from './Gallery'
import { Tunnel } from './Tunnel'
import { Beam } from './Beam'
import { Alley } from './Alley'
import { Atmosphere } from './Atmosphere'
import { prefersReducedMotion } from '../lib/quality'

/**
 * Everything inside the canvas, in flight order.
 * To add a scene: create src/scenes/MyScene.tsx, give it a z range in config/flight.ts,
 * render it here, and add its text block to ui/Overlay.tsx at a new anchor.
 */
export function World() {
  return (
    <>
      <CameraRig />
      <Atmosphere />
      <ambientLight intensity={0.15} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 4, -6]} scale={[12, 1.2, 1]} color="#c9d2ff" />
        <Lightformer intensity={1.4} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} color="#ffd7a1" />
        <Lightformer intensity={1} position={[5, -1, -2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} color="#7d93ff" />
      </Environment>

      <Head />
      {!prefersReducedMotion && (
        <>
          <HeroGrid />
          <Gallery />
          <Tunnel />
          <Beam />
          <Alley />
        </>
      )}
      <PostFX />
    </>
  )
}
