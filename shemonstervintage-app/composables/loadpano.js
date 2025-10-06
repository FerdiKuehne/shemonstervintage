import {
  Scene,
  Vector2,
  Vector3,
  Matrix3,
  WebGLRenderTarget,
  SRGBColorSpace,
  RepeatWrapping,
  ClampToEdgeWrapping,
  OrthographicCamera,
  Mesh,
  ShaderMaterial,
  PlaneGeometry,
  TextureLoader,
  MathUtils,
} from "three";

import vertexShaderMatA from "./shaders/matA/vertex.glsl?raw";
import fragmentShaderMatA from "./shaders/matA/fragment.glsl?raw";
import vertexShaderMatB from "./shaders/matB/vertex.glsl?raw";
import fragmentShaderMatB from "./shaders/matB/fragment.glsl?raw";

export async function createBackgroundPanoFromAPI(
  camera,
  renderer,
  dpr = window.devicePixelRatio || 1
) {
  // Fetch device-specific texture with DPR parameter
  console.log("Device Pixel Ratio (DPR):", dpr);
  /* const res = await fetch(`/test/api/texture.php?dpr=${dpr}`); */
  const res = await fetch(`http://localhost:8000/texture.php?dpr=${dpr}`);

  /* produktiv */
  const data = await res.json();
  let textureUrl = data.texture;

  console.log("Texture URL:", textureUrl);

  /* ---------- Pano + Post Pass ---------- */

  const db = new Vector2();
  renderer.getDrawingBufferSize(db);
  let rtObjects = new WebGLRenderTarget(db.x, db.y, {
    depthBuffer: true,
  });
  let rtCombined = new WebGLRenderTarget(db.x, db.y, {
    depthBuffer: false,
  });

  const panoTex = await new Promise((resolve, reject) => {
    new TextureLoader().load(
      textureUrl,
      (loadedTexture) => {
        console.log("Texture loaded successfully");
        resolve(loadedTexture);
      },
      undefined,
      (err) => {
        console.error("Texture failed to load", err);
        reject(err);
      }
    );
  });

  panoTex.colorSpace = SRGBColorSpace;
  panoTex.wrapS = RepeatWrapping;
  panoTex.wrapT = ClampToEdgeWrapping;

  const fsCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenSceneA = new Scene();
  const screenSceneB = new Scene();

  const passAMat = new ShaderMaterial({
    uniforms: {
      objTex: { value: rtObjects.texture },
      pano: { value: panoTex },
      resolution: { value: db.clone() },
      fovY: { value: MathUtils.degToRad(camera.fov) },
      aspect: { value: camera.aspect },
      camBasis: { value: new Matrix3() },
      rotXYZ: { value: new Vector3(0, 0, 0) },
    },
    vertexShader: vertexShaderMatA,
    fragmentShader: fragmentShaderMatA,
    depthTest: false,
    depthWrite: false,
  });
  screenSceneA.add(new Mesh(new PlaneGeometry(2, 2), passAMat));

  const passBMat = new ShaderMaterial({
    uniforms: {
      src: { value: rtCombined.texture },
      resolution: { value: db.clone() },
      k1: { value: -0.25 },
      k2: { value: 0.0 },
    },
    vertexShader: vertexShaderMatB,
    fragmentShader: fragmentShaderMatB,
    depthTest: false,
    depthWrite: false,
  });
  screenSceneB.add(new Mesh(new PlaneGeometry(2, 2), passBMat));

  return {
    screenSceneB: screenSceneB,
    screenSceneA: screenSceneA,
    fsCam: fsCam,
    rtCombined: rtCombined,
    rtObjects: rtObjects,
    db: db,
    passAMat: passAMat,
    passBMat: passBMat,
  };
}
