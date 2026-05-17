// Plasma - organic sine-wave interference pattern for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Color 1 hue (maps across full color wheel)
//   Force 2  (1-10) = Color 2 hue (maps across full color wheel)
//   Nb Items (1-64) = Wave frequency / pattern density
//   Speed           = Animation speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Colors from Force sliders (1-10 mapped to full hue wheel)
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;

    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);

    // Scale factor from Nb Items (higher = tighter pattern)
    float freq = max(iNbItems + 0.0, 1.0) * 0.25;

    // Plasma: layered sine interference
    float t = iTime * 0.4;

    float v1 = sin(uv.x * freq * 10.0 + t);
    float v2 = sin(uv.y * freq * 8.0 - t * 0.7);
    float v3 = sin((uv.x + uv.y) * freq * 6.0 + t * 0.5);

    // Radial component for organic feel
    vec2 center = uv - 0.5;
    float dist = length(center);
    float v4 = sin(dist * freq * 12.0 - t * 0.9);

    // Combine and normalize to 0-1
    float plasma = (v1 + v2 + v3 + v4) * 0.25 * 0.5 + 0.5;

    // Mix between the two colors
    vec3 col = mix(color1, color2, plasma);
    fragColor = vec4(col, 1.0);
}
