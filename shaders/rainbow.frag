// Rainbow - full spectrum sweep scrolling for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Starting hue offset
//   Force 2  (1-10) = Spectrum range (how much of the wheel to cover)
//   Nb Items (0-10) = Number of rainbow bands
//   Speed           = Scroll speed (built-in ELM control)

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float startHue = (iForce - 1.0) / 9.0;
    float range = (iForce2 - 1.0) / 9.0 + 0.5;
    float bands = max(iNbItems + 0.0, 1.0);

    float t = fract(uv.y * bands - iTime * 0.15);
    float hue = fract(startHue + t * range);

    vec3 col = hsv2rgb(hue, 1.0, 1.0);
    fragColor = vec4(col, 1.0);
}
