import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { World } from './scenes/World'
import { Loader } from './ui/Loader'
import { Overlay } from './ui/Overlay'
import { Nav } from './ui/Nav'
import { SceneRail } from './ui/SceneRail'
import { ProjectPanel } from './ui/ProjectPanel'
import { QUALITY, prefersReducedMotion } from './lib/quality'
import { useFlightScroll } from './lib/useFlightScroll'
import { flight } from './lib/flightState'

/** Fires once every suspended scene asset inside the canvas has resolved. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady])
  return null
}

export default function App() {
  const [sceneReady, setSceneReady] = useState(false)
  const [entered, setEntered] = useState(false)
  useFlightScroll(entered)

  const enter = () => {
    setEntered(true)
    flight.introStarted = true
    window.dispatchEvent(new Event('flight:intro'))
  }

  return (
    <>
      <div className="stage" aria-hidden="true">
        <Canvas
          dpr={QUALITY.dpr}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 38, near: 0.1, far: 220, position: [0, 0, 7.2] }}
          frameloop={prefersReducedMotion ? 'demand' : 'always'}
        >
          <color attach="background" args={['#06070d']} />
          <Suspense fallback={null}>
            <World />
            <Ready onReady={() => setSceneReady(true)} />
          </Suspense>
        </Canvas>
      </div>
      <Nav />
      <SceneRail />
      <ProjectPanel />
      <Overlay entered={entered} />
      <Loader sceneReady={sceneReady} onDone={enter} />
    </>
  )
}
