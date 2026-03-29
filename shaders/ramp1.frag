// Gradient Ramp - looping scrolling gradient for ENTTEC ELM
//
// ELM Parameters:
//   Force      (1-10)    = Color 1 hue (full color wheel)
//   Force 2    (1-10)    = Color 2 hue (full color wheel)
//   Nb Items   (1-64)    = Tile count
//   Speed                = Scroll speed (built-in ELM control)
//
// EXPERIMENTAL - testing if ELM passes Position X as uniform:
//   Position X  (-1-1)   = Blur amount (iPositionX)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;

    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);

    float tiles = max(iNbItems + 0.0, 1.0);

    float t = fract(uv.y * tiles - iTime * 0.2);

    // Blur: use iPositionX (-1 to 1) mapped to blur amount
    float blur = abs(iPositionX) * 0.5;
    if (blur > 0.001) {
        t = smoothstep(0.0 + blur, 0.5, t) - smoothstep(0.5, 1.0 - blur, t);
        t = clamp(t, 0.0, 1.0);
    }

    vec3 col = mix(color1, color2, t);
    fragColor = vec4(col, 1.0);
}
