// Curved grid over the hero: barrel warp, slow noise, a lens around the pointer.
uniform float uTime;
uniform vec2 uMouse;     // -1..1
uniform float uOpacity;
uniform float uAspect;
uniform vec3 uColor;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float r = length(p);

  vec2 q = p * (1.0 + 0.18 * r * r);                       // barrel
  q += 0.06 * vec2(noise(q * 1.3 + uTime * 0.12), noise(q * 1.3 - uTime * 0.1)) - 0.03;
  vec2 m = uMouse * vec2(uAspect, 1.0);
  vec2 dm = q - m;
  q -= dm * 0.35 * exp(-dot(dm, dm) * 3.5);                // lens toward the pointer

  vec2 gv = q * 9.0;
  vec2 w = fwidth(gv);
  vec2 gl = abs(fract(gv - 0.5) - 0.5) / w;
  float line = 1.0 - min(min(gl.x, gl.y), 1.0);

  float fade = smoothstep(1.55, 0.35, r) * (0.55 + 0.45 * exp(-dot(dm, dm) * 2.0));
  gl_FragColor = vec4(uColor * line, line * fade * uOpacity);
}
