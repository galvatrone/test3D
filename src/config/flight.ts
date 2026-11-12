/**
 * One place for the flight: the camera spline, where each scene sits along it,
 * and every timing used by the intro and the transitions.
 *
 * Progress `p` runs from 0 (hero) to 1 (contact) and is driven by page scroll.
 * Scene anchors are in progress units, so moving a scene's text is a one-line change.
 */
export type Vec3 = [number, number, number]

export const FLIGHT = {
  /** Camera spline control points (CatmullRomCurve3, centripetal). The head sits at the origin. */
  path: [
    [0, 0, 7.2],
    [0, 0.05, 3.4],
    [0, 0.1, -2],
    [0.4, 0.35, -10],
    [0, 0.3, -17],
    [-0.5, 0.1, -28],
    [0, 0, -40],
    [0, 0, -54],
    [0, 0, -68],
    [0, 0.5, -78],
    [0.2, 0.6, -90],
    [0, 0.4, -104],
    [0, 0.35, -114],
  ] as Vec3[],

  /** How far ahead on the curve the camera looks (progress units). */
  lookAhead: 0.012,

  /** Scene anchors in progress units. The HTML overlay places its text blocks at these points. */
  anchors: {
    hero: 0,
    gallery: 0.22,
    tunnel: 0.48,
    beam: 0.7,
    contact: 1,
  },

  /** World placement of each scene (z along the path). */
  scenes: {
    gallery: { z: -21 },
    tunnel: { from: -34, to: -68 },
    beam: { z: -84 },
    alley: { from: -96, to: -132 },
  },

  /** Head particles fly apart while progress moves through this range. */
  explode: [0.0, 0.14] as [number, number],

  /** Page length in viewport heights. More = slower flight per scroll tick. */
  scrollLengthVh: 720,

  intro: {
    /** Head turns from profile (-PI/2) to the front. */
    duration: 2.5,
    ease: 'power3.inOut',
    fromRotationY: -Math.PI / 2,
    /** Delay after the loader fades out (s). */
    delay: 0.2,
  },

  /** Lenis smooth scroll. */
  lenis: { lerp: 0.085, wheelMultiplier: 0.9 },

  /** Scroll speed (progress per second) that gives full transition distortion. */
  velocityForFullDistortion: 0.3,
} as const

export type SceneName = keyof typeof FLIGHT.anchors
