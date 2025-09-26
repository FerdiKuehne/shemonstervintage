<template>
  <div class="page-content">
    <div class="container-fluid p-0">
      <div class="page-headline flex items-center justify-between">
        <span>EDITMODE</span>
        <!-- Reset-Button -->
        <button class="btn-reset" @click="resetCamera">
          Reset Position
        </button>
      </div>
      <div class="row">
        <div class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3">
          <p class="mb-2">
            W/S: vor &amp; zurück · A/D: pan · Mausrad: Distanz des gehaltenen Würfels · +: Würfel ablegen · Reset: Kamera auf Ursprung
          </p>
        </div>
      </div>
    </div>

    <ClientOnly placeholder="<div style='height:1px'></div>">
      <div class="three-wrapper"></div>
    </ClientOnly>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import * as THREE from "three";

definePageMeta({ layout: "three" });

let $three;
let cube = null;
let keyHandler = null;
let wheelHandler = null;

let previewDist = 1.5;
const minDist = 0.2;
const maxDist = 20;

const forward = new THREE.Vector3();

function makeCube() {
  const size = 0.3;
  const geom = new THREE.BoxGeometry(size, size, size);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    metalness: 0.2,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function ensureCameraInScene() {
  if (!$three.scene.children.includes($three.camera)) {
    $three.scene.add($three.camera);
  }
}

function spawnCubeAttached() {
  const newCube = makeCube();
  newCube.position.set(0, 0, -previewDist);
  $three.camera.add(newCube);
  ensureCameraInScene();
  return newCube;
}

function resetCamera() {
  if (!$three?.camera || !$three?.controls) return;
  const cam = $three.camera;
  const controls = $three.controls;
  cam.position.set(0, 0, 5);     // etwas zurück, damit Ursprung sichtbar
  controls.target.set(0, 0, 0);  // Fokus auf Ursprung
  controls.update();
}

onMounted(async () => {
  // === $three initialisieren ===
  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js");
    const devScene = await mod.init(true, true);
    $three = { ...devScene, init: async () => devScene };
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
  }

  // === Controls ===
  if ($three?.controls) {
    const c = $three.controls;
    const camera = $three.camera;

    c.enableRotate = true;
    c.enableZoom = true;
    c.enablePan = true;
    c.dampingFactor = 0.05;

    // A/D Pan, W/S manuell
    c.enableKeys = true;
    c.keyPanSpeed = 40;
    c.keys = { LEFT: "KeyA", UP: "", RIGHT: "KeyD", BOTTOM: "" };
    c.listenToKeyEvents(window);
    c.update();

    keyHandler = (e) => {
      // W/S → vor/zurück
      if (e.code === "KeyW" || e.code === "KeyS") {
        forward.subVectors(c.target, camera.position).normalize();
        const dir = e.code === "KeyW" ? 1 : -1;
        camera.position.addScaledVector(forward, 0.5 * dir);
        c.target.addScaledVector(forward, 0.5 * dir);
        c.update();
      }

      // + → Würfel abkoppeln
      if (e.key === "+" || e.code === "NumpadAdd") {
        if (!cube) return;

        $three.camera.updateMatrixWorld(true);
        cube.updateMatrixWorld(true);

        if (typeof $three.scene.attach === "function") {
          $three.scene.attach(cube);
        } else {
          const saved = new THREE.Matrix4().copy(cube.matrixWorld);
          $three.scene.add(cube);
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scl  = new THREE.Vector3();
          saved.decompose(pos, quat, scl);

          const prev = cube.matrixAutoUpdate;
          cube.matrixAutoUpdate = false;
          cube.position.copy(pos);
          cube.quaternion.copy(quat);
          cube.scale.copy(scl);
          cube.updateMatrix();
          cube.matrixAutoUpdate = prev;
        }

        cube = spawnCubeAttached();
      }
    };
    window.addEventListener("keydown", keyHandler);

    // Mausrad für Vorschau-Distanz
    wheelHandler = (e) => {
      if (!cube) return;
      const step = THREE.MathUtils.clamp(previewDist * 0.1, 0.05, 1);
      previewDist += (e.deltaY > 0 ? 1 : -1) * step;
      previewDist = THREE.MathUtils.clamp(previewDist, minDist, maxDist);
      cube.position.set(0, 0, -previewDist);
      cube.updateMatrixWorld();
    };
    window.addEventListener("wheel", wheelHandler, { passive: true });
  }

  // ersten Würfel anhängen
  if ($three?.camera) {
    cube = spawnCubeAttached();
  }
});

onBeforeUnmount(() => {
  if (keyHandler) window.removeEventListener("keydown", keyHandler);
  if (wheelHandler) window.removeEventListener("wheel", wheelHandler);
});
</script>

<style scoped>
.page-content { padding-bottom: 1rem; }
.three-wrapper { position: relative; min-height: 1px; }
.page-headline {
  font-weight: 700;
  font-size: 1.25rem;
  padding: .75rem 1rem;
}
.btn-reset {
  background: #0af;
  color: white;
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
}
.btn-reset:hover {
  background: #0080c0;
}
</style>
