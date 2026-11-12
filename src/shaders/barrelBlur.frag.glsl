// Transition lens: barrel distortion plus a radial blur, both scaled by uStrength (scroll speed).
uniform float uStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  float k = 0.42 * uStrength;
  vec2 warped = 0.5 + c * (1.0 + k * r2) / (1.0 + k * 0.25);

  // radial blur toward the centre, stronger at the edges
  vec2 dir = (warped - 0.5) * 0.085 * uStrength;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 10; i++) {
    float f = float(i) / 9.0;
    acc += texture2D(inputBuffer, clamp(warped - dir * f, 0.001, 0.999));
  }
  outputColor = mix(inputColor, acc / 10.0, smoothstep(0.0, 0.05, uStrength));
}
