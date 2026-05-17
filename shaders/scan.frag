// Scan - sweeping beam of light for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Beam color hue
//   Force 2  (1-10) = Background color hue
//   Nb Items (0-10) = Beam width (higher = thinner beam)
//   Speed           = Sweep speed (built-in ELM control)

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
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.15);

    float width = 1.0 / max(iNbItems + 0.0, 1.0);
    float pos = fract(iTime * 0.3);

    float dist = abs(uv.y - pos);
    dist = min(dist, 1.0 - dist);

    float beam = smoothstep(width, 0.0, dist);

    vec3 col = mix(color2, color1, beam);
    fragColor = vec4(col, 1.0);
}
