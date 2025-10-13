precision highp float;

uniform sampler2D objTex, pano;
uniform vec2  resolution;     // Bildschirmgröße in Pixeln
uniform float fovY, aspect;
uniform mat3  camBasis;
uniform vec3  rotXYZ;

// RGB-Split-Parameter
uniform float uSplit;         // Pixelstärke des Splits (z.B. 2.0 .. 12.0)
uniform float uAngle;         // Winkel in Grad (nur linear)
uniform float uRadial;        // 0.0=linear, 1.0=radial
uniform vec2  uCenter;        // UV [0..1] Zentrum (radial), z.B. vec2(0.5, 0.5)
uniform float uFalloff;       // 0..3  Radial-Falloff (0=konstant, 1=linear, 2=quadratisch)
uniform float uMix;           // 0..1  Dry/Wet

const float PI = 3.141592653589793;

// ------------------------- Camera / Scene -------------------------
vec3 rayFromNDC(vec2 ndc){
    float t = tan(0.5 * fovY);
    vec3 dCam = normalize(vec3(ndc.x * aspect * t, ndc.y * t, -1.0));
    return normalize(camBasis * dCam);
}

vec3 applyEulerXYZ(vec3 v, vec3 r){
    float cx=cos(r.x), sx=sin(r.x);
    float cy=cos(r.y), sy=sin(r.y);
    float cz=cos(r.z), sz=sin(r.z);
    v = vec3(v.x, cx*v.y - sx*v.z, sx*v.y + cx*v.z);
    v = vec3(cy*v.x + sy*v.z, v.y, -sy*v.x + cy*v.z);
    v = vec3(cz*v.x - sz*v.y, sz*v.x + cz*v.y, v.z);
    return v;
}

vec3 samplePano(vec3 dir, vec3 rot){
    dir = normalize(applyEulerXYZ(dir, rot));
    float u = fract(atan(dir.z, dir.x)/(2.0*PI)+0.5);
    float v = clamp(asin(clamp(dir.y,-1.0,1.0))/PI+0.5, 0.0, 1.0);
    return texture2D(pano, vec2(u, v)).rgb;
}

vec3 sampleScene(vec2 ndc){
    vec3 dir = rayFromNDC(ndc);
    vec3 panoCol = samplePano(dir, rotXYZ);
    vec2 uvRect = ndc*0.5 + 0.5;
    vec4 objCol = vec4(0.0);
    if(all(greaterThanEqual(uvRect, vec2(0.0))) && all(lessThanEqual(uvRect, vec2(1.0)))) {
        objCol = texture2D(objTex, uvRect);
    }
    return mix(panoCol, objCol.rgb, objCol.a);
}

// --------------------------- Main ---------------------------
void main(){
    vec2 res  = max(resolution, vec2(1.0));
    vec2 frag = gl_FragCoord.xy;

    // Screen -> NDC [-1..1]
    vec2 ndc  = frag/res * 2.0 - 1.0;

    // Basisfarbe
    vec3 base = sampleScene(ndc);

    // Pixel -> NDC (1px == 2/res.x horizontally)
    float px = uSplit;
    vec2 offNDC;

    // Linearer Split: fester Winkel
    float ang = radians(uAngle);
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 dirNDC = normalize(dir * vec2(1.0, res.x/res.y)); // aspect-korrigiert

    // Radialer Split: vom Zentrum weg
    vec2 uv = frag / res;                   // [0..1]
    vec2 centerUV = clamp(uCenter, 0.0, 1.0);
    vec2 toCenter = (uv - centerUV);
    vec2 toCenterNDC = normalize(vec2(toCenter.x, toCenter.y) * vec2(1.0, res.x/res.y) + 1e-6);

    // Stärke/Falloff (radial), linear = 1.0
    float radialMask = clamp(uRadial, 0.0, 1.0);
    float fall = pow(clamp(length(toCenter)*1.414, 0.0, 1.0), max(0.0, uFalloff));
    float strength = mix(1.0, fall, radialMask);

    // finaler Offset in NDC
    offNDC = mix(dirNDC, toCenterNDC, radialMask) * (px * 2.0 / res.x) * max(0.0, strength);

    // Kanäle separat versetzen
    vec3 colR = sampleScene(ndc + offNDC);
    vec3 colG = sampleScene(ndc);
    vec3 colB = sampleScene(ndc - offNDC);

    vec3 splitCol = vec3(colR.r, colG.g, colB.b);

    // Dry/Wet
    vec3 color = mix(base, splitCol, clamp(uMix, 0.0, 1.0));

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
