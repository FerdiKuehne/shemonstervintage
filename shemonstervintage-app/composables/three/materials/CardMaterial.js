import { ShaderMaterial } from "three";

export class CardMaterial extends ShaderMaterial {
  onBeforeCompile(shader) {
    shader.vertexShader = this.#_rewriteVertexShader();
    shader.fragmentShader = this.#_rewriteFragmentShader();
  }

  #_rewriteVertexShader() {
    return /* glsl */`
      varying vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `;
  }

  #_rewriteFragmentShader() {
    return /* glsl */ `
      uniform sampler2D uTexture;
      uniform float uDistance;
  
      varying vec2 vUv;
  
      vec3 getLuminance(vec3 color) {
        vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
        return vec3(dot(luminance, color));
      }
  
      void main() {
        vec4 image = texture2D(uTexture, vUv);
        float distanceFactor = clamp(uDistance, 0.0, 1.0);
  
        vec3 imageLum = getLuminance(image.rgb);
        vec3 color = mix(image.rgb, imageLum, distanceFactor);
  
        // Border effect
        float borderSize = 0.04; // 4% of card size
        vec3 borderColor = vec3(0.0); // black
  
        // Detect if we're within the border area
        bool isBorder = vUv.x < borderSize || vUv.x > 1.0 - borderSize ||
                        vUv.y < borderSize || vUv.y > 1.0 - borderSize;
  
        if (isBorder) {
          color = borderColor;
        }
  
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }
}
