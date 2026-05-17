// Uniform Test - experiment to discover which ELM uniforms work
//
// CONFIRMED WORKING:
//   iTime, iResolution, iForce (1-10), iForce2 (1-10), iNbItems (1-64)
//
// TESTING (may or may not be passed by ELM):
//   iZoom, iRotate, iSpeedFx, iCount
//
// After loading into ELM, check GET /elm/media/slots/{id}/parameters
// to see which parameters appear. The visual output encodes which
// uniforms are receiving non-zero values.

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Confirmed uniforms - left half of screen
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    float tiles = max(iNbItems + 0.0, 1.0);
    float t = fract(uv.y * tiles - iTime * 0.2);

    vec3 confirmed = mix(hsv2rgb(hue1, 1.0, 1.0), hsv2rgb(hue2, 1.0, 1.0), t);

    // Experimental uniforms - right half shows diagnostic bars
    // Each bar lights up if the uniform has a non-zero value
    float barH = 0.2;
    vec3 testColor = vec3(0.0);

    // Bar 1 (bottom): iZoom
    if (uv.y < barH) {
        testColor = vec3(0.0, iZoom * 0.5, 0.0);
    }
    // Bar 2: iRotate
    else if (uv.y < barH * 2.0) {
        testColor = vec3(iRotate / 360.0, 0.0, 0.0);
    }
    // Bar 3: iSpeedFx
    else if (uv.y < barH * 3.0) {
        testColor = vec3(0.0, 0.0, iSpeedFx * 0.5);
    }
    // Bar 4: iCount
    else if (uv.y < barH * 4.0) {
        testColor = vec3(iCount / 64.0, iCount / 64.0, 0.0);
    }
    // Bar 5 (top): confirmed iForce for reference
    else {
        testColor = hsv2rgb(hue1, 1.0, 1.0);
    }

    // Left half = confirmed gradient, right half = test bars
    vec3 col = uv.x < 0.5 ? confirmed : testColor;
    fragColor = vec4(col, 1.0);
}
