<template>
  <div>
    <div id="ui">
      <input id="file" type="file" accept="image/*" />
      <button id="spawn" class="btn">＋ New Cube</button>
      <button id="resetView" class="btn">↺ Reset Position</button>
    </div>

  </div>
</template>

<script setup>
import * as THREE from "three";
import GUI from "lil-gui";
import { onMounted } from "vue";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import vertexShaderGrid from "@/components/pano3dTool/shader/grid/vertex.glsl?raw";
import fragmentShaderGrid from "@/components/pano3dTool/shader/grid/fragment.glsl?raw";
import vertexShaderMatA from "@/components/pano3dTool/shader/matA/vertex.glsl?raw";
import fragmentShaderMatA from "@/components/pano3dTool/shader/matA/fragment.glsl?raw";
import vertexShaderMatB from "@/components/pano3dTool/shader/matB/vertex.glsl?raw";
import fragmentShaderMatB from "@/components/pano3dTool/shader/matB/fragment.glsl?raw";
import { createPanoSettingsGUI } from "@/components/pano3dTool/gui/panoSettings.js";
import { createGridSettingsGUI } from "@/components/pano3dTool/gui/gridSettings.js";
import { createCameraSettingsGUI } from "~/components/pano3dTool/gui/camerasetting";
import { createCubeSettingsGUI } from "@/components/pano3dTool/gui/cubeSettings.js";
import { initListener } from "~/components/pano3dTool/listener";
import {
  createMinimap,
  drawMinimap,
} from "@/components/pano3dTool/minimap/minimap.js";
import { CAMERA_RADIUS,SPHERE_RADIUS, DEFAULT_SIZE} from "~/components/pano3dTool/constants";
/* End Minimap */

definePageMeta({
  layout: "three",
});

let scene, camera, renderer, controls;

let cubesFolder; // GUI Folder for cubes

let mouseNDC, raycaster, cubes, params, pickables;

/* extern  */
const updateRaysFor = (mesh, rays, sizes) => {
  const localNormals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  const half = { x: sizes.x * 0.5, y: sizes.y * 0.5, z: sizes.z * 0.5 };
  const pos = mesh.position.clone();
  const q = mesh.quaternion.clone();
  for (let i = 0; i < 6; i++) {
    const ln = localNormals[i];
    const worldNormal = ln.clone().applyQuaternion(q).normalize();
    const offsetLocal = new THREE.Vector3(
      ln.x !== 0 ? Math.sign(ln.x) * half.x : 0,
      ln.y !== 0 ? Math.sign(ln.y) * half.y : 0,
      ln.z !== 0 ? Math.sign(ln.z) * half.z : 0
    );
    const offsetWorld = offsetLocal.clone().applyQuaternion(q);
    const faceCenter = pos.clone().add(offsetWorld);
    const b = 2.0 * faceCenter.dot(worldNormal);
    const c = faceCenter.lengthSq() - SPHERE_RADIUS * SPHERE_RADIUS;
    const disc = b * b - 4.0 * c;
    let t = 0.0;
    if (disc >= 0.0) {
      const sqrtD = Math.sqrt(disc);
      const t1 = (-b + sqrtD) * 0.5;
      const t2 = (-b - sqrtD) * 0.5;
      t = Math.max(t1, t2);
      if (t < 0.0) t = 0.0;
    }
    const end = faceCenter.clone().addScaledVector(worldNormal, t);
    const line = rays.children[i];
    const arr = new Float32Array([
      faceCenter.x,
      faceCenter.y,
      faceCenter.z,
      end.x,
      end.y,
      end.z,
    ]);
    line.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    line.geometry.computeBoundingSphere();
  }
};
/* extern end */

/* intern */
function activateCubeById(id) {
  params.activeId = id;
  cubes.forEach((c) => {
    const isActive = c.id === id;
    c.gui.domElement.classList.toggle("active-cube", isActive);
    if (c.rays) c.rays.visible = isActive;
    const mat = c.mesh.material;
    if (mat && "emissive" in mat) {
      mat.emissive.setHex(0x6690ff);
      mat.emissiveIntensity = isActive ? 0.3 : 0.18;
      mat.needsUpdate = true;
    }
  });
  if (id !== -1) renderer.domElement.focus();
}

const pickAtClient = (x, y, renderer, camera) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mx = ((x - rect.left) / rect.width) * 2 - 1;
  const my = -((y - rect.top) / rect.height) * 2 + 1;
  mouseNDC.set(mx, my);
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  if (hits.length) {
    const obj = hits[0].object;
    const rec = cubes.find((c) => c.mesh === obj);
    if (rec) {
      activateCubeById(rec.id);
      updateRaysFor(rec.mesh, rec.rays, rec.sizes);
      return;
    }
  }
  activateCubeById(-1);
};
/* intern end */

onMounted(async () => {
  let $three;

  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js");
    const devScene = await mod.init(false, true, false, false, false);

    $three = {
      ...devScene,
      init: async () => devScene,
      setScroller: (el) => {
        devScene.scroller = el;
      },
    };
    ({ scene, camera, renderer, controls } = devScene);
  } else {
    $three = useNuxtApp().$three;
    if ($three?.ready) {
      await $three.ready; // wait until ready
    }
    ({ scene, camera, renderer, controls } = $three);
  }

  const gridGeom = new THREE.PlaneGeometry(200, 200, 1, 1);
  gridGeom.rotateX(-Math.PI / 2);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color: { value: new THREE.Color(0x00ffcc) },
      spacing: { value: 0.1 },
      thickness: { value: 0.015 },
      clipToSphere: { value: true },
      sphereRadius: { value: SPHERE_RADIUS },
      planeY: { value: 0.0 },
      ringColor: { value: new THREE.Color(0x4ea1ff) },
      ringOpacity: { value: 1.0 },
      axisColor: { value: new THREE.Color(0xffe28a) },
      axisAlpha: { value: 1.0 },
      axisThickness: { value: 1.5 },
    },
    vertexShader: vertexShaderGrid,
    fragmentShader: fragmentShaderGrid,
  });

  const gridMesh = new THREE.Mesh(gridGeom, gridMat);
  scene.add(gridMesh);

  /* Grid global konfigurieren */
  gridMat.depthTest = true;
  gridMat.depthWrite = false;
  gridMesh.renderOrder = 9999;

  /* ---------- Pano + Post Pass ---------- */
  const db = new THREE.Vector2();
  renderer.getDrawingBufferSize(db);
  let rtObjects = new THREE.WebGLRenderTarget(db.x, db.y, {
    depthBuffer: true,
  });
  let rtCombined = new THREE.WebGLRenderTarget(db.x, db.y, {
    depthBuffer: false,
  });

  let panoTex = new THREE.Texture();
  panoTex.colorSpace = THREE.SRGBColorSpace;
  panoTex.wrapS = THREE.RepeatWrapping;
  panoTex.wrapT = THREE.ClampToEdgeWrapping;

  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenSceneA = new THREE.Scene();
  const screenSceneB = new THREE.Scene();

  const passAMat = new THREE.ShaderMaterial({
    uniforms: {
      objTex: { value: rtObjects.texture },
      pano: { value: panoTex },
      resolution: { value: db.clone() },
      fovY: { value: THREE.MathUtils.degToRad(camera.fov) },
      aspect: { value: camera.aspect },
      camBasis: { value: new THREE.Matrix3() },
      rotXYZ: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: vertexShaderMatA,
    fragmentShader: fragmentShaderMatA,
    depthTest: false,
    depthWrite: false,
  });
  screenSceneA.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passAMat));

  const passBMat = new THREE.ShaderMaterial({
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
  screenSceneB.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passBMat));

  /* ---------- GUI ---------- */
  /* const gui = new GUI({ title: "Pano Settings" }); */

  params = {
    rotX_deg: 0,
    rotY_deg: 0,
    rotZ_deg: 0,
    k1: -0.25,
    k2: 0.0,
    cameraFov: camera.fov,
    gridHeight: 0.0,
    gridClip: true,
    gridVisible: true,
    gridSpacing: 0.1,
    activeId: -1,
  };

  let lastGridY = 0.0;

  const updateRot = () => {
    passAMat.uniforms.rotXYZ.value.set(
      THREE.MathUtils.degToRad(params.rotX_deg),
      THREE.MathUtils.degToRad(params.rotY_deg),
      THREE.MathUtils.degToRad(params.rotZ_deg)
    );
  };

  /* PANO Settings GUI Init */
  const { gui, cameraFovCtrl } = createPanoSettingsGUI(
    camera,
    passAMat,
    passBMat,
    params,
    updateRot
  );

  /* --- Helper: Grid-Höhe zentral setzen --- */
  const setGridY = (v) => {
    v = THREE.MathUtils.clamp(v, -5, 5);
    const dy = v - lastGridY;
    gridMesh.position.y = v;
    gridMat.uniforms.planeY.value = v;
    cubes.forEach((c) => {
      c.mesh.position.y += dy; // Abstand zum Grid beibehalten
      updateRaysFor(c.mesh, c.rays, c.sizes);
      c.syncFromMesh();
    });
    lastGridY = v;
    params.gridHeight = v;
    gridHeightCtrl.updateDisplay();
  };

  const gridHeightCtrl = createGridSettingsGUI(
    gui,
    params,
    gridMesh,
    gridMat,
    setGridY
  );

  updateRot();

  /* ---------- Kamera · Position (Yaw/Pitch/FOV) ---------- */
  const camInfo = { yaw: 0, pitch: 0, fov: camera.fov };

  const applyCameraFromGUI = () => {
    const yaw = THREE.MathUtils.degToRad(camInfo.yaw);
    const pitch = THREE.MathUtils.degToRad(camInfo.pitch);
    const q = new THREE.Euler(pitch, yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(q);
    camera.updateMatrixWorld(true);

    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    camera.position
      .copy(controls.target)
      .sub(fwd.multiplyScalar(CAMERA_RADIUS));

    camera.updateMatrixWorld(true);
    controls.update();
  };

  const { yawCtrl, pitchCtrl, fovCtrl } = createCameraSettingsGUI(
    gui,
    params,
    camInfo,
    camera,
    passAMat,
    applyCameraFromGUI
  );

  function syncCamInfoFromCamera() {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    camInfo.yaw = +THREE.MathUtils.radToDeg(e.y).toFixed(2);
    camInfo.pitch = +THREE.MathUtils.radToDeg(e.x).toFixed(2);
    camInfo.fov = +camera.fov.toFixed(2);
    [yawCtrl, pitchCtrl, fovCtrl].forEach((c) => c.updateDisplay());
  }

  /* ---------- Würfel / Picking ---------- */
  /* const cubesFolder = gui.addFolder("Würfel");*/

  /* Export function */

  cubes = []; // { id, mesh, edges, rays, gui, state, sizes, ... }
  pickables = [];
  let nextCubeId = 1;

  function makeRayGroup(color = 0x00ff00) {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });

    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const line = new THREE.Line(geo, mat.clone());
      line.material.depthWrite = false;
      g.add(line);
    }
    g.renderOrder = 10000;
    return g;
  }

  function isGuiInputFocused() {
    const a = document.activeElement;
    return !!(
      a &&
      (a.tagName === "INPUT" ||
        a.tagName === "SELECT" ||
        a.tagName === "TEXTAREA") &&
      a.closest(".lil-gui")
    );
  }

  function activateCubeById(id) {
    params.activeId = id;
    cubes.forEach((c) => {
      const isActive = c.id === id;
      c.gui.domElement.classList.toggle("active-cube", isActive);
      if (c.rays) c.rays.visible = isActive;
      const mat = c.mesh.material;
      if (mat && "emissive" in mat) {
        mat.emissive.setHex(0x6690ff);
        mat.emissiveIntensity = isActive ? 0.3 : 0.18;
        mat.needsUpdate = true;
      }
    });
    if (id !== -1) renderer.domElement.focus();
  }

  /* ---------- Outline (1.5 px, DPR-sicher) ---------- */
  function buildCrispEdges(mesh, colorHex) {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 1);
    const segGeo = new LineSegmentsGeometry().fromEdgesGeometry(edgesGeo);
    edgesGeo.dispose();

    const mat = new LineMaterial({
      color: colorHex,
      worldUnits: false,
      dashed: false,
      depthTest: true,
      depthWrite: false,
      transparent: false,
      opacity: 1.0,
    });

    const dbSize = new THREE.Vector2();
    renderer.getDrawingBufferSize(dbSize);
    mat.resolution.set(dbSize.x, dbSize.y);
    mat.linewidth = 1.5;
    mat.needsUpdate = true;

    const lines = new LineSegments2(segGeo, mat);
    lines.renderOrder = 10;
    mesh.add(lines);
    return lines;
  }

  /* ---------- Spawn ---------- */
  function spawnCube() {
    const id = nextCubeId++;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a7dff,
      roughness: 0.4,
      metalness: 0.08,
      emissive: 0x6690ff,
      emissiveIntensity: 0.18,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });

    const geom = new THREE.BoxGeometry(
      DEFAULT_SIZE,
      DEFAULT_SIZE,
      DEFAULT_SIZE
    );
    const mesh = new THREE.Mesh(geom, mat);

    const sizes = { x: DEFAULT_SIZE, y: DEFAULT_SIZE, z: DEFAULT_SIZE };
    const gy = gridMesh.position.y;
    mesh.position.set(0, gy + sizes.y * 0.5, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);

    const edges = buildCrispEdges(mesh, mat.color.getHex());

    scene.add(mesh);
    pickables.push(mesh);

    const rays = makeRayGroup(0x00ff00);
    scene.add(rays);

    const cubeSettingGUI = createCubeSettingsGUI(
      cubesFolder,
      gui,
      cubes,
      mesh,
      rays,
      sizes,
      updateRaysFor,
      scene,
      pickables,
      gridMesh,
      activateCubeById,
      params,
      id,
      edges
    );

    cubesFolder = cubeSettingGUI.cubesFolder;

    cubes.push(cubeSettingGUI.record);

    updateRaysFor(mesh, rays, sizes);
    activateCubeById(id);
    renderer.domElement.focus();
  }

  /* ---------- Picking ---------- */
  raycaster = new THREE.Raycaster();
  mouseNDC = new THREE.Vector2();

  /* ---------- Tastatur Move: 0.01 m Schritte ---------- */
  const isGuiInputFocusedShort = () => {
    const a = document.activeElement;
    return (
      a &&
      (a.tagName === "INPUT" ||
        a.tagName === "SELECT" ||
        a.tagName === "TEXTAREA") &&
      a.closest(".lil-gui")
    );
  };

  /* ---------- Minimap (korrekte Skalierung) ---------- */

  const { mini, mctx } = createMinimap();

  const  getMiniTransform = ()=> {
    const W = mini.width,
      H = mini.height;
    const marginPx = 10;
    const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
    const cx = W * 0.5,
      cy = H * 0.5;
    return { W, H, cx, cy, pxPerMeter, marginPx };
  }

  const worldXZToMini = (x, z) => {
    const { pxPerMeter, cx, cy } = getMiniTransform();
    return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
  }

  initListener(
    isGuiInputFocusedShort,
    cubes,
    params,
    updateRaysFor,
    renderer,
    camera,
    pickAtClient,
    mini,
    worldXZToMini,
    activateCubeById,
    setGridY,
    getMiniTransform,
    passAMat,
    controls,
    passBMat,
    cameraFovCtrl,
    syncCamInfoFromCamera,
    fovCtrl,
    rtObjects,
    rtCombined,
    db
  );

  /* ---------- Kamera-Basis & Info ---------- */
  function updateCamBasis() {
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(CAMERA_RADIUS);
    camera.position.copy(controls.target).add(dir);

    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    const right = new THREE.Vector3(e[0], e[1], e[2]).normalize();
    const up = new THREE.Vector3(e[4], e[5], e[6]).normalize();
    const zAxis = new THREE.Vector3(e[8], e[9], e[10]).normalize();
    const m = new THREE.Matrix3();
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

    syncCamInfoFromCamera();
  }

  /* ---------- Renderloop ---------- */
  renderer.setClearColor(0x000000, 0);
  function render() {
    controls.update();
    updateCamBasis();

    const cur = new THREE.Vector2();
    renderer.getDrawingBufferSize(cur);
    if (cur.x !== db.x || cur.y !== db.y) {
      db.copy(cur);
      passAMat.uniforms.resolution.value.copy(db);
      passBMat.uniforms.resolution.value.copy(db);
      rtObjects.setSize(db.x, db.y);
      rtCombined.setSize(db.x, db.y);
      cubes.forEach((c) => {
        const mat = c.edges?.material;
        if (mat && mat.resolution) {
          mat.resolution.set(db.x, db.y);
          mat.linewidth = 1.5;
          mat.needsUpdate = true;
        }
      });
    }

    gridMat.uniforms.planeY.value = gridMesh.position.y;

    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rtObjects);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(prev);

    renderer.setRenderTarget(rtCombined);
    renderer.clear(true, true, true);
    renderer.render(screenSceneA, fsCam);
    renderer.setRenderTarget(null);

    passBMat.uniforms.src.value = rtCombined.texture;
    renderer.render(screenSceneB, fsCam);

    
    /* Start MINIMAP DRAW für jedes frame wird es neu geschrieben */
    drawMinimap(mini, mctx, gridMesh, gridMat, cubes, params);
    /* End MINIMAP DRAW */

    requestAnimationFrame(render);
  }
  render();

  /* ---------- Upload & Spawn ---------- */
  document.getElementById("file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      panoTex = tex;
      passAMat.uniforms.pano.value = panoTex;
      URL.revokeObjectURL(url);
    });
  });
  document.getElementById("spawn").addEventListener("click", spawnCube);

  /* ---------- Initial GUI Sync ---------- */
  syncCamInfoFromCamera();
});
</script>

<style scoped>
html,
body {
  height: 100%;
  margin: 0;
  background: #0b0b0b;
  overflow: hidden;
}
#ui {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.btn {
  --bg1: #1a2740;
  --bg2: #0f172a;
  --border: #2b3b6b;
  --hover: #243b74;
  --active: #162452;
  color: #e6ebff;
  font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--bg1), var(--bg2));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:hover {
  background: linear-gradient(180deg, var(--hover), var(--bg2));
  transform: translateY(-1px);
}
.btn:active {
  background: linear-gradient(180deg, var(--active), var(--bg2));
  transform: translateY(0);
}

.lil-gui .folder.active-cube > .title {
  background: linear-gradient(90deg, #244cff, #0f1a3a) !important;
  color: #fff !important;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}
.lil-gui .folder.active-cube {
  box-shadow: 0 0 0 2px #244cff inset;
  border-radius: 6px;
}
.lil-gui.autoPlace {
  top: 0;
  right: 0;
}
</style>
