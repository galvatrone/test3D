import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction, ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import { BarrelBlurEffect } from '../effects/BarrelBlurEffect'
import { flight } from '../lib/flightState'
import { QUALITY } from '../lib/quality'

/**
 * Desktop: bloom, speed-driven barrel blur, chromatic aberration, light grain, vignette.
 * Mobile: bloom and vignette only.
 */
export function PostFX() {
  return QUALITY.post === 'lite' ? <LitePost /> : <FullPost />
}

function LitePost() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.2} radius={0.6} resolutionScale={0.5} />
      <Vignette offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}

function FullPost() {
  const barrel = useMemo(() => new BarrelBlurEffect(), [])
  const ca = useMemo(() => ({ ref: null as ChromaticAberrationEffect | null }), [])
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), [])

  useFrame(() => {
    const d = flight.distortion
    barrel.strength = d
    const o = 0.0006 + d * 0.0042
    offset.set(o, o * 0.6)
    if (ca.ref) ca.ref.offset = offset
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.78} luminanceSmoothing={0.2} radius={0.75} />
      <primitive object={barrel} />
      <ChromaticAberration
        ref={(e: ChromaticAberrationEffect | null) => { ca.ref = e }}
        offset={offset}
        radialModulation
        modulationOffset={0.25}
      />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <Vignette offset={0.28} darkness={0.75} />
    </EffectComposer>
  )
}
