<template>
  <div class="page-content">
    <div class="container-fluid p-0">
      <div class="page-headline flex items-center justify-between">
        <span>EDITMODE</span>
        <button class="btn-reset" @click="resetCamera">Reset Position</button>
      </div>
      <div class="row">
        <div class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3">
          <p class="mb-2">
            W/S: vor &amp; zurück · A/D: strafe · Mausrad: Distanz des gehaltenen Würfels · +: Würfel ablegen · Reset: Kamera auf Ursprung
          </p>
        </div>
      </div>
    </div>

    <ClientOnly placeholder="<div style='height:1px'></div>">
      <div class="three-wrapper"></div>
    </ClientOnly>

    <!-- Rechte Sidebar: Container für alle Cube-Panels -->
    <div class="panel-stack" ref="panelStack"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";

definePageMeta({ layout: "three" });

let $three;

// — Vorschauwürfel —
let cube = null;
let previewDist = 1.5;
const minDist = 0.2;
const maxDist = 20;

// — Kamera-Flight (WASD) —
const pressed = new Set();
const WASD = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const tmpForward = new THREE.Vector3();
const tmpRight   = new THREE.Vector3();
let lastTime = 0;
const MOVE_SPEED = 2.5; // m/s

// — Auswahl / Raycast —
const placed = [];
const selected = ref(null);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// — TransformControls + lil-gui —
let TransformControlsClass = null;
let GUIClass = null;
let transform = null;

// — Panel-Container (DOM) —
const panelStack = ref(null);
// Map: Object3D -> { id, container, header, body, gui, rotProxy }
const cubeUI = new Map();
let nextId = 1;

// — Helpers —
function makeCube() {
  const size = 0.2;
  const geom = new THREE.BoxGeometry(size, size, size);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.2, roughness: 0.7 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.frustumCulled = false;
  mesh.userData.kind = "cube";
  return mesh;
}
function ensureCameraInScene() {
  if (!$three.scene.children.includes($three.camera)) $three.scene.add($three.camera);
}
function spawnCubeAttached() {
  const newCube = makeCube();
  newCube.position.set(0, 0, -previewDist);
  $three.camera.add(newCube);
  ensureCameraInScene();
  return newCube;
}
function addGridHelper() {
  const size = 20, divisions = size;
  const grid = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
  grid.material.opacity = 0.5; grid.material.transparent = true;
  $three.scene.add(grid);
}
function resetCamera() {
  if (!$three?.camera || !$three?.controls) return;

  const cam = $three.camera;
  const controls = $three.controls;

  // Kamera an den Ursprung setzen und Standardausrichtung herstellen (Blick entlang -Z)
  cam.position.set(0, 0, 0);
  cam.quaternion.set(0, 0, 0, 1); // Identitätsrotation
  cam.updateMatrixWorld(true);

  // OrbitControls-Target NICHT auf die Kamera setzen (sonst Distanz = 0!)
  // Stattdessen leicht nach vorn (-Z), damit Orbit sauber arbeitet.
  controls.target.set(0, 0, -1);
  controls.update();

  // Wichtig: Den Vorschauwürfel NICHT anfassen.
  // Wenn er an der Kamera hängt (local z = -previewDist), bleibt er automatisch vorne.
}

// — Auswahl —
function setSelected(obj) {
  selected.value = obj || null;
  if (transform) {
    if (obj) transform.attach(obj); else transform.detach();
  }
  // Panels optisch markieren
  cubeUI.forEach((ui, o) => {
    if (!ui.header) return;
    ui.header.classList.toggle("active", o === obj);
  });
}

function onPointerDown(e) {
  if (!$three?.camera) return;
  const wrapper = e.currentTarget;
  const rect = wrapper.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, $three.camera);
  const hits = raycaster.intersectObjects(placed, false);
  setSelected(hits[0]?.object ?? null);
}

// — Würfel ablegen (+) —
function dropAndSpawnNew() {
  $three.camera.updateMatrixWorld(true);
  cube.updateMatrixWorld(true);

  if (typeof $three.scene.attach === "function") {
    $three.scene.attach(cube);
  } else {
    const saved = new THREE.Matrix4().copy(cube.matrixWorld);
    $three.scene.add(cube);
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    saved.decompose(pos, quat, scl);
    cube.position.copy(pos); cube.quaternion.copy(quat); cube.scale.copy(scl);
    cube.updateMatrixWorld(true);
  }
  placed.push(cube);
  createPanelForCube(cube);   // <<< eigenes Panel erzeugen
  setSelected(cube);          // Gizmo dran
  cube = spawnCubeAttached();
}

// — Keyboard / Wheel —
function onKeyDown(e) {
  if (!$three?.controls) return;

  if (WASD.has(e.code)) {
    pressed.add(e.code);
    $three.controls.enableZoom = false;
  }

  // TransformControls Mode-Shortcuts (W/E/R)
  if (transform) {
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
    if ([...pressed].every(k => !WASD.has(k))) $three.controls.enableZoom = true;
  }
}
function onWheel(e) {
  if ([...pressed].some(k => WASD.has(k))) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (!cube) return;
  const step = THREE.MathUtils.clamp(previewDist * 0.1, 0.05, 1);
  previewDist += (e.deltaY > 0 ? 1 : -1) * step;
  previewDist = THREE.MathUtils.clamp(previewDist, minDist, maxDist);
  cube.position.set(0, 0, -previewDist);
  cube.updateMatrixWorld();
}

// — Tick / Flight —
function tick(now) {
  if (!$three?.controls || !$three?.camera) return;
  const dt = lastTime ? (now - lastTime) / 1000 : 0; lastTime = now;

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

  $three.controls.update?.();
  requestAnimationFrame(tick);
}

// — Panel-Erzeugung pro Würfel —
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

  // Klick auf Header → selektiert den Würfel
  header.addEventListener("click", () => setSelected(obj));

  // Close löscht den zugehörigen Würfel + Panel
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteCubeAndPanel(obj);
  });

  panelStack.value?.appendChild(cont);

  // lil-gui im Body mounten
  const gui = new GUIClass({ container: body, title: "Eigenschaften" });

  // Position (live listen)
  const posFolder = gui.addFolder("Position (m)");
  posFolder.add(obj.position, "x", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.add(obj.position, "y", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.add(obj.position, "z", -50, 50, 0.01).listen().onChange(()=>obj.updateMatrixWorld(true));
  posFolder.open();

  // Rotation in Grad (Proxy + listen via change)
  const rotProxy = {
    rx: THREE.MathUtils.radToDeg(obj.rotation.x),
    ry: THREE.MathUtils.radToDeg(obj.rotation.y),
    rz: THREE.MathUtils.radToDeg(obj.rotation.z),
  };
  const syncProxyFromObj = () => {
    rotProxy.rx = THREE.MathUtils.radToDeg(obj.rotation.x);
    rotProxy.ry = THREE.MathUtils.radToDeg(obj.rotation.y);
    rotProxy.rz = THREE.MathUtils.radToDeg(obj.rotation.z);
    // Controllers updaten:
    rotXCtrl.updateDisplay(); rotYCtrl.updateDisplay(); rotZCtrl.updateDisplay();
  };
  const rotFolder = gui.addFolder("Rotation (°)");
  const rotXCtrl = rotFolder.add(rotProxy, "rx", -180, 180, 1).onChange((v)=>{ obj.rotation.x = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });
  const rotYCtrl = rotFolder.add(rotProxy, "ry", -180, 180, 1).onChange((v)=>{ obj.rotation.y = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });
  const rotZCtrl = rotFolder.add(rotProxy, "rz", -180, 180, 1).onChange((v)=>{ obj.rotation.z = THREE.MathUtils.degToRad(v); obj.updateMatrixWorld(true); });

  // Aktionen
  const actions = {
    "Rotation 0°": ()=>{ obj.rotation.set(0,0,0); obj.updateMatrixWorld(true); syncProxyFromObj(); },
    "Auf Boden (Y=0)": ()=>{ obj.position.y = 0; obj.updateMatrixWorld(true); },
    "Auswählen": ()=> setSelected(obj),
  };
  gui.add(actions, "Rotation 0°");
  gui.add(actions, "Auf Boden (Y=0)");
  gui.add(actions, "Auswählen");

  // Bei TransformControls-Bewegung die GUI-Proxywerte nachziehen
  transform?.addEventListener("change", () => {
    if (selected.value === obj) {
      syncProxyFromObj();
    }
  });

  cubeUI.set(obj, { id, container: cont, header, body, gui, rotProxy });
}

function deleteCubeAndPanel(obj) {
  // Szene
  const idx = placed.indexOf(obj);
  if (idx >= 0) placed.splice(idx, 1);
  $three.scene.remove(obj);
  if (selected.value === obj) setSelected(null);

  // Panel
  const info = cubeUI.get(obj);
  if (info) {
    info.gui?.destroy();
    info.container?.remove();
    cubeUI.delete(obj);
  }
}



// — Lifecycle —
onMounted(async () => {
  // $three holen
  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js");
    const devScene = await mod.init(true, true);
    $three = { ...devScene, init: async () => devScene };
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
  }

  // OrbitControls Basis
  if ($three?.controls) {
    const c = $three.controls;
    c.enableRotate = true; c.enableZoom = true; c.enablePan = true;
    c.dampingFactor = 0.05; c.enableKeys = false; c.update();
  }

  // Examples dynamisch importieren
  const [{ TransformControls }, { GUI }] = await Promise.all([
    import("three/examples/jsm/controls/TransformControls.js"),
    import("three/examples/jsm/libs/lil-gui.module.min.js"),
  ]);
  TransformControlsClass = TransformControls;
  GUIClass = GUI;

  // TransformControls
  transform = new TransformControlsClass($three.camera, $three.renderer.domElement);
  transform.setMode("translate");
  transform.addEventListener("dragging-changed", (e) => {
    if ($three?.controls) $three.controls.enabled = !e.value;
  });
  $three.scene.add(transform);

  // Szene vorbereiten
  addGridHelper();
  cube = spawnCubeAttached();

  // Events
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("wheel", onWheel, { passive: false });

  const wrapper = document.querySelector(".three-wrapper");
  wrapper?.addEventListener("pointerdown", onPointerDown);

  // Loop
  requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("wheel", onWheel);
  const wrapper = document.querySelector(".three-wrapper");
  wrapper?.removeEventListener("pointerdown", onPointerDown);
  // Panels & GUIs aufräumen
  cubeUI.forEach((ui) => ui.gui?.destroy());
});
</script>

<style>



.page-content { padding-bottom: 1rem; }
.three-wrapper { position: relative; min-height: 1px; }
.page-headline { font-weight: 700; font-size: 1.25rem; padding: .75rem 1rem; }
.btn-reset { background: #0af; color: white; font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 0.375rem; border: none; cursor: pointer; }
.btn-reset:hover { background: #0080c0; }

/* Rechte Sidebar: Stack der Panels */
.panel-stack {
  position: fixed;
  top:0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  overflow: auto;
  pointer-events: auto;
  z-index: 20;
}



/* Einzelnes Panel */

.cube-panel__header {
  display: flex;
  color: #fff;
  background: #000000;
  justify-content: space-between;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding: .5rem .75rem;
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
  opacity: .85;
}
.cube-panel__close:hover { opacity: 1; }


button.btn-reset {
  position: fixed;
   top: 0;
   left: 0;
   z-index: 1000;
}


</style>


<style>

.page-layout {
  display: block !important;
}
</style>

