import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { isMobile } from '../lib/quality'

/**
 * Progress from drei's loading manager plus our own scene-ready signal
 * (the face maps are generated outside the three.js loaders).
 */
export function Loader({ sceneReady, onDone }: { sceneReady: boolean; onDone: () => void }) {
  const { progress, active } = useProgress()
  const [shown, setShown] = useState(0)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const done = useRef(false)

  const target = sceneReady && !active ? 100 : Math.min(96, Math.max(progress * 0.9, 12))

  useEffect(() => {
    const o = { v: shown }
    const t = gsap.to(o, { v: target, duration: 0.6, ease: 'power2.out', onUpdate: () => setShown(Math.round(o.v)) })
    return () => { t.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  useEffect(() => {
    if (shown < 100 || done.current) return
    done.current = true
    gsap.to(root.current, {
      opacity: 0,
      duration: 0.9,
      delay: 0.25,
      ease: 'power2.inOut',
      onStart: onDone,
      onComplete: () => setGone(true),
    })
  }, [shown, onDone])

  if (gone) return null
  return (
    <div ref={root} className="loader" role="status" aria-live="polite">
      {!isMobile && (
        <div className="loader-bg" aria-hidden="true">
          <ShaderGradientCanvas lazyLoad={false} pixelDensity={1} fov={45} pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <ShaderGradient
              control="props"
              type="waterPlane"
              animate="on"
              uSpeed={0.12}
              uStrength={2.2}
              uDensity={1.3}
              uFrequency={4}
              uAmplitude={0}
              color1="#06070d"
              color2="#4054c8"
              color3="#0b0d1a"
              brightness={1.25}
              lightType="3d"
              grain="off"
              cDistance={3.6}
              cPolarAngle={90}
              cAzimuthAngle={180}
              positionX={0}
              positionY={0.9}
              positionZ={-0.3}
              rotationX={45}
              rotationY={0}
              rotationZ={0}
            />
          </ShaderGradientCanvas>
        </div>
      )}
      <span className="loader-count">{shown}</span>
      <span className="loader-label">Assembling the head, cube by cube</span>
    </div>
  )
}
