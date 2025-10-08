precision highp float;

uniform sampler2D objTex, pano;
uniform vec2  resolution;
uniform float fovY, aspect;
uniform mat3  camBasis;
uniform vec3  rotXYZ;

// --- Look-Regler (alle optional; es gibt Basiseffekte auch bei 0) ---
uniform float uTime;        // Zeit in Sekunden
uniform float uVhsAmount;   // 0..1  Tape-Wobble/Jitter
uniform float uGrain;       // 0..1  Filmkorn
uniform float uScanline;    // 0..1  Scanlines
uniform float uVignette;    // 0..1  Vignette

const float PI = 3.141592653589793;

// ====== Kamera / Pano ======
vec3 rayFromNDC(vec2 ndc) {
    float t = tan(0.5 * fovY);
    vec3 dCam = normalize(vec3(ndc.x * aspect * t, ndc.y * t, -1.0));
    return normalize(camBasis * dCam);
}
vec3 applyEulerXYZ(vec3 v, vec3 r) {
    float cx=cos(r.x), sx=sin(r.x);
    float cy=cos(r.y), sy=sin(r.y);
    float cz=cos(r.z), sz=sin(r.z);
    v = vec3(v.x, cx*v.y - sx*v.z, sx*v.y + cx*v.z);
    v = vec3(cy*v.x + sy*v.z, v.y, -sy*v.x + cy*v.z);
    v = vec3(cz*v.x - sz*v.y, sz*v.x + cz*v.y, v.z);
    return v;
}
vec3 samplePano(vec3 dir, vec3 rot) {
    dir = normalize(applyEulerXYZ(dir, rot));
    float u = fract(atan(dir.z, dir.x) / (2.0*PI) + 0.5);
    float v = clamp(asin(clamp(dir.y,-1.0,1.0))/PI + 0.5, 0.0, 1.0);
    return texture2D(pano, vec2(u, v)).rgb;
}

// ====== Utils / Look ======
float luma709(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

// sanfte 1D-Noise aus Hash-Interleaving (für Grain/Dropouts)
float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

void main() {
    // -------- Basiseinstellungen (geben auch bei 0-Uniforms einen Look) --------
    float vhsBase   = 0.7;  // Grundstärke Wobble/Jitter
    float grainBase = 0.25; // Grund-Grain
    float scanBase  = 0.6;  // Grund-Scanlines
    float vigBase   = 0.65; // Grund-Vignette

    float vhsAmt = clamp(vhsBase   + uVhsAmount, 0.0, 1.7);
    float grAmt  = clamp(grainBase + uGrain,     0.0, 1.5);
    float scAmt  = clamp(scanBase  + uScanline,  0.0, 1.5);
    float vgAmt  = clamp(vigBase   + uVignette,  0.0, 1.5);

    // -------- VHS: Tape-Wobble / Jitter (NDC-Offset pro Scanline) --------
    vec2 ndc = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
    float y01 = gl_FragCoord.y / max(resolution.y, 1.0);

    // Mehrfrequente horizontale Wellen + Gate-Weave (subpixel)
    float wobble =
        0.0035 * sin(uTime*6.0   + y01*80.0) +
        0.0018 * sin(uTime*23.0  + y01*240.0);
    float weaveX = 0.0015 * sin(uTime*0.7);
    float weaveY = 0.0010 * sin(uTime*0.53 + 1.7);

    // sporadische "line tear" Dropouts (kurze Linienversätze)
    float rowRand = hash(vec2(floor(gl_FragCoord.y*0.25), floor(uTime*24.0)));
    float lineTear = (rowRand > 0.995) ? (0.02 * (rowRand - 0.995) / 0.005) : 0.0;

    ndc.x += vhsAmt * (wobble + weaveX + lineTear);
    ndc.y += vhsAmt * (weaveY);

    // -------- Szene samplen (mit verzerrtem NDC) --------
    vec3 dir = rayFromNDC(ndc);
    vec3 panoCol = samplePano(dir, rotXYZ);

    vec2 uvRect = ndc * 0.5 + 0.5;
    vec4 objCol = vec4(0.0);
    if (all(greaterThanEqual(uvRect, vec2(0.0))) && all(lessThanEqual(uvRect, vec2(1.0)))) {
        objCol = texture2D(objTex, uvRect);
    }

    vec3 color = mix(panoCol, objCol.rgb, objCol.a);

    // -------- 90s Skate-Video Grading: BW + etwas heller + leicht mehr Kontrast --------
    float g = luma709(color);
    color = vec3(g);
    color *= exp2(0.35);                 // ~ +0.35 EV
    color = (color - 0.5) * 1.05 + 0.5;  // dezenter Kontrast
    color = clamp(color, 0.0, 1.0);

    // -------- Scanlines (helle/ dunkle Zeilen modulieren) --------
    // sin-Variante für weiche Linien (NTSC-ish)
    float s = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159);
    color *= 1.0 - 0.18 * scAmt * (1.0 - s);

    // -------- Filmkorn (pro Frame, feines Luma-Grain) --------
    float gNoise = noise(gl_FragCoord.xy * 1.75 + uTime*60.0);
    color += (gNoise - 0.5) * 0.08 * grAmt;

    // -------- Dropouts/Head-Switch Noise (helle horizontale Störungen unten) --------
    float headBand = smoothstep(0.85, 1.0, y01);
    float headNoise = step(0.997, hash(vec2(floor(uTime*30.0), 7.0))) * headBand;
    color = mix(color, color + vec3(0.25), headNoise * 0.7);

    // -------- Vignette (auch „Death Lens“-Eindruck) --------
    float r = length(ndc);
    float vig = smoothstep(0.35, 1.0, r);
    color *= mix(1.0, 1.0 - 0.35 * vgAmt, vig);

    // kleine Clamps damit Weiß nicht ausfrisst
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}
