// Strobe - hard alternating flash between two colors for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Color 1 hue
//   Force 2  (1-10) = Color 2 hue
//   Nb Items (0-10) = Flash rate (higher = faster)
//   Speed           = Animation speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);

    float rate = max(iNbItems + 0.0, 1.0) * 2.0;
    float t = step(0.5, fract(iTime * rate));

    vec3 col = mix(color1, color2, t);
    fragColor = vec4(col, 1.0);
}
