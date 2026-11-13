uniform float uIntro;
varying vec4 vCol;
varying float vGlow;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float alpha = smoothstep(0.5, 0.18, d) * vCol.a * uIntro;
  if (alpha < 0.02) discard;
  float lum = dot(vCol.rgb, vec3(0.299, 0.587, 0.114));
  // bright pixels and disturbed particles pass 1.0 so bloom catches them
  vec3 col = vCol.rgb * (0.85 + smoothstep(0.65, 1.0, lum) * 0.7) + vec3(0.55, 0.62, 1.0) * vGlow * 0.9;
  gl_FragColor = vec4(col, alpha);
}
