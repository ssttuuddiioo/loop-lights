// Fire - flame-like turbulence rising upward for ENTTEC ELM
//
// ELM Parameters:
//   Force    (1-10) = Flame tip hue (bright color)
//   Force 2  (1-10) = Flame base hue (dark/ember color)
//   Nb Items (0-10) = Turbulence intensity
//   Speed           = Animation speed (built-in ELM control)

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
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.3);

    float turb = max(iNbItems + 0.0, 1.0) * 0.5;
    float t = iTime * 1.5;

    // Layered sine turbulence
    float n = 0.0;
    n += sin(uv.x * turb * 4.0 + t * 1.1) * 0.3;
    n += sin(uv.x * turb * 8.0 - t * 0.9) * 0.2;
    n += sin((uv.x * 2.0 + uv.y) * turb * 3.0 + t * 1.3) * 0.25;

    // Flame shape: bright at bottom, fading up
    float flame = clamp(1.0 - uv.y + n * 0.5, 0.0, 1.0);
    flame = pow(flame, 1.5);

    vec3 col = mix(color2, color1, flame);
    fragColor = vec4(col, 1.0);
}
