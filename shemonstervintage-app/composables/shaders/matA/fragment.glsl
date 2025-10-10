precision highp float;

uniform sampler2D objTex, pano;
uniform vec2  resolution;
uniform float fovY, aspect;
uniform mat3  camBasis;
uniform vec3  rotXYZ;

uniform float uTime;            // Sekunden

// Regler (haben sinnvolle Defaults; es läuft auch ohne Setzen)
uniform float uDesat;           // -1..+1 (0=Basis ~10% rausgenommen)
uniform float uVignette;        // 0..1   (0=Basis, >0 stärker)
uniform float uScanlines;       // 0..1   (0=Basis, >0 stärker)
uniform float uTriad;           // 0..1   (RGB-Subpixel/Masken-Effekt)
uniform float uInterference;    // 0..1   (diagonale Farbbänder)
uniform float uStripes;         // 0..1   (horizontale Flash-Stripes Stärke)
uniform float uStripeRate;      // 0..2   (Häufigkeit der Stripes)

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
    return texture2D(pano, vec2(u,v)).rgb;
}
vec3 sampleScene(vec2 ndc){
    vec3 dir = rayFromNDC(ndc);
    vec3 panoCol = samplePano(dir, rotXYZ);
    vec2 uvRect = ndc*0.5+0.5;
    vec4 objCol = vec4(0.0);
    if(all(greaterThanEqual(uvRect, vec2(0.0))) && all(lessThanEqual(uvRect, vec2(1.0))))
        objCol = texture2D(objTex, uvRect);
    return mix(panoCol, objCol.rgb, objCol.a);
}

// ---------- Utils ----------
float luma709(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float hash1(float x){ return fract(sin(x*1.6180339) * 43758.5453); }

// ---------- Hauptshader ----------
void main(){
    vec2 res  = max(resolution, vec2(1.0));
    vec2 frag = gl_FragCoord.xy;
    vec2 ndc  = frag/res*2.0 - 1.0;
    float x01 = frag.x/res.x;
    float y01 = frag.y/res.y;
    float t   = uTime;

    // Szene
    vec3 color = sampleScene(ndc);

    // ================== CRT MASK + SCANLINES ==================
    // Basisstärken (damit’s sofort „richtig“ aussieht)
    float scanAmt  = clamp(0.70 + uScanlines, 0.0, 2.0); // Liniendunklung
    float triadAmt = clamp(0.60 + uTriad,     0.0, 2.0); // RGB-Subpixel

    // 1) horizontale Scanlines (dicht, leicht flimmernd)
    float line = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159 + t*0.2);
    color *= 1.0 - 0.35 * scanAmt * (1.0 - line);

    // 2) vertikale RGB-Triad-Maske (R/G/B periodisch, leicht animiert)
    //   Frequenz skaliert mit Auflösung, damit es „fernsehig“ bleibt
    float triadFreq = 1.5; // Basis-Perioden pro Pixelbreite
    float phase = t*0.5;
    float rM = 0.66 + 0.34 * sin((x01*res.x*triadFreq)*2.0*PI + phase + 0.0);
    float gM = 0.66 + 0.34 * sin((x01*res.x*triadFreq)*2.0*PI + phase + 2.0944); // +120°
    float bM = 0.66 + 0.34 * sin((x01*res.x*triadFreq)*2.0*PI + phase + 4.1888); // +240°
    vec3 triadMask = mix(vec3(1.0), vec3(rM,gM,bM), 0.35 * triadAmt);
    color *= triadMask;

    // ================== DIAGONALE INTERFERENZ-BÄNDER ==================
    float interfAmt = clamp(0.60 + uInterference, 0.0, 2.0);
    // leichte, langsame diagonale Farbmischung (R/G/B Phasenversatz)
    float ang = radians(18.0); // leichte Schräge
    float kx = cos(ang), ky = sin(ang);
    float f  = 0.9;            // Frequenz
    float base = (x01*kx + y01*ky) * res.y * f + t*0.8;
    vec3 inter = vec3(
        1.0 + 0.03*interfAmt * sin(base + 0.0),
        1.0 + 0.03*interfAmt * sin(base + 2.1),
        1.0 + 0.03*interfAmt * sin(base + 4.2)
    );
    color *= inter;

    // ================== HORIZONTALE FLASH-STRIPES (random, kurz) ==================
    float stripeAmt  = clamp(0.30 + uStripes,    0.0, 2.0);
    float stripeRate = clamp(1.00 + uStripeRate, 0.2, 3.0);

    float block = floor(t * stripeRate);           // wechselt grob pro Sektion
    // bis zu zwei Stripes pro Block (sehr dezent)
    for(int i=0;i<2;i++){
        float seed  = block*13.37 + float(i);
        float yC    = hash1(seed*3.1);
        float w     = mix(0.006, 0.02, hash1(seed*5.7));
        float amp   = mix(0.03, 0.10, hash1(seed*7.7));
        float signA = (hash1(seed*9.9) > 0.5) ? 1.0 : -1.0;
        float mask  = smoothstep(w, 0.0, abs(y01 - yC));
        // leichtes Körnen entlang der Linie
        float grain = hash(vec2(floor(x01*res.x*0.5), block))*0.5 + 0.5;
        color += stripeAmt * mask * amp * signA * (0.8 + 0.2*grain);
    }

    // ================== LEICHT ENTSÄTTIGEN ==================
    float gray = luma709(color);
    float desatBase = 0.10;                    // ~10% weniger Farbe
    float sat = clamp(1.0 - (desatBase + uDesat*0.5), 0.0, 1.2);
    color = mix(vec3(gray), color, sat);

    // ================== KRÄFTIGE VIGNETTE ==================
    float R = length(ndc);
    float vig = smoothstep(0.30, 1.0, R);
    float vigStrength = clamp(1.00 + uVignette, 0.0, 2.0); // Basis schon stark
    color *= mix(1.0, 1.0 - 0.60*vigStrength, vig);

    gl_FragColor = vec4(clamp(color,0.0,1.0), 1.0);
}
