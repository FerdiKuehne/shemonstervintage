precision highp float;
varying vec3 vWorldPos;
uniform vec3 color, ringColor, axisColor;
uniform float spacing, thickness, sphereRadius, planeY, ringOpacity, axisAlpha, axisThickness;
uniform bool clipToSphere;
float gridMask(vec2 p, float s, float t) {
    vec2 c = p / s;
    vec2 fw = max(fwidth(c), vec2(1e-6));
    vec2 g = abs(fract(c) - 0.5) / fw;
    float line = 1.0 - min(min(g.x, g.y) * (t * 50.0), 1.0);
    return line;
}
void main() {
    float h = planeY;
    float rEff2 = max(sphereRadius * sphereRadius - h * h, 0.0);
    float rEff = sqrt(rEff2);
    float r = length(vWorldPos.xz);
    if(clipToSphere && r > rEff + 1e-4)
        discard;
    float m = gridMask(vWorldPos.xz, spacing, thickness);
    float fade = 1.0;
    if(clipToSphere) {
        float d = clamp((rEff - r) / 0.2, 0.0, 1.0);
        fade = d;
    }
    float w = fwidth(r) * 1.5;
    float ring = 1.0 - smoothstep(w, w * 2.0, abs(r - rEff));
    float fx = fwidth(vWorldPos.x), fz = fwidth(vWorldPos.z);
    float halfW_x = max(axisThickness * fx, 1e-6), halfW_z = max(axisThickness * fz, 1e-6);
    float lineX = 1.0 - smoothstep(0.0, halfW_x, abs(vWorldPos.x));
    float lineZ = 1.0 - smoothstep(0.0, halfW_z, abs(vWorldPos.z));
    float axisMask = max(lineX, lineZ);
    vec3 finalCol = color;
    float finalAlpha = m * 0.85 * fade;
    finalCol = mix(finalCol, ringColor, clamp(ring * ringOpacity, 0.0, 1.0));
    finalAlpha = max(finalAlpha, ring * ringOpacity);
    finalCol = mix(finalCol, axisColor, clamp(axisMask * axisAlpha, 0.0, 1.0));
    finalAlpha = max(finalAlpha, axisMask * axisAlpha);
    if(finalAlpha <= 0.0)
        discard;
    gl_FragColor = vec4(finalCol, finalAlpha);
}