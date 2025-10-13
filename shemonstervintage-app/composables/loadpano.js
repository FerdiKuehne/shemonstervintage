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
  Texture,
} from "three";

import vertexShaderMatA from "./shaders/matA/vertex.glsl?raw";
import fragmentShaderMatA from "./shaders/matA/fragment.glsl?raw";
import vertexShaderMatB from "./shaders/matB/vertex.glsl?raw";
import fragmentShaderMatB from "./shaders/matB/fragment.glsl?raw";

const CAMERA_RADIUS = 1e-4;

export async function createBackgroundPanoFromAPI(
  camera,
  controls,
  renderer,
  dpr = window.devicePixelRatio || 1
) {
  // Fetch device-specific texture with DPR parameter
  console.log("Device Pixel Ratio (DPR):", dpr);
  /* const res = await fetch(`/test/api/texture.php?dpr=${dpr}`); */
  const res = await fetch(`http://localhost:8000/stokes/background?dpr=${dpr}`);

  /* produktiv */
  const data = await res.json();
console.log(data);

  let textureUrl = "http://localhost:8000" + data.data.texture;

  console.log("Texture URL:", textureUrl);
  console.log("Texture DPR:", dpr);

  /* ---------- Pano + Post Pass ---------- */

  const db = new Vector2();
  renderer.getDrawingBufferSize(db);
  let rtObjects = new WebGLRenderTarget(db.x, db.y, {
    depthBuffer: true,
  });
  let rtCombined = new WebGLRenderTarget(db.x, db.y, {
    depthBuffer: false,
  });


  // Load texture asynchronously
  const panoTex = await new Promise((resolve, reject) => {
    new TextureLoader().load(
      textureUrl,
      (loadedTexture) => resolve(loadedTexture),
      undefined,
      (err) => reject(err)
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
      uTime: { value: 0.0 },
      uSplit: { value: 6.0 },          // Pixelversatz
      uAngle: { value: 0.0 },          // 0° = horizontal, 90° = vertikal
      uRadial: { value: 0.0 },         // erst mal linear
      uCenter: { value: new Vector2(0.5, 0.5) },
      uFalloff: { value: 1.0 },        // für radialen Modus interessant
      uMix: { value: 1.0 },            // voller Effekt
      uOffset: { value: 0.0 },
      resolution: { value: db.clone() },
      fovY: { value: MathUtils.degToRad(camera.fov) },
      aspect: { value: camera.aspect },
      camBasis: { value: new Matrix3() },
      rotXYZ: { value: new Vector3(MathUtils.degToRad(2.30),MathUtils.degToRad(-67.1),MathUtils.degToRad(0)) },


    },
    vertexShader: vertexShaderMatA,
    fragmentShader: fragmentShaderMatA,
    depthTest: false,
    depthWrite: false,
  });
  const quadA = new Mesh(new PlaneGeometry(2, 2), passAMat);



console.log("--------------------------------");

  screenSceneA.add(quadA);
  console.log("Added quad to screenSceneA:", quadA);

  const passBMat = new ShaderMaterial({
    uniforms: {
      src: { value: rtCombined.texture },
      resolution: { value: db.clone() },
      k1: { value: -0.065 },
      k2: { value: 0.055 },
    },
    vertexShader: vertexShaderMatB,
    fragmentShader: fragmentShaderMatB,
    depthTest: false,
    depthWrite: false,
  });

  const quadB = new Mesh(new PlaneGeometry(2, 2), passBMat);

  screenSceneB.add(quadB);
  console.log("Added quad to screenSceneA:", quadB);

  const updateCamBasis = () => {
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(CAMERA_RADIUS);
    camera.position.copy(controls.target).add(dir);

    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    const right = new Vector3(e[0], e[1], e[2]).normalize();
    const up = new Vector3(e[4], e[5], e[6]).normalize();
    const zAxis = new Vector3(e[8], e[9], e[10]).normalize();
    const m = new Matrix3();
    m.set(
      right.x,
      up.x,
      zAxis.x,
      right.y,
      up.y,
      zAxis.y,
      right.z,
      up.z,
      zAxis.z
    );
    passAMat.uniforms.camBasis.value.copy(m);
    passAMat.uniforms.aspect.value = camera.aspect;
  };

  return {
    screenSceneB: screenSceneB,
    screenSceneA: screenSceneA,
    fsCam: fsCam,
    rtCombined: rtCombined,
    rtObjects: rtObjects,
    db: db,
    passAMat: passAMat,
    passBMat: passBMat,
    updateCamBasis: updateCamBasis,
  };
}
