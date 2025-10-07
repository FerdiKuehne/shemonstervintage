precision highp float;
varying vec2 vUv;
uniform sampler2D src;
uniform vec2 resolution;
uniform float k1, k2;

void main() {
    vec2 c = vec2(0.5);
    vec2 xy = vUv - c;
    float a = resolution.x / max(resolution.y, 1.0);
    xy.x *= a;
    float r2 = dot(xy, xy);
    float f = 1.0 + k1 * r2 + k2 * r2 * r2;
    vec2 w = xy * f;
    w.x /= a;
    vec2 uv = c + w;
    if(any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))))
        gl_FragColor = vec4(0.0);
    else
        gl_FragColor = texture2D(src, uv);
}
