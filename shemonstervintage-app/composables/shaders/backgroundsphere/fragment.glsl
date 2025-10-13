// fragment.glsl
precision mediump float;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uAmplitude;   // 0.0 = clean pano, 1.0 = warp drive
uniform float uOffset;      // NEU: 0..1 (entspricht 0..360°)

varying vec3 vNormal;
varying vec2 vUv;


vec4 tex = texture2D(uTexture, vUv);
tex.rgb *= 1.3; // 30% heller
gl_FragColor = tex;

void main() {
    // Basis-UV (inkl. Flip für inside sphere)
    vec2 uv0 = vUv;
    if (vNormal.z > 0.0) {
        uv0.x = 1.0 - uv0.x;
    }

    // --- Kein Warp: nur Panorama-Offset zyklisch in X ---
    if (uAmplitude < 0.001) {
        vec2 uvClean = uv0;
        uvClean.x = fract(uvClean.x + uOffset);   // zyklischer Shift
        gl_FragColor = texture2D(uTexture, uvClean);
        return;
    }

    // -------- Warp-Drive (Geometrie unabhängig vom Offset berechnen) --------
    vec2 center = uv0 - 0.5;
    float radius = length(center);
    float angle = atan(center.y, center.x);

    float speed = uTime * 2.0;

    // Tunnel distortion
    radius += uAmplitude * 0.3 * sin(speed + radius * 5.0);
    angle  += uAmplitude * 0.5 * sin(speed * 0.5 + radius * 20.0);

    // Zurück in UV
    vec2 warped = vec2(cos(angle), sin(angle)) * radius;
    vec2 uvWarp = warped + 0.5;

    // Chromatic aberration
    vec2 shift = 0.002 * center * uAmplitude;

    // Panorama-Offset NACH der Verzerrung addieren (nur X zyklisch)
    vec2 uvR = uvWarp + shift;
    vec2 uvG = uvWarp;
    vec2 uvB = uvWarp - shift;

    uvR.x = fract(uvR.x + uOffset);
    uvG.x = fract(uvG.x + uOffset);
    uvB.x = fract(uvB.x + uOffset);

    // (Y lassen wir unclamped, da 0..1 ohnehin nicht verlassen wird; sonst clampen:)
    // uvR.y = clamp(uvR.y, 0.0, 1.0); uvG.y = clamp(uvG.y, 0.0, 1.0); uvB.y = clamp(uvB.y, 0.0, 1.0);

    vec4 texR = texture2D(uTexture, uvR);
    vec4 texG = texture2D(uTexture, uvG);
    vec4 texB = texture2D(uTexture, uvB);

    gl_FragColor = vec4(texR.r, texG.g, texB.b, 1.0);
}