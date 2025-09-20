uniform sampler2D uTexture;
uniform float uTime;
uniform float uAmplitude; // 0.0 = clean pano, 1.0 = warp drive

varying vec3 vNormal;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Flip horizontally if needed (inside sphere)
    if (vNormal.z > 0.0) {
        uv.x = 1.0 - uv.x;
    }

    // If amplitude is 0.0 → render normal pano
    if (uAmplitude < 0.001) {
        gl_FragColor = texture2D(uTexture, uv);
        return;
    }

    // --- Warp Drive Effect ---
    vec2 center = uv - 0.5;
    float radius = length(center);
    float angle = atan(center.y, center.x);

    float speed = uTime * 2.0;

    // Tunnel distortion
    radius += uAmplitude * 0.3 * sin(speed + radius * 5.0);
    angle  += uAmplitude * 0.5 * sin(speed * 0.5 + radius * 20.0);

    // Convert back
    vec2 warped = vec2(cos(angle), sin(angle)) * radius;

    // Chromatic aberration
    vec2 shift = 0.002 * center * uAmplitude;
    vec4 texR = texture2D(uTexture, warped + 0.5 + shift);
    vec4 texG = texture2D(uTexture, warped + 0.5);
    vec4 texB = texture2D(uTexture, warped + 0.5 - shift);

    gl_FragColor = vec4(texR.r, texG.g, texB.b, 1.0);
}
