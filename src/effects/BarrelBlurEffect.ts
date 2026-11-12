import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'
import frag from '../shaders/barrelBlur.frag.glsl?raw'

/** Barrel distortion + radial blur whose strength follows the scroll speed. */
export class BarrelBlurEffect extends Effect {
  constructor() {
    super('BarrelBlurEffect', frag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['uStrength', new Uniform(0)]]),
    })
  }
  set strength(v: number) {
    this.uniforms.get('uStrength')!.value = v
  }
}
