// Volumetric-looking light cone: bright core, soft edges, drifting dust noise, fading with distance from the source.
uniform float uTime;
uniform vec3 uColor;
uniform float uHeight;
varying vec3 vPos;
varying vec3 vNormalV;
varying vec3 vViewDir;

float hash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 51.3))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void main() {
  float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
  float core = pow(facing, 2.2);                       // brighter where we look through more of the cone
  float along = clamp((uHeight * 0.5 - vPos.y) / uHeight, 0.0, 1.0); // 0 at the source, 1 at the floor
  float fall = (1.0 - along * 0.75) * smoothstep(0.0, 0.08, along);
  float dust = 0.65 + 0.35 * noise(vPos * 1.6 + vec3(0.0, -uTime * 0.25, uTime * 0.1));
  float a = core * fall * dust;
  gl_FragColor = vec4(uColor * a * 1.6, a * 0.55);
}
