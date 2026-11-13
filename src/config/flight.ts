/**
 * One place for the flight: the camera spline, where each scene sits along it,
 * and every timing used by the intro and the transitions.
 *
 * Progress `p` runs from 0 (hero) to 1 (contact) and is driven by page scroll.
 * Scene anchors are in progress units, so moving a scene's text is a one-line change.
 */
export type Vec3 = [number, number, number]

export const FLIGHT = {
  /**
   * Camera spline control points (CatmullRomCurve3, centripetal). The portrait sits at the origin.
   * After the light beam the path turns left into the notes room, then swings back into the alley.
   */
  path: [
    [0, 0, 7.2],
    [0, 0.05, 3.4],
    [0, 0.1, -2],
    [0.4, 0.35, -10],
    [0, 0.3, -17],
    [-0.5, 0.1, -28],
    [0, 0, -40],
    [0, 0, -54],
    [0, 0.2, -68],
    [0, 0.5, -77],
    [-3, 0.6, -86],
    [-10, 0.8, -91],
    [-13, 0.8, -93],
    [-9, 0.6, -99],
    [-2, 0.4, -106],
    [0, 0.35, -114],
    [0, 0.4, -124],
    [0, 0.4, -131],
    [0, 0.4, -136],
  ] as Vec3[],

  /** How far ahead on the curve the camera looks (curve units). */
  lookAhead: 0.012,

  /**
   * Scroll position of each section's text (0 = top of the page, 1 = bottom).
   * Keep them at least ~0.12 apart so every text block gets its own screen.
   */
  anchors: {
    hero: 0,
    about: 0.13,
    gallery: 0.27,
    tunnel: 0.44,
    beam: 0.59,
    blog: 0.76,
    contact: 0.92,
    /** the end of the page: through the neon door, then the flight loops back to the portrait */
    outro: 1,
  },

  /**
   * Where the camera is when each section's text is on screen. Scroll between two anchors moves
   * the camera between these points, so text and scene always line up.
   */
  stations: {
    hero: [0, 0, 7.2],
    about: [0, 0.1, -3],
    gallery: [0.1, 0.3, -18],
    tunnel: [0, 0, -50],
    beam: [0, 0.45, -75],
    blog: [-12, 0.8, -92],
    contact: [0, 0.35, -114],
    outro: [0, 0.4, -136],
  } as Record<string, Vec3>,

  /** World placement of each scene. */
  scenes: {
    gallery: { z: -20 },
    tunnel: { from: -34, to: -66 },
    beam: { z: -84 },
    notes: { x: -19, z: -93 },
    alley: { from: -103, to: -136 },
  },

  /** Head particles fly apart while progress moves through this range. */
  explode: [0.0, 0.11] as [number, number],

  /** Page length in viewport heights. More = slower flight per scroll tick. */
  scrollLengthVh: 960,

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

/**
 * The hero portrait.
 * mode 'photo': particles sampled from src/assets/portrait.jpg or a frame sequence (default).
 * mode 'cubes': the procedural cube head built from face-depth.png / face-color.png.
 * sequence: set after running scripts/video-to-frames.sh, e.g. { count: 48, pattern: 'frame_%04d.webp', fps: 24 }.
 */
export const HEAD = {
  mode: 'photo' as 'photo' | 'cubes',
  sequence: null as null | { count: number; pattern: string; fps: number },
  /** Particle point size (world-scaled). */
  pointSize: 34,
}
