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

/* ---------- Sphere-Outline (Schnittkreis als dünner Ring) ---------- */
let boundaryRing = null;        // Mesh (RingGeometry)
const ringSegs = 128;
const RING_THICKNESS = 0.02;
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xff0000,           // rot ✅
  transparent: true,
  opacity: 1.0,
  depthTest: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

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

  // Ring initial aktualisieren
  updateBoundaryRing();
}

function getSphereWorldCenter() {
  const c = new THREE.Vector3();
  if (bgSphere) bgSphere.getWorldPosition(c); else c.set(0,0,0);
  return c;
}

function resetCamera() {
  if (!$three?.camera || !$three?.controls) return;
  const cam = $three.camera;
  const controls = $three.controls;

  // Zielpunkt = Sphere-Center (oder 0,0,0-Fallback)
  const center = getSphereWorldCenter();

  // Distanz an Sphere-Radius koppeln (oder 5 als Fallback)
  const R = getSphereRadiusWorld() ?? 5;
  const dist = Math.max(2, R * 0.6);

  // Gitter-parallel: Azimut = 0° (Blick entlang -Z), Up = +Y, leichte Elevation
  const elevDeg = 20;                 // 0 = auf Grid-Höhe, 90 = Top-Down
  const azimDeg = 0;                  // exakt an X/Z-Grid-Linien ausgerichtet
  const phi   = THREE.MathUtils.degToRad(90 - elevDeg);
  const theta = THREE.MathUtils.degToRad(azimDeg);

  const offset = new THREE.Vector3().setFromSpherical(
    new THREE.Spherical(dist, phi, theta)
  );

  // Up-Achse sicherstellen (kein Roll)
  cam.up.set(0, 1, 0);

  // Position & Target setzen
  cam.position.copy(center).add(offset);
  controls.target.copy(center);

  // Blick exakt auf Target richten (eliminiert Roll vollständig)
  cam.lookAt(center);

  cam.updateMatrixWorld(true);
  controls.update();

  // evtl. hängende Orbit-States beenden (sanfter UX-Fix)
  controls.dispatchEvent({ type: 'end' });
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
  if (cube) cube.material = SOLID_MAT.clone();
  safeDetachToScene(cube);
  placed.push(cube);
  createPanelForCube(cube);
  setSelected(cube);
  cube = spawnCubeAttached();
}

/* ---------- Editable Guard ---------- */
function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === 'input' || tag === 'textarea' || tag === 'select' ||
    el.isContentEditable
  );
}

/* ---------- Keyboard / Wheel ---------- */
function onKeyDown(e) {
  if (!$three?.controls) return;

  // 1) Drop-Shortcut zuerst & immer erlauben (auch wenn ein Input fokussiert ist)
  if (e.key === "+" || e.code === "NumpadAdd") {
    e.preventDefault();
    e.stopPropagation();
    if (!cube) cube = spawnCubeAttached();
    dropAndSpawnNew();
    return;
  }

  // 2) Wenn im Eingabefeld: restliche Shortcuts ignorieren
  if (isEditable(document.activeElement)) return;

  // 3) WASD greift immer (vor lil-gui), Scroll verhindern
  if (WASD.has(e.code)) {
    e.preventDefault();
    pressed.add(e.code);
    $three.controls.enableZoom = false;
    return;
  }

  // 4) W/E/R nur, wenn NICHT im Flugmodus
  if (transform && pressed.size === 0) {
    if (e.code === "KeyW") transform.setMode("translate");
    if (e.code === "KeyE") transform.setMode("rotate");
    if (e.code === "KeyR") transform.setMode("scale");
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

/* ---------- OrbitControls Stabilisierung ---------- */
function finalizeOrbitControls() {
  if (!$three?.controls) return;
  const c = $three.controls;
  c.dispatchEvent({ type: 'end' }); // beendet hängende ROTATE/DOLLY/PAN-States
  c.update();
  if (!overPanel) c.enabled = true; // nicht über Panel? sicher aktiv
}
function resetZoomIfStuck() {
  if ($three?.controls) $three.controls.enableZoom = true;
}
// Listener-Refs für sauberes removeEventListener
let _onPointerUp, _onPointerLeave, _onPointerCancel, _onContextMenu, _onBlur, _onKeyUpWin;

/* ---------- Schnittkreis-Helper ---------- */
function getSphereRadiusWorld() {
  if (!bgSphere?.geometry) return null;
  let R = bgSphere.geometry.parameters?.radius ?? null;
  if (R == null) {
    bgSphere.geometry.computeBoundingSphere?.();
    R = bgSphere.geometry.boundingSphere?.radius ?? 1;
  }
  const s = bgSphere.scale?.x ?? 1; // uniforme Skalierung angenommen
  return R * s;
}

function updateBoundaryRing() {
  if (!$three || !bgSphere) return;

  const gridY   = gridParams.y;
  const sphereY = bgSphere.position?.y ?? 0;
  const R       = getSphereRadiusWorld();
  if (R == null) return;

  const dy = gridY - sphereY;
  const r2 = R*R - dy*dy;

  // kein Schnitt -> Ring ausblenden
  if (r2 <= 0) {
    if (boundaryRing) boundaryRing.visible = false;
    return;
  }

  const r = Math.sqrt(r2);
  // Dicke adaptiv, damit bei großem r sichtbar bleibt
  const thickness = Math.max(RING_THICKNESS, r * 0.005);
  const inner = Math.max(0, r - thickness * 0.5);
  const outer = r + thickness * 0.5;

  const geom = new THREE.RingGeometry(inner, outer, ringSegs);

  if (!boundaryRing) {
    boundaryRing = new THREE.Mesh(geom, ringMat);
    boundaryRing.rotation.x = -Math.PI / 2;         // XZ-Ebene
    boundaryRing.renderOrder = 2.5;                 // über Grid (1/2)
    $three.scene.add(boundaryRing);
  } else {
    boundaryRing.geometry.dispose?.();
    boundaryRing.geometry = geom;
    boundaryRing.visible = true;
  }

  // Position (XZ um Sphere-Center, Y auf Grid, minimal Offset über Grid)
  boundaryRing.position.set(
    bgSphere.position?.x ?? 0,
    gridY + 1e-4,
    bgSphere.position?.z ?? 0
  );

  // gleiche Clip-Logik wie Grid
  boundaryRing.material.depthTest = gridClip.insideSphereOnly;
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

  if (boundaryRing?.material) boundaryRing.material.depthTest = v; // Ring konsistent clippen
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
      updateBoundaryRing(); // Ring nachziehen
    });

  // Nur innerhalb Sphere sichtbar
  gui.add(gridClip, "insideSphereOnly")
    .name("Nur innerhalb Sphere")
    .onChange((v) => {
      applyGridClipping(v);
    });

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

    // Maus-Buttons explizit mappen (robuste Defaults)
    c.mouseButtons = {
      LEFT:   THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT:  THREE.MOUSE.PAN,
    };
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
  // Add nur, wenn wirklich ein Object3D
  if (transform && (transform instanceof THREE.Object3D || transform.isObject3D)) {
    if (!$three.scene.children.includes(transform)) $three.scene.add(transform);
  }

  // Background-Sphere: Depth schreiben & früh rendern
  if (bgSphere?.material) bgSphere.material.depthWrite = true;
  if (bgSphere) bgSphere.renderOrder = 0;

  addGridHelper();
  if (grid) grid.renderOrder = 1;
  if (gridMajor) gridMajor.renderOrder = 2;
  if (axesHelper) axesHelper.renderOrder = 3;

  createGridPanel();
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
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });
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

  // Stabilitäts-Listener (saubere Referenzen)
  const canvas = $three.renderer?.domElement;
  _onPointerUp     = () => finalizeOrbitControls();
  _onPointerLeave  = () => finalizeOrbitControls();
  _onPointerCancel = () => finalizeOrbitControls();
  _onContextMenu   = (e) => e.preventDefault();
  _onBlur          = () => { pressed.clear(); finalizeOrbitControls(); resetZoomIfStuck(); };
  _onKeyUpWin      = () => { if (pressed.size === 0) resetZoomIfStuck(); };

  if (canvas) {
    canvas.addEventListener('pointerup', _onPointerUp);
    canvas.addEventListener('pointerleave', _onPointerLeave);
    canvas.addEventListener('pointercancel', _onPointerCancel);
    canvas.addEventListener('contextmenu', _onContextMenu);
  }
  window.addEventListener('blur', _onBlur);
  window.addEventListener('keyup', _onKeyUpWin);

  // Ring initial ziehen (falls Sphere/Scale ≠ default)
  updateBoundaryRing();

  requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown, { capture: true });
  window.removeEventListener("keyup", onKeyUp, { capture: true });
  window.removeEventListener("wheel", onWheel);
  document.querySelector(".three-wrapper")?.removeEventListener("pointerdown", onPointerDown);
  cubeUI.forEach(ui => ui.gui?.destroy());

  // Stabilitäts-Listener sauber entfernen
  const canvas = $three?.renderer?.domElement;
  if (canvas) {
    if (_onPointerUp)     canvas.removeEventListener('pointerup', _onPointerUp);
    if (_onPointerLeave)  canvas.removeEventListener('pointerleave', _onPointerLeave);
    if (_onPointerCancel) canvas.removeEventListener('pointercancel', _onPointerCancel);
    if (_onContextMenu)   canvas.removeEventListener('contextmenu', _onContextMenu);
  }
  if (_onBlur)    window.removeEventListener('blur', _onBlur);
  if (_onKeyUpWin) window.removeEventListener('keyup', _onKeyUpWin);
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
  bottom: 1rem;  /* fix: ; statt , */
  left: 1rem;
  z-index: 1000;
}
</style>
