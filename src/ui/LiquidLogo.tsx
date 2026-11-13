import { LiquidMetal } from '@paper-design/shaders-react'
import { prefersReducedMotion } from '../lib/quality'
import { ASSETS } from '../lib/assets'

/**
 * Liquid metal monogram. Same shader as paper-design/liquid-logo,
 * taken from the Apache-2.0 @paper-design/shaders-react package.
 */
export function LiquidLogo({ size = 40 }: { size?: number }) {
  return (
    <LiquidMetal
      image={ASSETS.logoMark}
      style={{ width: size, height: size }}
      colorBack="#00000000"
      colorTint="#c9d2ff"
      repetition={2.2}
      softness={0.25}
      shiftRed={0.3}
      shiftBlue={0.3}
      distortion={0.12}
      contour={0.6}
      angle={70}
      speed={prefersReducedMotion ? 0 : 0.6}
      scale={0.9}
      fit="contain"
    />
  )
}
