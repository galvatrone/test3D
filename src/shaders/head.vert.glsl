// Cube head. One instance per face pixel.
// aOffset.xy: position on the face plane, aOffset.z: relief height (the cube is extruded to it).
attribute vec3 aOffset;
attribute vec3 aColor;
attribute float aRand;
attribute vec3 aSurfN;
attribute float aBack;

uniform float uTime;
uniform float uCell;
uniform float uProgress;   // 0 = intact head, 1 = fully scattered
uniform vec2 uMouse;       // pointer on the face plane (local units)
uniform float uMouseStrength;
uniform float uMaxDepth;

varying vec3 vColor;
varying vec3 vNormal;
varying float vFront;
varying float vFade;
varying float vRand;

mat3 rot(vec3 axis, float a) {
  axis = normalize(axis);
  float s = sin(a), c = cos(a), oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,          oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
  );
}

void main() {
  // scatter amount for this cube (staggered by aRand)
  float t = clamp((uProgress - aRand * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  // each cube spans from the back of the skull to the face relief; once it flies off it becomes a plain cube
  float front = max(aOffset.z, uCell);
  float shrink = smoothstep(0.0, 0.07, t);
  float h = mix(front + aBack, uCell * 1.4, shrink);
  vec3 p = position * vec3(uCell * 0.8, uCell * 0.8, h);
  vec3 c = vec3(aOffset.xy, mix((front - aBack) * 0.5, front, shrink));

  // living surface: a slow wave plus per-cube jitter
  c.z += sin(uTime * 1.1 + aOffset.y * 3.0 + aOffset.x * 1.5) * 0.02 + (aRand - 0.5) * 0.015;

  // pointer: cubes near the cursor rise out of the face
  float md = distance(aOffset.xy, uMouse);
  c.z += uMouseStrength * 0.42 * exp(-md * md * 9.0);

  // scatter away from the camera axis (the local z axis through the head centre)
  vec2 radial = aOffset.xy + (vec2(aRand, fract(aRand * 7.31)) - 0.5) * 0.6;
  radial = normalize(radial + vec2(1e-4));
  vec3 dir = vec3(radial * (1.0 + aRand), (fract(aRand * 13.7) - 0.65) * 1.6);
  c += dir * t * (2.5 + aRand * 8.0);

  mat3 R = rot(vec3(fract(aRand * 3.1) - 0.5, fract(aRand * 5.7) - 0.5, 0.4), smoothstep(0.07, 1.0, t) * 7.0 * (aRand - 0.5));
  p = R * p;

  vec4 mv = modelViewMatrix * vec4(p + c, 1.0);
  gl_Position = projectionMatrix * mv;

  vColor = aColor;
  // mostly the face surface normal, with some of the cube's own face so edges still read
  vNormal = normalize(normalMatrix * (R * normalize(aSurfN * 0.8 + normal * 0.45)));
  vFront = aOffset.z / uMaxDepth;
  vFade = 1.0 - t * 0.8;
  vRand = aRand;
}
