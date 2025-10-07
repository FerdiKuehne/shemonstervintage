precision highp float;
uniform sampler2D objTex, pano;
uniform vec2 resolution;
uniform float fovY, aspect;
uniform mat3 camBasis;
uniform vec3 rotXYZ;
const float PI = 3.141592653589793;
vec3 rayFromNDC(vec2 ndc) {
    float t = tan(0.5 * fovY);
    vec3 dCam = normalize(vec3(ndc.x * aspect * t, ndc.y * t, -1.0));
    return normalize(camBasis * dCam);
}
vec3 applyEulerXYZ(vec3 v, vec3 r) {
    float cx = cos(r.x), sx = sin(r.x), cy = cos(r.y), sy = sin(r.y), cz = cos(r.z), sz = sin(r.z);
    v = vec3(v.x, cx * v.y - sx * v.z, sx * v.y + cx * v.z);
    v = vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    v = vec3(cz * v.x - sz * v.y, sz * v.x + cz * v.y, v.z);
    return v;
}
vec3 samplePano(vec3 dir, vec3 rot) {
    dir = normalize(applyEulerXYZ(dir, rot));
    float u = fract(atan(dir.z, dir.x) / (2.0 * PI) + 0.5);
    float v = clamp(asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5, 0.0, 1.0);
    return texture2D(pano, vec2(u, v)).rgb;
}

void main() {
    vec2 ndc = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
    vec3 dir = rayFromNDC(ndc);
    vec3 panoCol = samplePano(dir, rotXYZ);
    vec2 uvRect = ndc * 0.5 + 0.5;
    vec4 objCol = vec4(0.0);
    if(all(greaterThanEqual(uvRect, vec2(0.0))) && all(lessThanEqual(uvRect, vec2(1.0))))
        objCol = texture2D(objTex, uvRect);
    gl_FragColor = vec4(mix(panoCol, objCol.rgb, objCol.a), 1.0);
}