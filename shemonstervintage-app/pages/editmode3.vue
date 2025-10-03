<template>
  <div>
    <div id="ui">
      <input id="file" type="file" accept="image/*" />
      <button id="spawn" class="btn">＋ New Cube</button>
      <button id="resetView" class="btn">↺ Reset Position</button>
    </div>
    <canvas id="minimap" width="440" height="440"></canvas>
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
import { createMinimap } from "@/components/pano3dTool/minimap/minimap.js";
import { CAMERA_RADIUS, SPHERE_RADIUS, DEFAULT_SIZE } from "~/components/pano3dTool/constants";

definePageMeta({ layout: "three" });

let scene, camera, renderer, controls;
let cubesFolder;
let mouseNDC, raycaster, cubes, params, pickables;

/* =================== Minimap · Pan & Draw =================== */
const MINI_COLORS = {
  bg: "#0e0e10",
  grid: "rgba(170,190,210,0.28)",
  axes: "rgba(255,226,138,0.65)",
  circleDyn: "rgba(100,180,255,0.55)",
  circleFix: "rgba(255,255,255,0.2)",
  center: "rgba(255,255,255,0.9)",
  cubeOutline: "#222",
  cubeOutlineActive: "#ffd400",
};
const MINI_LINE = { grid: 1, axes: 2, cDyn: 2, cFix: 1.5 };

const miniPan = { x: 0, y: 0 }; // CSS-Pixel Offset

function resizeMiniToDPR(mini) {
  const dpr = window.devicePixelRatio || 1;
  const rect = mini.getBoundingClientRect();
  mini.style.width = rect.width + "px";
  mini.style.height = rect.height + "px";
  mini.width = Math.max(1, Math.round(rect.width * dpr));
  mini.height = Math.max(1, Math.round(rect.height * dpr));
  mini.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getMiniTransform(mini) {
  const dpr = window.devicePixelRatio || 1;
  const W = mini.width / dpr;
  const H = mini.height / dpr;
  const marginPx = 10;
  const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
  const cx = W * 0.5 + miniPan.x;
  const cy = H * 0.5 + miniPan.y;
  return { W, H, cx, cy, pxPerMeter, marginPx };
}

function worldXZToMiniCSS(x, z, mini) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini);
  return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
}

function drawMini(mini, mctx, gridMesh, gridMat, cubes, params) {
  const { W, H, cx, cy, pxPerMeter } = getMiniTransform(mini);
  const halfW = W * 0.5;
  const halfH = H * 0.5;

  // Clear
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, mini.width, mini.height);
  mctx.fillStyle = MINI_COLORS.bg;
  mctx.fillRect(0, 0, mini.width, mini.height);

  // Zeichnen im CSS-PX Raum
  mctx.save();
  mctx.translate(cx, cy);

  // Grid (unendlich, viewport-gefüllt)
  const spacingMeters = gridMat.uniforms.spacing.value;
  const stepPx = Math.max(1, spacingMeters * pxPerMeter);
  const startX = -halfW - ((-halfW) % stepPx);
  const endX   =  halfW;
  const startY = -halfH - ((-halfH) % stepPx);
  const endY   =  halfH;

  mctx.strokeStyle = MINI_COLORS.grid;
  mctx.lineWidth = MINI_LINE.grid;
  for (let x = startX; x <= endX + 0.5; x += stepPx) {
    mctx.beginPath();
    mctx.moveTo(x, -halfH);
    mctx.lineTo(x,  halfH);
    mctx.stroke();
  }
  for (let y = startY; y <= endY + 0.5; y += stepPx) {
    mctx.beginPath();
    mctx.moveTo(-halfW, y);
    mctx.lineTo( halfW, y);
    mctx.stroke();
  }

  // Achsen
  mctx.strokeStyle = MINI_COLORS.axes;
  mctx.lineWidth = MINI_LINE.axes;
  mctx.beginPath(); mctx.moveTo(-halfW, 0); mctx.lineTo(halfW, 0); mctx.stroke();
  mctx.beginPath(); mctx.moveTo(0, -halfH); mctx.lineTo(0, halfH); mctx.stroke();

  // Fester Sphere-Kreis (Äquator)
  const rPxFixed = SPHERE_RADIUS * pxPerMeter;
  mctx.strokeStyle = MINI_COLORS.circleFix;
  mctx.lineWidth = MINI_LINE.cFix;
  mctx.beginPath(); mctx.arc(0, 0, rPxFixed, 0, Math.PI * 2); mctx.stroke();

  // Dynamischer Schnittkreis
  const h = gridMesh.position.y;
  const rEff = Math.max(0, Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - h * h, 0)));
  const rPxDynamic = rEff * pxPerMeter;
  mctx.strokeStyle = MINI_COLORS.circleDyn;
  mctx.lineWidth = MINI_LINE.cDyn;
  mctx.beginPath(); mctx.arc(0, 0, rPxDynamic, 0, Math.PI * 2); mctx.stroke();

  // Mittelpunkt
  mctx.fillStyle = MINI_COLORS.center;
  mctx.beginPath(); mctx.arc(0, 0, 3, 0, Math.PI * 2); mctx.fill();

  // Würfel
  cubes.forEach((c) => {
    const hx = c.sizes.x * 0.5, hy = c.sizes.y * 0.5, hz = c.sizes.z * 0.5;
    const cornersLocal = [
      new THREE.Vector3(-hx, -hy, -hz),
      new THREE.Vector3( hx, -hy, -hz),
      new THREE.Vector3( hx, -hy,  hz),
      new THREE.Vector3(-hx, -hy,  hz),
    ];
    const ptsAbs = cornersLocal.map((v) => {
      const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
      return worldXZToMiniCSS(w.x, w.z, mini);
    });
    const pts = ptsAbs.map(p => ({ x: p.x - cx, y: p.y - cy }));

    mctx.fillStyle = c.state?.color || "#5a7dff";
    mctx.strokeStyle = c.id === params.activeId ? MINI_COLORS.cubeOutlineActive : MINI_COLORS.cubeOutline;
    mctx.lineWidth = c.id === params.activeId ? 3 : 1;

    mctx.beginPath();
    mctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) mctx.lineTo(pts[i].x, pts[i].y);
    mctx.closePath();
    mctx.fill();
    mctx.stroke();
  });

  mctx.restore();
}

/* ========= Hit-Tests / Mapping für Drag ========= */
function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const hit = (yi > pt.y) !== (yj > pt.y) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function cubePolyInMiniCSS(mini, c) {
  const hx = c.sizes.x * 0.5, hy = c.sizes.y * 0.5, hz = c.sizes.z * 0.5;
  const cornersLocal = [
    new THREE.Vector3(-hx, -hy, -hz),
    new THREE.Vector3( hx, -hy, -hz),
    new THREE.Vector3( hx, -hy,  hz),
    new THREE.Vector3(-hx, -hy,  hz),
  ];
  return cornersLocal.map((v) => {
    const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
    return worldXZToMiniCSS(w.x, w.z, mini);
  });
}
function pickCubeOnMini(mini, px, py) {
  const ordered = [...cubes].sort((a, b) =>
    (a.id === params.activeId ? 1 : 0) - (b.id === params.activeId ? 1 : 0)
  );
  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = ordered[i];
    if (pointInPoly({ x: px, y: py }, cubePolyInMiniCSS(mini, c))) return c;
  }
  return null;
}
function miniCSSToWorldXZ(mini, px, py) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini);
  return { x: (px - cx) / pxPerMeter, z: (py - cy) / pxPerMeter };
}
function snapToGridIfNeeded(x, z, snap, spacing) {
  if (!snap) return { x, z };
  const s = spacing > 0 ? spacing : 0.1;
  return { x: Math.round(x / s) * s, z: Math.round(z / s) * s };
}
/* ================================================= */




/* =================== Dein restlicher Code =================== */

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
      faceCenter.x, faceCenter.y, faceCenter.z,
      end.x, end.y, end.z,
    ]);
    line.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    line.geometry.computeBoundingSphere();
  }
};
/* extern end */

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

onMounted(async () => {
  let $three;

  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js");
    const devScene = await mod.init(false, true, false, false, false);
    $three = { ...devScene, init: async () => devScene, setScroller: (el) => { devScene.scroller = el; } };
    ({ scene, camera, renderer, controls } = devScene);
  } else {
    $three = useNuxtApp().$three;
    if ($three?.ready) await $three.ready;
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

  gridMat.depthTest = true;
  gridMat.depthWrite = false;
  gridMesh.renderOrder = 9999;

  // Pano + Passes
  const db = new THREE.Vector2();
  renderer.getDrawingBufferSize(db);
  let rtObjects = new THREE.WebGLRenderTarget(db.x, db.y, { depthBuffer: true });
  let rtCombined = new THREE.WebGLRenderTarget(db.x, db.y, { depthBuffer: false });

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

  // GUI/Params
  params = {
    rotX_deg: 0, rotY_deg: 0, rotZ_deg: 0,
    k1: -0.25, k2: 0.0,
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

  const { gui, cameraFovCtrl } = createPanoSettingsGUI(
    camera, passAMat, passBMat, params, updateRot
  );

  const setGridY = (v) => {
    v = THREE.MathUtils.clamp(v, -5, 5);
    const dy = v - lastGridY;
    gridMesh.position.y = v;
    gridMat.uniforms.planeY.value = v;
    cubes.forEach((c) => {
      c.mesh.position.y += dy;
      updateRaysFor(c.mesh, c.rays, c.sizes);
      c.syncFromMesh();
    });
    lastGridY = v;
    params.gridHeight = v;
    gridHeightCtrl.updateDisplay();
  };

  const gridHeightCtrl = createGridSettingsGUI(gui, params, gridMesh, gridMat, setGridY);
  updateRot();

  // Kamera
  const camInfo = { yaw: 0, pitch: 0, fov: camera.fov };
  const applyCameraFromGUI = () => {
    const yaw = THREE.MathUtils.degToRad(camInfo.yaw);
    const pitch = THREE.MathUtils.degToRad(camInfo.pitch);
    const q = new THREE.Euler(pitch, yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(q);
    camera.updateMatrixWorld(true);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    camera.position.copy(controls.target).sub(fwd.multiplyScalar(CAMERA_RADIUS));
    camera.updateMatrixWorld(true);
    controls.update();
  };

  const { yawCtrl, pitchCtrl, fovCtrl } = createCameraSettingsGUI(
    gui, params, camInfo, camera, passAMat, applyCameraFromGUI
  );

  function syncCamInfoFromCamera() {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    camInfo.yaw = +THREE.MathUtils.radToDeg(e.y).toFixed(2);
    camInfo.pitch = +THREE.MathUtils.radToDeg(e.x).toFixed(2);
    camInfo.fov = +camera.fov.toFixed(2);
    [yawCtrl, pitchCtrl, fovCtrl].forEach((c) => c.updateDisplay());
  }

  // Würfel
  cubes = []; pickables = []; let nextCubeId = 1;

  function makeRayGroup(color = 0x00ff00) {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, mat.clone());
      line.material.depthWrite = false;
      g.add(line);
    }
    g.renderOrder = 10000;
    return g;
  }

  function buildCrispEdges(mesh, colorHex) {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 1);
    const segGeo = new LineSegmentsGeometry().fromEdgesGeometry(edgesGeo);
    edgesGeo.dispose();

    const mat = new LineMaterial({
      color: colorHex, worldUnits: false, dashed: false,
      depthTest: true, depthWrite: false, transparent: false, opacity: 1.0,
    });
    const dbSize = new THREE.Vector2();
    renderer.getDrawingBufferSize(dbSize);
    mat.resolution.set(dbSize.x, dbSize.y);
    mat.linewidth = 1.5; mat.needsUpdate = true;

    const lines = new LineSegments2(segGeo, mat);
    lines.renderOrder = 10; mesh.add(lines);
    return lines;
  }

  function spawnCube() {
    const id = nextCubeId++;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a7dff, roughness: 0.4, metalness: 0.08,
      emissive: 0x6690ff, emissiveIntensity: 0.18,
      transparent: false, opacity: 1.0, depthWrite: true,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });
    const geom = new THREE.BoxGeometry(DEFAULT_SIZE, DEFAULT_SIZE, DEFAULT_SIZE);
    const mesh = new THREE.Mesh(geom, mat);

    const sizes = { x: DEFAULT_SIZE, y: DEFAULT_SIZE, z: DEFAULT_SIZE };
    const gy = gridMesh.position.y;
    mesh.position.set(0, gy + sizes.y * 0.5, 0);

    const edges = buildCrispEdges(mesh, mat.color.getHex());
    scene.add(mesh); pickables.push(mesh);

    const rays = makeRayGroup(0x00ff00);
    scene.add(rays);

    const cubeSettingGUI = createCubeSettingsGUI(
      cubesFolder, gui, cubes, mesh, rays, sizes, updateRaysFor, scene, pickables,
      gridMesh, activateCubeById, params, id, edges
    );

    cubesFolder = cubeSettingGUI.cubesFolder;
    cubes.push(cubeSettingGUI.record);

    updateRaysFor(mesh, rays, sizes);
    activateCubeById(id);
    renderer.domElement.focus();
  }

  // Picking
  raycaster = new THREE.Raycaster();
  mouseNDC = new THREE.Vector2();

  const isGuiInputFocusedShort = () => {
    const a = document.activeElement;
    return (a && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA") && a.closest(".lil-gui"));
  };

  // Minimap init
  const { mini, mctx } = createMinimap();
  resizeMiniToDPR(mini);
  window.addEventListener("resize", () => resizeMiniToDPR(mini));

  /* ---- Space-to-Pan & Cube-Drag (konfliktfrei) ---- */
  let spacePressed = false;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      if (!spacePressed) e.preventDefault();
      spacePressed = true;
    }
  }, { passive: false });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spacePressed = false;
  });

  let dragging = false;
  let mode = "none"; // "none" | "pan" | "cube"
  let dragCube = null;
  let lastPx = 0, lastPy = 0;

  const onPointerDown = (e) => {
    const rect = mini.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hitCube = pickCubeOnMini(mini, px, py);

    if (hitCube && !spacePressed) {
      mode = "cube";
      dragCube = hitCube;
      activateCubeById(hitCube.id);
      mini.classList.add("dragging-cube");
      // blockiere andere Listener (Pan etc.)
      e.stopImmediatePropagation();
      e.preventDefault();
    } else if (!hitCube && spacePressed) {
      mode = "pan";
      mini.classList.add("dragging");
      e.stopImmediatePropagation();
      e.preventDefault();
    } else {
      mode = "none"; // weder Pan (ohne Space) noch Cube-Drag (ohne Cube)
      // hier NICHT blocken -> andere Listener dürfen reagieren (z.B. Click-Auswahl)
    }

    dragging = true;
    lastPx = px; lastPy = py;
    mini.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;

    const rect = mini.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (mode === "pan") {
      miniPan.x += (px - lastPx);
      miniPan.y += (py - lastPy);
      e.stopImmediatePropagation();
      e.preventDefault();
    } else if (mode === "cube" && dragCube) {
      // Delta in Welt
      const prevWorld = miniCSSToWorldXZ(mini, lastPx, lastPy);
      const currWorld = miniCSSToWorldXZ(mini, px, py);
      let dwx = currWorld.x - prevWorld.x;
      let dwz = currWorld.z - prevWorld.z;

      const snap = e.shiftKey === true;
      const spacing = gridMat.uniforms.spacing.value;

      let newX = dragCube.mesh.position.x + dwx;
      let newZ = dragCube.mesh.position.z + dwz;
      if (snap) {
        const snapped = snapToGridIfNeeded(newX, newZ, true, spacing);
        newX = snapped.x; newZ = snapped.z;
      }

      dragCube.mesh.position.x = newX;
      dragCube.mesh.position.z = newZ;

      updateRaysFor(dragCube.mesh, dragCube.rays, dragCube.sizes);
      dragCube.syncFromMesh?.();

      e.stopImmediatePropagation();
      e.preventDefault();
    }

    lastPx = px; lastPy = py;
  };

  const onPointerUp = (e) => {
    dragging = false;
    mini.classList.remove("dragging", "dragging-cube");
    mode = "none";
    dragCube = null;
    mini.releasePointerCapture?.(e.pointerId);
    // falls wir geblockt haben
    e.stopImmediatePropagation?.();
    e.preventDefault?.();
  };

  mini.addEventListener("pointerdown", onPointerDown, { passive: false });
  mini.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp, { passive: false });
  /* ------------------------------------------ */

  // Listener-API (falls andere Teile sie brauchen) — ohne Pan
  const worldXZToMini_forListener = (x, z) => {
    const dpr = window.devicePixelRatio || 1;
    const W = mini.width / dpr, H = mini.height / dpr;
    const marginPx = 10;
    const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
    const cx = W * 0.5, cy = H * 0.5;
    return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
  };
  const getMiniTransform_forListener = () => {
    const dpr = window.devicePixelRatio || 1;
    const W = mini.width / dpr, H = mini.height / dpr;
    const marginPx = 10;
    const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
    const cx = W * 0.5, cy = H * 0.5;
    return { W, H, cx, cy, pxPerMeter, marginPx };
  };

  initListener(
    isGuiInputFocusedShort,
    cubes,
    params,
    updateRaysFor,
    renderer,
    camera,
    pickAtClient,
    mini,
    worldXZToMini_forListener,
    activateCubeById,
    setGridY,
    getMiniTransform_forListener,
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

  // Renderloop
  renderer.setClearColor(0x000000, 0);
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
    const m = new THREE.Matrix3().set(
      right.x, up.x, zAxis.x,
      right.y, up.y, zAxis.y,
      right.z, up.z, zAxis.z
    );
    passAMat.uniforms.camBasis.value.copy(m);
    passAMat.uniforms.aspect.value = camera.aspect;
    syncCamInfoFromCamera();
  }

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

    // Minimap zeichnen (mit Pan)
    drawMini(mini, mctx, gridMesh, gridMat, cubes, params);

    requestAnimationFrame(render);
  }
  render();

  // Upload & Spawn
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.25),
              inset 0 1px 0 rgba(255,255,255,0.05);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:hover { background: linear-gradient(180deg, var(--hover), var(--bg2)); transform: translateY(-1px); }
.btn:active { background: linear-gradient(180deg, var(--active), var(--bg2)); transform: translateY(0); }

canvas { display: block; }

#minimap {
  position: fixed;
  left: 10px;
  bottom: 10px;
  z-index: 10000;
  width: 220px;
  height: 220px;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  background: #0e0e10;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  cursor: crosshair;
}
#minimap.dragging { cursor: grabbing; }
#minimap.dragging-cube { cursor: move; }

.lil-gui .folder.active-cube > .title {
  background: linear-gradient(90deg, #244cff, #0f1a3a) !important;
  color: #fff !important;
  text-shadow: 0 1px 0 rgba(0,0,0,0.25);
}
.lil-gui .folder.active-cube { box-shadow: 0 0 0 2px #244cff inset; border-radius: 6px; }
.lil-gui.autoPlace { top: 0; right: 0; }
</style>
