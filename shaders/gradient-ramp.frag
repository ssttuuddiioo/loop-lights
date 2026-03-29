// Gradient Ramp — looping scrolling gradient for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) → Color 1 hue (maps across full color wheel)
//   Force 2  (1-10) → Color 2 hue (maps across full color wheel)
//   Nb Items (1-64) → Tile count (number of gradient repeats)
//   Speed            → Scroll speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Colors from Force sliders (1-10 → full hue wheel)
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;

    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);

    // Tiles from Nb Items (+0.0 converts int to float)
    float tiles = max(iNbItems + 0.0, 1.0);

    // Scrolling gradient (Speed param controls iTime rate)
    float t = fract(uv.y * tiles - iTime * 0.2);

    vec3 col = mix(color1, color2, t);
    fragColor = vec4(col, 1.0);
}
