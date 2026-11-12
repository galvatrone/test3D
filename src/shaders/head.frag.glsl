uniform vec3 uGlow;
uniform float uIntro; // 0..1 brightness ramp on load

varying vec3 vColor;
varying vec3 vNormal;
varying float vFront;
varying float vFade;
varying float vRand;

void main() {
  vec3 n = normalize(vNormal);
  vec3 key = normalize(vec3(-0.55, 0.5, 0.65));
  vec3 rimDir = normalize(vec3(0.9, 0.2, -0.35));
  float diff = max(dot(n, key), 0.0);
  float rim = pow(max(dot(n, rimDir), 0.0), 3.0);

  // light level -> ink / ion / bone ramp, so the head reads as one lit object
  float l = (0.12 + 0.88 * diff) * (0.5 + 0.5 * smoothstep(0.05, 0.9, vFront)) * (0.84 + 0.32 * vRand);
  vec3 ink = vec3(0.025, 0.03, 0.07);
  vec3 ion = uGlow * 0.42;
  vec3 bone = vec3(0.93, 0.9, 0.84);
  vec3 ramp = l < 0.5 ? mix(ink, ion, l * 2.0) : mix(ion, bone, (l - 0.5) * 2.0);
  vec3 col = mix(ramp, ramp * vColor * 1.25, 0.35);
  col += bone * smoothstep(0.82, 1.0, l) * 0.42 * vFade;   // highlights pass 1.0 -> bloom
  col += uGlow * rim * 0.5;
  col *= vFade * uIntro;

  gl_FragColor = vec4(col, 1.0);
}
