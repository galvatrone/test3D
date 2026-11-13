// Portrait made of particles. One particle per pixel of the photo grid.
// aPosA/aColA = current frame, aPosB/aColB = next frame (for frame-by-frame sequences).
attribute vec3 aPosA;
attribute vec3 aPosB;
attribute vec4 aColA;   // rgb + mask (0 = background)
attribute vec4 aColB;
attribute vec3 aScatter; // where the particle waits before assembling
attribute float aRand;

uniform float uTime;
uniform float uFrameMix;
uniform float uAssemble;   // 0 = cloud, 1 = portrait
uniform float uProgress;   // flight scatter, 0..1
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform vec2 uBurst;       // click point on the portrait plane
uniform float uBurstAge;   // seconds since the click (large = no burst)
uniform float uSize;
uniform float uPixelRatio;

varying vec4 vCol;
varying float vGlow;

void main() {
  vec3 target = mix(aPosA, aPosB, uFrameMix);
  vec4 col = mix(aColA, aColB, uFrameMix);

  // assemble: top rows arrive first, each particle with its own delay, spiralling in
  float delay = aRand * 0.4 + (1.0 - clamp((target.y + 1.9) / 3.8, 0.0, 1.0)) * 0.3;
  float a = smoothstep(delay, delay + 0.4, uAssemble);
  float ang = (1.0 - a) * (2.5 + aRand * 3.0);
  vec3 from = aScatter;
  from.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * from.xz;
  vec3 p = mix(from, target, a * a * (3.0 - 2.0 * a));

  // breathing surface
  p.z += sin(uTime * 1.3 + target.y * 5.0 + aRand * 6.2831) * 0.015;

  // pointer pushes particles aside and toward the viewer
  // pointer lifts the photo toward the viewer like a lens, without smearing it sideways
  vec2 dm = p.xy - uMouse;
  float m = exp(-dot(dm, dm) * 3.5) * uMouseStrength;
  p.z += m * 1.0;

  // click: a ring wave that runs out from the click point and fades
  vec2 db = p.xy - uBurst;
  float dist = length(db);
  float wave = exp(-pow(dist - uBurstAge * 1.7, 2.0) * 7.0) * exp(-uBurstAge * 0.85);
  p.xy += normalize(db + 1e-4) * wave * 0.55;
  p.z += wave * (1.0 + aRand * 1.2);

  // flight: scatter away from the camera axis
  float t = clamp((uProgress - aRand * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec2 radial = normalize(target.xy + (vec2(aRand, fract(aRand * 7.31)) - 0.5) * 0.6 + 1e-4);
  p += vec3(radial * (1.0 + aRand), (fract(aRand * 13.7) - 0.65) * 1.6) * t * (2.5 + aRand * 8.0);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.75 + aRand * 0.5) * (1.0 + wave * 1.5 + (1.0 - a) * 0.6 + m * 0.8);
  gl_PointSize = col.a < 0.5 ? 0.0 : min(size * uPixelRatio / -mv.z, 18.0 * uPixelRatio);

  vCol = vec4(col.rgb, col.a * (0.35 + 0.65 * a) * (1.0 - t * 0.7));
  vGlow = wave + m * 0.25 + (1.0 - a) * 0.8;
}
