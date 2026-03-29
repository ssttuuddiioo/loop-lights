// Gradient Ramp — looping scrolling gradient for ENTTEC ELM
//
// Controls:
//   Stage RGB  → Color 1 (set via stage controller color picker)
//   Hue param  → Color 2 (0-360, set via ELM parameter panel)
//   Force      → Tile count (1-10 repeats)
//   Speed-Ex   → Scroll speed (negative = reverse)
//
// The stage RGB acts as a tint on the shader output.
// Where the shader outputs white → you see the stage color.
// Where it outputs color 2 → you see color 2 blended with stage tint.
// For cleanest two-color gradient: set stage color to white and
// use Force 2 (iForce2) range as color 1 hue instead.

// --- HSV to RGB conversion ---
vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // --- Parameters ---
    float tiles = max(iForce, 1.0);        // tile count: 1–10
    float speed = iSpeedEx * 0.15;          // scroll speed (scaled down for smooth motion)
    float hue2  = iHue / 360.0;            // second color hue (0–1)

    // --- Scrolling tiled gradient ---
    // fract() wraps the gradient so it loops seamlessly
    float t = fract(uv.y * tiles - iTime * speed);

    // --- Colors ---
    // Color 1: pure white (will be tinted by stage RGB to become the "first color")
    vec3 color1 = vec3(1.0);

    // Color 2: derived from the Hue parameter, full saturation + brightness
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);

    // --- Gradient ---
    vec3 col = mix(color1, color2, t);

    fragColor = vec4(col, 1.0);
}
