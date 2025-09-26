<template>
  <div class="page-content">
    <div class="container-fluid p-0">
      <div class="cameraPos">
        <div>
          {{ cameraHUD.x.toFixed(2) }} // {{ cameraHUD.y.toFixed(2) }} //
          {{ cameraHUD.z.toFixed(2) }}
        </div>
        <div>
          {{ cameraHUD.rx.toFixed(1) }} // {{ cameraHUD.ry.toFixed(1) }} //
          {{ cameraHUD.rz.toFixed(1) }}
        </div>
      </div>

      <div class="page-headline flex items-center justify-between">
        <span>EDITMODE</span>
        <button class="btn-reset" @click="resetCamera">
          Reset CAM-Position
        </button>
      </div>

      <div class="row">
        <div
          class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3"
        >
          <p class="mb-2">
            W/S: vor &amp; zurück · A/D: strafe ·
            <strong>Shift+Mausrad: Distanz des gehaltenen Würfels</strong> · +:
            Würfel ablegen · Reset: Kamera auf Ursprung
          </p>
        </div>
      </div>
    </div>

    <!-- Rechte Sidebar: Container für alle Panels -->
    <div class="panel-stack" ref="panelStack"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { createBackgroundSphereFromAPI } from "../composables/backgroundsphere.js";

definePageMeta({ layout: "three" });

let $three;
let bgSphere = null;
// HUD
const cameraHUD = ref({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });

// TransformControls / GUI
let TransformControlsClass = null;
let GUIClass = null;
let transform = null;

// Preview/Solid Materialien — nur Preview halbtransparent
const baseMatProps = { color: 0x00aaff, metalness: 0.2, roughness: 0.7 };
const SOLID_MAT = new THREE.MeshStandardMaterial({
  ...baseMatProps,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const PREVIEW_MAT = new THREE.MeshStandardMaterial({
  ...baseMatProps,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});

// Preview cube
let cube = null;
let previewDist = 1.5;
const minDist = 0.2, maxDist = 20;

// WASD flight
const pressed = new Set();
const WASD = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const tmpForward = new THREE.Vector3();
const tmpRight   = new THREE.Vector3();
let lastTime = 0;
const MOVE_SPEED = 2.5;

// Selection
const placed = [];
const selected = ref(null);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Right panel
const panelStack = ref(null);
const cubeUI = new Map();
let nextId = 1;
let overPanel = false; // Cursor über Panel-Spalte?

// Background sphere
let bgParams = { panoramaDeg: 0, panoramaAmp: 0, autoRotate: false, speedDegPerSec: 6 };

// ---------- Grid-Refs + Params ----------
let grid = null;
let gridMajor = null;
let axesHelper = null;
const gridParams = { y: 0 }; // Höhe in Metern (Start 0,0,0)

// ---------- Clipping-Toggle ----------
const gridClip = { insideSphereOnly: true };

/* ---------- Helpers ---------- */
function makeCube(material = SOLID_MAT) {
  const size = 0.2;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    material
  );
  mesh.frustumCulled = false;
  mesh.userData.kind = "cube";
  return mesh;
}
function ensureCameraInScene() {
  if (!$three.scene.children.includes($three.camera)) $three.scene.add($three.camera);
}
function spawnCubeAttached() {
  const newCube = makeCube(PREVIEW_MAT); // Preview halbtransparent
  if (newCube instanceof THREE.Object3D && $three?.camera instanceof THREE.Object3D) {
    newCube.position.set(0, 0, -previewDist);
    $three.camera.add(newCube);
    ensureCameraInScene();
  }
  return newCube;
}
function addGridHelper() {
  const size = 100, divisions = size;

  grid = new THREE.GridHelper(size, divisions, 0xffffff, 0x707070);
  grid.position.y = gridParams.y;
  grid.material.transparent = true;
  grid.material.opacity = 0.95;
  grid.material.depthTest = true;             // wichtig fürs Clipping
  grid.material.depthWrite = false;
  grid.material.depthFunc = THREE.LessEqualDepth; // nur innerhalb der Sphere sichtbar
  grid.renderOrder = 1;
  $three.scene.add(grid);

  gridMajor = new THREE.GridHelper(size, size / 10, 0xffffff, 0xffffff);
  gridMajor.position.y = gridParams.y;
  gridMajor.material.transparent = true;
  gridMajor.material.opacity = 1.0;
  gridMajor.material.depthTest = true;
  gridMajor.material.depthWrite = false;
  gridMajor.material.depthFunc = THREE.LessEqualDepth;
  gridMajor.renderOrder = 2;
  $three.scene.add(gridMajor);

  axesHelper = new THREE.AxesHelper(1.5);
  axesHelper.position.y = gridParams.y;
  axesHelper.renderOrder = 3;
  if (Array.isArray(axesHelper.material)) {
    axesHelper.material.forEach(m => {
      m.depthTest = true; m.depthWrite = false; m.depthFunc = THREE.LessEqualDepth;
    });
  } else if (axesHelper.material) {
    axesHelper.material.depthTest = true;
    axesHelper.material.depthWrite = false;
    axesHelper.material.depthFunc = THREE.LessEqualDepth;
  }
  $three.scene.add(axesHelper);
}

function resetCamera() {
  if (!$three?.camera || !$three?.controls) return;
  const cam = $three.camera;
  const controls = $three.controls;
  cam.position.set(0, 0, 0);
  cam.quaternion.set(0, 0, 0, 1);
  cam.updateMatrixWorld(true);
  controls.target.set(0, 0, -1);
  controls.update();
}
function safeDetachToScene(obj) {
  if (!(obj instanceof THREE.Object3D)) return;
  $three.camera.updateMatrixWorld(true);
  obj.updateMatrixWorld(true);
  if (typeof $three.scene.attach === "function") {
    $three.scene.attach(obj);
  } else {
    const m = new THREE.Matrix4().copy(obj.matrixWorld);
    $three.scene.add(obj);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    m.decompose(p, q, s);
    obj.position.copy(p); obj.quaternion.copy(q); obj.scale.copy(s);
    obj.updateMatrixWorld(true);
  }
}

/* ---------- Selection ---------- */
function setSelected(obj) {
  selected.value = obj || null;
  if (transform) obj ? transform.attach(obj) : transform.detach();
  cubeUI.forEach((ui, o) => ui.header?.classList.toggle("active", o === obj));
}
function onPointerDown(e) {
  if (!$three?.camera) return;
  const rect = e.currentTarget.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, $three.camera);
  const hits = raycaster.intersectObjects(placed, false);
  setSelected(hits[0]?.object ?? null);
}

/* ---------- Drop Cube ---------- */
function dropAndSpawnNew() {
  // Vor dem Ablösen: Material auf solide wechseln
  if (cube) cube.material = SOLID_MAT.clone();

  safeDetachToScene(cube);
  placed.push(cube);
  createPanelForCube(cube);
  setSelected(cube);
  cube = spawnCubeAttached(); // neuer halbtransparenter Preview-Würfel
}

/* ---------- Keyboard / Wheel ---------- */
function onKeyDown(e) {
  if (!$three?.controls) return;
  if (WASD.has(e.code)) {
    pressed.add(e.code);
    $three.controls.enableZoom = false;
  }
  if (transform && pressed.size === 0) {
    if (e.code === "KeyW") transform.setMode("translate");
    if (e.code === "KeyE") transform.setMode("rotate");
    if (e.code === "KeyR") transform.setMode("scale");
  }
  if (e.key === "+" || e.code === "NumpadAdd") {
    if (!cube) return;
    dropAndSpawnNew();
  }
}
function onKeyUp(e) {
  if (!$three?.controls) return;
  if (WASD.has(e.code)) {
    pressed.delete(e.code);
    if (pressed.size === 0) $three.controls.enableZoom = true;
  }
}
function onWheel(e) {
  // Wenn Cursor über Panels, nie in die Preview-Distanz eingreifen
  if (overPanel) return;

  if (pressed.size > 0) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (!e.shiftKey) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  if (!cube) return;
  const step = THREE.MathUtils.clamp(previewDist * 0.1, 0.05, 1);
  previewDist += (e.deltaY > 0 ? 1 : -1) * step;
  previewDist = THREE.MathUtils.clamp(previewDist, minDist, maxDist);
  cube.position.set(0, 0, -previewDist);
}

/* ---------- Tick / Flight ---------- */
function tick(now) {
  if (!$three?.controls || !$three?.camera) return;
  const dt = lastTime ? (now - lastTime) / 1000 : 0; lastTime = now;

  // WASD-Flight
  if (pressed.size > 0) {
    const cam = $three.camera, c = $three.controls;
    cam.getWorldDirection(tmpForward).normalize();
    tmpRight.crossVectors(tmpForward, cam.up).normalize();
    const move = new THREE.Vector3();
    if (pressed.has("KeyW")) move.addScaledVector(tmpForward,  MOVE_SPEED * dt);
    if (pressed.has("KeyS")) move.addScaledVector(tmpForward, -MOVE_SPEED * dt);
    if (pressed.has("KeyD")) move.addScaledVector(tmpRight,    MOVE_SPEED * dt);
    if (pressed.has("KeyA")) move.addScaledVector(tmpRight,   -MOVE_SPEED * dt);
    if (move.lengthSq() > 0) { cam.position.add(move); c.target.add(move); c.update(); }
  }

  // Shader-Time & Auto-Rotate für Background
  if (bgSphere?.material?.uniforms) {
    if (bgSphere.material.uniforms.uTime) {
      bgSphere.material.uniforms.uTime.value += dt;
    }
    if (bgParams.autoRotate && bgSphere.material.uniforms.uOffset) {
      bgParams.panoramaDeg = (bgParams.panoramaDeg + bgParams.speedDegPerSec * dt) % 360;
      bgSphere.material.uniforms.uOffset.value = bgParams.panoramaDeg / 360;
    }
  }

  $three.controls.update?.();
  requestAnimationFrame(tick);
}

/* ---------- Panels ---------- */
function createPanelForCube(obj) {
  const id = nextId++;
  const cont = document.createElement("div");
  cont.className = "cube-panel";
  const header = document.createElement("div");
  header.className = "cube-panel__header";
  header.innerHTML = `<span>Würfel #${id}</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "cube-panel__close";
  closeBtn.textContent = "✕";
  header.appendChild(closeBtn);
  cont.appendChild(header);
  const body = document.createElement("div");
  body.className = "cube-panel__body";
  cont.appendChild(body);
  header.addEventListener("click", () => setSelected(obj));
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteCubeAndPanel(obj); });
  panelStack.value?.appendChild(cont);

  const gui = new GUIClass({ container: body, title: "Eigenschaften" });

  const posFolder = gui.addFolder("Position (m)");
  posFolder.add(obj.position, "x", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.add(obj.position, "y", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.add(obj.position, "z", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.open();

  const rotProxy = {
    rx: THREE.MathUtils.radToDeg(obj.rotation.x),
    ry: THREE.MathUtils.radToDeg(obj.rotation.y),
    rz: THREE.MathUtils.radToDeg(obj.rotation.z),
  };
  const syncProxyFromObj = () => {
    rotProxy.rx = THREE.MathUtils.radToDeg(obj.rotation.x);
    rotProxy.ry = THREE.MathUtils.radToDeg(obj.rotation.y);
    rotProxy.rz = THREE.MathUtils.radToDeg(obj.rotation.z);
    rxCtrl.updateDisplay(); ryCtrl.updateDisplay(); rzCtrl.updateDisplay();
  };
  const rotFolder = gui.addFolder("Rotation (°)");
  const rxCtrl = rotFolder.add(rotProxy, "rx", -180, 180, 1).onChange(v=>{ obj.rotation.x = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });
  const ryCtrl = rotFolder.add(rotProxy, "ry", -180, 180, 1).onChange(v=>{ obj.rotation.y = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });
  const rzCtrl = rotFolder.add(rotProxy, "rz", -180, 180, 1).onChange(v=>{ obj.rotation.z = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });

  transform?.addEventListener("change", () => {
    if (selected.value === obj) {
      posFolder.controllers.forEach(c => c.updateDisplay?.());
      syncProxyFromObj();
    }
  });

  cubeUI.set(obj, { id, container: cont, header, body, gui, rotProxy });
}

function createBackgroundPanel() {
  if (!GUIClass || !panelStack.value || !bgSphere?.material?.uniforms) return;

  const cont = document.createElement("div");
  cont.className = "cube-panel";
  const header = document.createElement("div");
  header.className = "cube-panel__header";
  header.innerHTML = `<span>Background</span>`;
  cont.appendChild(header);
  const body = document.createElement("div");
  body.className = "cube-panel__body";
  cont.appendChild(body);
  panelStack.value.appendChild(cont);

  const gui = new GUIClass({ container: body, title: "Panorama" });

  gui.add(bgParams, "panoramaDeg", 0, 360, 1).name("Offset (°)").onChange((deg) => {
    if (bgSphere.material.uniforms.uOffset) {
      bgSphere.material.uniforms.uOffset.value = (deg % 360) / 360;
    }
  });
  gui.add(bgParams, "panoramaAmp", 0, 100, 0.1).name("Amplitude").onChange((v) => {
    if (bgSphere.material.uniforms.uAmplitude) {
      bgSphere.material.uniforms.uAmplitude.value = v;
    }
  });
  gui.add(bgParams, "autoRotate").name("Auto-Rotate");
  gui.add(bgParams, "speedDegPerSec", 0, 60, 0.1).name("Speed (°/s)");
}

// ---------- Grid-Panel inkl. Clipping-Toggle ----------
function applyGridClipping(v) {
  // Sphere muss Depth schreiben, damit sie das Grid "abschneidet"
  if (bgSphere?.material) bgSphere.material.depthWrite = v;
  if (bgSphere) bgSphere.renderOrder = 0; // zuerst rendern

  // Grid/Axis Depth-Test an/aus; depthFunc bleibt LessEqualDepth wenn aktiv
  if (grid?.material) grid.material.depthTest = v;
  if (gridMajor?.material) gridMajor.material.depthTest = v;

  if (axesHelper) {
    if (Array.isArray(axesHelper.material)) {
      axesHelper.material.forEach(m => m.depthTest = v);
    } else if (axesHelper.material) {
      axesHelper.material.depthTest = v;
    }
  }
}

function createGridPanel() {
  if (!GUIClass || !panelStack.value) return;

  const cont = document.createElement("div");
  cont.className = "cube-panel";
  const header = document.createElement("div");
  header.className = "cube-panel__header";
  header.innerHTML = `<span>Grid</span>`;
  cont.appendChild(header);
  const body = document.createElement("div");
  body.className = "cube-panel__body";
  cont.appendChild(body);
  panelStack.value.appendChild(cont);

  const gui = new GUIClass({ container: body, title: "Einstellungen" });

  // Höhe (Y)
  gui.add(gridParams, "y", -50, 50, 0.01)
    .name("Höhe (Y)")
    .onChange((v) => {
      if (grid) grid.position.y = v;
      if (gridMajor) gridMajor.position.y = v;
      if (axesHelper) axesHelper.position.y = v;
    });

  // Nur innerhalb Sphere sichtbar
  gui.add(gridClip, "insideSphereOnly")
    .name("Nur innerhalb Sphere")
    .onChange(applyGridClipping);

  // Optional: Sichtbarkeit/Opazität
  const vis = {
    grid: true,
    major: true,
    axes: true,
    opacity: grid?.material?.opacity ?? 0.95,
    majorOpacity: gridMajor?.material?.opacity ?? 1.0
  };
  gui.add(vis, "grid").name("Fein-Grid sichtbar").onChange(v => { if (grid) grid.visible = v; });
  gui.add(vis, "major").name("Haupt-Grid sichtbar").onChange(v => { if (gridMajor) gridMajor.visible = v; });
  gui.add(vis, "axes").name("Achsen sichtbar").onChange(v => { if (axesHelper) axesHelper.visible = v; });
  gui.add(vis, "opacity", 0, 1, 0.01).name("Fein-Grid Opazität").onChange(v => { if (grid && grid.material) grid.material.opacity = v; });
  gui.add(vis, "majorOpacity", 0, 1, 0.01).name("Haupt-Grid Opazität").onChange(v => { if (gridMajor && gridMajor.material) gridMajor.material.opacity = v; });
}

function deleteCubeAndPanel(obj) {
  const idx = placed.indexOf(obj);
  if (idx >= 0) placed.splice(idx, 1);
  $three.scene.remove(obj);
  if (selected.value === obj) setSelected(null);
  const info = cubeUI.get(obj);
  info?.gui?.destroy();
  info?.container?.remove();
  cubeUI.delete(obj);
}

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  // Three-Komponenten aus Nuxt holen
  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js");
    const devScene = await mod.init(true, true);
    $three = { ...devScene, init: async () => devScene };
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
  }

  bgSphere = $three.backgroundSphere;

  if ($three?.controls) {
    const c = $three.controls;
    c.enableRotate = true; c.enableZoom = true; c.enablePan = true;
    c.dampingFactor = 0.05; c.enableKeys = false; c.update();
  }

  const [{ TransformControls }, { GUI }] = await Promise.all([
    import("three/examples/jsm/controls/TransformControls.js"),
    import("three/examples/jsm/libs/lil-gui.module.min.js"),
  ]);
  TransformControlsClass = TransformControls;
  GUIClass = GUI;

  transform = new TransformControlsClass($three.camera, $three.renderer.domElement);
  transform.setMode("translate");
  transform.addEventListener("dragging-changed", (e) => {
    if ($three?.controls) $three.controls.enabled = !e.value;
  });
  if (!$three.scene.children.includes(transform)) $three.scene.add(transform);

  // Background-Sphere: Depth schreiben & früh rendern
  if (bgSphere?.material) bgSphere.material.depthWrite = true;
  if (bgSphere) bgSphere.renderOrder = 0;

  addGridHelper();
  // RenderOrder für Hilfen hintereinander
  if (grid) grid.renderOrder = 1;
  if (gridMajor) gridMajor.renderOrder = 2;
  if (axesHelper) axesHelper.renderOrder = 3;

  createGridPanel();
  // initial Clipping anwenden
  applyGridClipping(gridClip.insideSphereOnly);

  // Preview-Cube
  cube = spawnCubeAttached();

  // HUD sync
  const updateHUD = () => {
    cameraHUD.value = {
      x: $three.camera.position.x,
      y: $three.camera.position.y,
      z: $three.camera.position.z,
      rx: THREE.MathUtils.radToDeg($three.camera.rotation.x),
      ry: THREE.MathUtils.radToDeg($three.camera.rotation.y),
      rz: THREE.MathUtils.radToDeg($three.camera.rotation.z),
    };
  };
  updateHUD();
  $three.controls.addEventListener("change", updateHUD);

  // Events
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("wheel", onWheel, { passive: false });
  document.querySelector(".three-wrapper")?.addEventListener("pointerdown", onPointerDown);

  // OrbitControls beim Hover über Panels deaktivieren (statt Events zu blocken)
  const panelEl = panelStack.value;
  if (panelEl) {
    panelEl.addEventListener("mouseenter", () => {
      overPanel = true;
      if ($three?.controls) $three.controls.enabled = false;
    });
    panelEl.addEventListener("mouseleave", () => {
      overPanel = false;
      if ($three?.controls) $three.controls.enabled = true;
    });
  }

  // Background-Panel erzeugen (falls vorhanden)
  if (bgSphere) createBackgroundPanel();

  requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("wheel", onWheel);
  document.querySelector(".three-wrapper")?.removeEventListener("pointerdown", onPointerDown);
  cubeUI.forEach(ui => ui.gui?.destroy());
});
</script>

<style>
.cameraPos {
  position: fixed;
  bottom: 3rem;
  left: 1rem;
  color: white;
  width: 154px;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.25rem 0.5rem;
  border-radius: 0;
  font-size: 0.875rem;
}

.page-content {
  padding-bottom: 1rem;
}
.three-wrapper {
  position: relative;
  min-height: 1px;
}
.page-headline {
  font-weight: 700;
  font-size: 1.25rem;
  padding: 0.75rem 1rem;
}

.btn-reset {
  background: #0af;
  color: #fff;
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
}
.btn-reset:hover {
  background: #0080c0;
}

.panel-stack {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  pointer-events: auto;
  z-index: 20;
  overscroll-behavior: contain;
}

.cube-panel__header {
  display: flex;
  color: #fff;
  background: #000;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  user-select: none;
  cursor: pointer;
}
.cube-panel__header.active {
  outline: 2px solid #0af;
}
.cube-panel__header span {
  color: #fff;
}
.cube-panel__close {
  background: transparent;
  color: #fff;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.85;
}
.cube-panel__close:hover {
  opacity: 1;
}

button.btn-reset {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 1000;
}
</style>
