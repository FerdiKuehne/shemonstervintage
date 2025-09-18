uniform sampler2D uTexture;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
    vec2 uv = vUv;

        // If normal points away from camera (inside), flip horizontally
    if(vNormal.z > 0.0) {
        uv.x = 1.0 - uv.x;
    }

    gl_FragColor = texture2D(uTexture, uv);
}