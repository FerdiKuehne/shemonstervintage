precision highp float;

uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uFeather;
uniform float uStrength;

varying vec2 vUv;

                // rotiert "p" um "angle" um den Ursprung
vec2 rotate(vec2 p, float angle) {
    float s = sin(angle), c = cos(angle);
    return mat2(c, -s, s, c) * p;
}

void main() {
                  // Abstand vom Zentrum in UV
    float d = distance(vUv, uCenter);

                  // --- Maske ---
                  // weicher Maskenwert: 1 innen, 0 xaußen
    float mask = 1.0 - smoothstep(uRadius - uFeather, uRadius, d);

                  // Optional harte Kante: wenn du wirklich *nichts* außerhalb zeichnen willst,
                  // nutze discard (spart Fill, aber bricht Transparenz/Blending an der Kante hart ab):
                  // if (d > uRadius) discard;

                  // --- Vortex / Swirl ---
                  // Winkel-Offset nimmt zur Kante hin ab (0 am Rand, max in der Mitte)
    float t = clamp(1.0 - d / uRadius, 0.0, 1.0);
    float angle = uStrength * t * t; // easing (quadratisch) für glatteren Verlauf

                  // wirbeln um uCenter
    vec2 offset = vUv - uCenter;
    vec2 uvSwirled = uCenter + rotate(offset, angle);

                  // außerhalb des Radius bleiben die UV unverändert (optional):
    uvSwirled = mix(vUv, uvSwirled, step(d, uRadius));

    vec4 tex = texture2D(uTexture, uvSwirled);

                  // weiche Maskierung über Alpha
    gl_FragColor = vec4(tex.rgb, tex.a * mask);
}