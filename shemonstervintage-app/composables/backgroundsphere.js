import { SphereGeometry, ShaderMaterial, Mesh, TextureLoader, DoubleSide } from "three";
import vertexShader from "./shaders/backgroundsphere/vertex.glsl?raw";
import fragmentShader from "./shaders/backgroundsphere/fragment.glsl?raw";

export async function createBackgroundSphereFromAPI(dpr = window.devicePixelRatio || 1) {
  // Fetch device-specific texture with DPR parameter
  console.log('Device Pixel Ratio (DPR):', dpr);
  /* const res = await fetch(`/test/api/texture.php?dpr=${dpr}`); */
   const res = await fetch(`http://localhost:8000/texture.php?dpr=${dpr}`); 

  /* produktiv */
  const data = await res.json();

  // Geometry
  const geom = new SphereGeometry(10, 60, 40);
  geom.scale(-1, 1, 1); // inside-out sphere

  /*let textureUrl = `/test${data.texture}`; // prepend /test */
 let textureUrl = data.texture; // prepend /test 
  // Load texture asynchronously
  const texture = await new Promise((resolve, reject) => {
    new TextureLoader().load(
      textureUrl,
      (loadedTexture) => resolve(loadedTexture),
      undefined,
      (err) => reject(err)
    );
  });

  // Shader material (after texture loaded)
  const material = new ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uAmplitude: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
  });

  // Mesh
  return new Mesh(geom, material);
}
