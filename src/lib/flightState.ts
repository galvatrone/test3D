/**
 * Mutable flight state shared between the DOM scroll driver and the WebGL loop.
 * Kept outside React on purpose: it changes every frame and must not trigger renders.
 */
export const flight = {
  /** Smoothed scroll progress, 0..1. */
  progress: 0,
  /** Signed scroll speed in progress units per second. */
  velocity: 0,
  /** 0..1, how strongly transitions distort right now (derived from |velocity|). */
  distortion: 0,
  /** Pointer in normalised device coords (-1..1). */
  pointer: { x: 0, y: 0 },
  /** True while a finger or mouse button is down (touch screens have no hover). */
  pressed: false,
  /** True once the loader is gone and the intro turn has started. */
  introStarted: false,
}

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __flight: typeof flight }).__flight = flight
