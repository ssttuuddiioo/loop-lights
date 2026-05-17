// Color Wash - smooth ambient hue gradient for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Starting hue (maps across full color wheel)
//   Force 2  (1-10) = Hue spread (how much color varies across surface)
//   Nb Items (1-64) = Spatial waviness (1 = smooth gradient, higher = more undulation)
//   Speed           = Drift speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Starting hue from Force (1-10 mapped to 0-1)
    float baseHue = (iForce - 1.0) / 9.0;

    // Hue spread from Force 2 (1-10 mapped to 0-0.5 of the wheel)
    float spread = (iForce2 - 1.0) / 9.0 * 0.5;

    // Waviness from Nb Items (+0.0 converts int to float)
    float wave = max(iNbItems + 0.0, 1.0);

    // Slow drift
    float t = iTime * 0.08;

    // Base diagonal gradient
    float grad = (uv.x + uv.y) * 0.5;

    // Add gentle sine modulation for spatial variation
    float wobble = 0.0;
    if (wave > 1.5) {
        float w = wave * 0.15;
        wobble += sin(uv.x * w * 6.0 + t * 2.0) * 0.12;
        wobble += sin(uv.y * w * 5.0 - t * 1.5) * 0.10;
        wobble += sin((uv.x - uv.y) * w * 3.0 + t) * 0.08;
    }

    // Final hue: base + spread across surface + wobble + slow time drift
    float hue = fract(baseHue + grad * spread + wobble + t);

    // Full saturation, full brightness
    vec3 col = hsv2rgb(hue, 1.0, 1.0);
    fragColor = vec4(col, 1.0);
}
