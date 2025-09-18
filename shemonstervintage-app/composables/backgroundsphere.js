import { SphereGeometry, ShaderMaterial, Mesh, TextureLoader } from 'three';
import vertexShader from './shaders/backgroundsphere/vertex.glsl?raw';
import fragmentShader from './shaders/backgroundsphere/fragment.glsl?raw';

function createBackgroundSphere() {
  const geom = new SphereGeometry(50, 60, 40);
  geom.scale(-1, 1, 1); // invert the sphere to see the texture from inside

  const texture = new TextureLoader().load('https://shemonstervintage.de/img/panorama.jpg');

  const material = new ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: 2, // DoubleSide
  });
  
  const sphere = new Mesh(geom, material);
  return sphere;
}

export { createBackgroundSphere };
