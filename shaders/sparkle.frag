// Sparkle - twinkling points on a dim background for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Sparkle color hue
//   Force 2  (1-10) = Background color hue
//   Nb Items (0-10) = Sparkle density (more items = more points)
//   Speed           = Twinkle speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.15);

    float density = max(iNbItems + 0.0, 1.0) * 2.0;

    // Grid of sparkle cells
    vec2 cell = floor(uv * density);
    float rnd = hash(cell);

    // Each cell twinkles at its own phase and rate
    float twinkle = sin(iTime * (2.0 + rnd * 4.0) + rnd * 6.28);
    twinkle = max(0.0, twinkle);
    twinkle = pow(twinkle, 4.0);

    // Only some cells are active sparkles
    float active = step(0.6, rnd);
    twinkle *= active;

    vec3 col = mix(color2, color1, twinkle);
    fragColor = vec4(col, 1.0);
}
