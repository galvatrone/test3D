export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const narrow = typeof window !== 'undefined' && window.innerWidth < 820

export const isMobile = coarse || narrow

/**
 * Per-device budget. The face grid side decides the cube count:
 * about 55% of grid cells fall inside the head mask.
 */
export const QUALITY = isMobile
  ? { faceGrid: 202, photoGrid: 110, dpr: [1, 1.5] as [number, number], post: 'lite' as const, tunnelBoxes: 900 }
  : { faceGrid: 264, photoGrid: 230, dpr: [1, 2] as [number, number], post: 'full' as const, tunnelBoxes: 2200 }
