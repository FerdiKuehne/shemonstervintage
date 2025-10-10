precision highp float;

uniform sampler2D objTex, pano;
uniform vec2  resolution;
uniform float fovY, aspect;
uniform mat3  camBasis;
uniform vec3  rotXYZ;

uniform float uTime;          // Sekunden
uniform float uPeriod;        // Sek./Durchlauf (Default 5)
uniform float uDesat;         // -1..+1   (leicht entsättigen rund um 0)
uniform float uVignette;      // 0..1     (Vignette-Boost)
uniform float uScanlines;     // 0..1
uniform float uTriad;         // 0..1

const float PI = 3.141592653589793;

// ---------- Kamera / Sampling ----------
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
    float v = clamp(asin(clamp(dir.y,-1.0,1.0))/PI+0.5,0.0,1.0);
    return texture2D(pano, vec2(u, v)).rgb;
}
vec3 sampleScene(vec2 ndc){
    vec3 dir = rayFromNDC(ndc);
    vec3 panoCol = samplePano(dir, rotXYZ);
    vec2 uvRect = ndc*0.5 + 0.5;
    vec4 objCol = vec4(0.0);
    if(all(greaterThanEqual(uvRect, vec2(0.0))) && all(lessThanEqual(uvRect, vec2(1.0))))
        objCol = texture2D(objTex, uvRect);
    return mix(panoCol, objCol.rgb, objCol.a);
}

// ---------- Utils ----------
float luma709(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
float hash1(float x){ return fract(sin(x*1.6180339)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main(){
    vec2 res  = max(resolution, vec2(1.0));
    vec2 frag = gl_FragCoord.xy;
    vec2 ndc  = frag/res*2.0 - 1.0;
    float x01 = frag.x/res.x;
    float y01 = frag.y/res.y;
    float t   = uTime;

    vec3 color = sampleScene(ndc);

    // ===== CRT: Scanlines + RGB Triad (dezent) =====
    float scanAmt  = clamp(0.6 + uScanlines, 0.0, 2.0);
    float triadAmt = clamp(0.5 + uTriad,     0.0, 2.0);

    // horizontale Scanlines (leicht)
    float line = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159 + t*0.15);
    color *= 1.0 - 0.28 * scanAmt * (1.0 - line);

    // vertikale RGB-Subpixel-Maske
    float triadFreq = 1.3;
    float ph = t*0.3;
    float rM = 0.7 + 0.3 * sin((x01*res.x*triadFreq)*2.0*PI + ph + 0.0);
    float gM = 0.7 + 0.3 * sin((x01*res.x*triadFreq)*2.0*PI + ph + 2.0944);
    float bM = 0.7 + 0.3 * sin((x01*res.x*triadFreq)*2.0*PI + ph + 4.1888);
    vec3 triadMask = mix(vec3(1.0), vec3(rM,gM,bM), 0.25 * triadAmt);
    color *= triadMask;

    // ===== Rolling Stripes – deterministisch, alle ~5s =====
    float period = (uPeriod<=0.0) ? 5.0 : uPeriod;  // Default 5 s
    float cycle  = floor(t/period);
    float phase  = fract(t/period);                 // 0..1 pro Durchlauf

    // 1–2 Stripes pro Durchlauf
    int count = (hash1(cycle*3.3) > 0.6) ? 2 : 1;

    // Lebensdauer (Anteil der Periode) + sanftes Fade
    float lifeFrac = 0.55;
    float fadeFrac = 0.18;

    for (int i=0; i<2; i++){
        if (i>=count) break;

        float seed   = cycle*17.17 + float(i)*4.2;

        // Startzeit (bei 2 Stripes leicht versetzt)
        float start  = (count==2) ? mix(0.05, 0.20, hash1(seed*1.7)) + float(i)*0.08
                                  : mix(0.20, 0.35, hash1(seed*1.7));
        float endT   = start + lifeFrac;

        // Aktiv-Phase 0/1 (Variable nicht 'active' nennen -> Reserviert!)
        float actv = step(start, phase) * (1.0 - step(endT, phase));
        if (actv < 0.5) continue;

        // Zeitnormierung + weicher Envelope
        float p = clamp((phase - start)/max(1e-4, lifeFrac), 0.0, 1.0);
        float fadeIn  = smoothstep(0.0,        fadeFrac,     p);
        float fadeOut = smoothstep(1.0, 1.0 -  fadeFrac,     p);
        float env = fadeIn * fadeOut;

        // vertikale Position (oben -> unten)
        float yC = 1.0 - p;

        // räumliche weiche Maske
        float w     = mix(0.008, 0.020, hash1(seed*3.1));
        float mask  = smoothstep(w, 0.0, abs(y01 - yC)) * env;

        // Stärke + Polarität
        float amp   = mix(0.03, 0.07,  hash1(seed*5.9));
        float sign  = (hash1(seed*7.7) > 0.5) ? 1.0 : -1.0;

        // Körnung entlang der Linie
        float grain = hash2(vec2(floor(x01*res.x*0.6), cycle))*0.5 + 0.5;

        // --- farbige Stripes: Luma + Farb-Tint separat ---

        // 1) Luminanz-Flash (hell/dunkel)
        float lumDelta = amp * sign * mask * (0.85 + 0.15*grain);
        color += vec3(lumDelta);

        // 2) Farb-Tint (magenta ODER grün), unabhängig vom Vorzeichen
        float pick = hash1(seed*11.3);
        vec3 tintMag = vec3(1.12, 0.92, 1.10);  // magenta-ish
        vec3 tintGrn = vec3(0.92, 1.12, 0.95);  // grün-ish
        vec3 tintCol = (pick > 0.5) ? tintMag : tintGrn;

        // dezent, mit Fade gekoppelt
        float tintAmt  = mix(0.08, 0.18, hash1(seed*12.7)) * env;
        float tintMask = tintAmt * mask;

        // Multiplikatives, farbiges „Bleeding“
        color = mix(color, color * tintCol, tintMask);
    }

    // ===== leicht entsättigen + sanfte Vignette =====
    float gray = luma709(color);
    float sat  = clamp(1.0 - (0.10 + uDesat*0.5), 0.0, 1.2); // ~10% weniger Farbe
    color = mix(vec3(gray), color, sat);

    float R = length(ndc);
    float vig = smoothstep(0.35, 1.0, R);
    float vigStrength = clamp(0.5 + uVignette, 0.0, 1.5);    // sanfter
    color *= mix(1.0, 1.0 - 0.35*vigStrength, vig);

    gl_FragColor = vec4(clamp(color,0.0,1.0), 1.0);
}
