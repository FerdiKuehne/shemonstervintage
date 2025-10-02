import { snap001 } from "./helper.js";
import { Vector3, MathUtils } from "three";

let dragState = null; // { cube, offX, offZ }

export function initListener(
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
) {
  window.addEventListener("keydown", (e) => {
    if (isGuiInputFocusedShort()) return;
    const rec = cubes.find((c) => c.id === params.activeId);
    if (!rec) return;

    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
      ].includes(e.code) ||
      e.key === "+" ||
      e.key === "#"
    ) {
      e.preventDefault();
    }

    const step = 0.01;
    let moved = false;

    if (e.code === "ArrowUp") {
      rec.mesh.position.z = snap001(rec.mesh.position.z - step);
      moved = true;
    }
    if (e.code === "ArrowDown") {
      rec.mesh.position.z = snap001(rec.mesh.position.z + step);
      moved = true;
    }
    if (e.code === "ArrowLeft") {
      rec.mesh.position.x = snap001(rec.mesh.position.x - step);
      moved = true;
    }
    if (e.code === "ArrowRight") {
      rec.mesh.position.x = snap001(rec.mesh.position.x + step);
      moved = true;
    }
    if (e.key === "+" || e.code === "NumpadAdd" || e.code === "PageUp") {
      rec.mesh.position.y = snap001(rec.mesh.position.y + step);
      moved = true;
    }
    if (e.key === "#" || e.code === "PageDown") {
      rec.mesh.position.y = snap001(rec.mesh.position.y - step);
      moved = true;
    }

    if (moved) {
      updateRaysFor(rec.mesh, rec.rays, rec.sizes);
      rec.syncFromMesh();
    }
  });

  renderer.domElement.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    const guiRect = document.querySelector(".lil-gui")?.getBoundingClientRect();
    if (
      guiRect &&
      ev.clientX >= guiRect.left &&
      ev.clientX <= guiRect.right &&
      ev.clientY >= guiRect.top &&
      ev.clientY <= guiRect.bottom
    ) {
      return;
    }
    pickAtClient(ev.clientX, ev.clientY, renderer, camera);
  });

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y,
        xj = poly[j].x,
        yj = poly[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function miniToWorldXZ(clientX, clientY) {
    const { pxPerMeter, cx, cy } = getMiniTransform();
    const r = mini.getBoundingClientRect();
    const mx = (clientX - r.left) * (mini.width / r.width);
    const my = (clientY - r.top) * (mini.height / r.height);
    return { x: (mx - cx) / pxPerMeter, z: (my - cy) / pxPerMeter };
  }

  function quadForCube2D(c) {
    const hx = c.sizes.x * 0.5,
      hy = c.sizes.y * 0.5,
      hz = c.sizes.z * 0.5;
    const cornersLocal = [
      new Vector3(-hx, -hy, -hz),
      new Vector3(hx, -hy, -hz),
      new Vector3(hx, -hy, hz),
      new Vector3(-hx, -hy, hz),
    ];
    const worldPts = cornersLocal.map((v) =>
      v.applyQuaternion(c.mesh.quaternion).add(c.mesh.position)
    );
    return worldPts.map((w) => worldXZToMini(w.x, w.z));
  }

  function moveCubeXZ(c, wx, wz) {
    c.mesh.position.x = snap001(wx);
    c.mesh.position.z = snap001(wz);
    updateRaysFor(c.mesh, c.rays, c.sizes);
    c.syncFromMesh();
  }

  function pickCubeOnMini(clientX, clientY) {
    const r = mini.getBoundingClientRect();
    const mx = (clientX - r.left) * (mini.width / r.width);
    const my = (clientY - r.top) * (mini.height / r.height);
    for (let i = cubes.length - 1; i >= 0; i--) {
      const c = cubes[i];
      const poly = quadForCube2D(c);
      if (pointInPoly(mx, my, poly)) return c;
    }
    return null;
  }

  mini.addEventListener("pointerdown", (e) => {
    const cube = pickCubeOnMini(e.clientX, e.clientY);
    if (!cube) return;
    activateCubeById(cube.id);
    const world = miniToWorldXZ(e.clientX, e.clientY);
    dragState = {
      cube,
      offX: cube.mesh.position.x - world.x,
      offZ: cube.mesh.position.z - world.z,
    };
    mini.classList.add("dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragState) return;
    const world = miniToWorldXZ(e.clientX, e.clientY);
    moveCubeXZ(
      dragState.cube,
      world.x + dragState.offX,
      world.z + dragState.offZ
    );
  });
  window.addEventListener("pointerup", () => {
    if (dragState) {
      mini.classList.remove("dragging");
      dragState = null;
    }
  });
  /* ---------- Scroll auf Minimap: Grid hoch/runter ---------- */
  mini.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sensitivity = 0.001;
      const fine = e.shiftKey ? 0.25 : 1.0;
      const deltaMeters = -e.deltaY * sensitivity * fine;
      setGridY(params.gridHeight + deltaMeters);
    },
    { passive: false }
  );

  let baseFov = camera.fov;
  renderer.domElement.addEventListener(
    "gesturestart",
    () => {
      baseFov = camera.fov;
    },
    { passive: true }
  );
  renderer.domElement.addEventListener(
    "gesturechange",
    (e) => {
      const target = MathUtils.clamp(baseFov / e.scale, 40, 140);
      camera.fov = target;
      camera.updateProjectionMatrix();
      passAMat.uniforms.fovY.value = MathUtils.degToRad(target);
      params.cameraFov = target;
      cameraFovCtrl.updateDisplay();
      fovCtrl.updateDisplay();
    },
    { passive: true }
  );

  /* ---------- Reset / Wheel / Resize / Render ---------- */
  document.getElementById("resetView").addEventListener("click", () => {
    controls.reset();
    renderer.domElement.focus();
    syncCamInfoFromCamera();
  });

  function applyFovDelta(deltaY) {
    const scale = Math.exp(deltaY * -0.001);
    const newFov = MathUtils.clamp(camera.fov * scale, 40, 140);
    if (newFov !== camera.fov) {
      camera.fov = newFov;
      camera.updateProjectionMatrix();
      passAMat.uniforms.fovY.value = MathUtils.degToRad(newFov);
      params.cameraFov = newFov;
      cameraFovCtrl.updateDisplay();
      fovCtrl.updateDisplay();
    }
  }

  renderer.domElement.addEventListener(
    "wheel",
    (e) => {
      const guiEl = document.querySelector(".lil-gui");
      const uiBar = document.getElementById("ui");
      const within = (el) => el && el.contains(e.target);
      if (within(guiEl) || within(uiBar)) return;
      e.preventDefault();
      e.stopPropagation();
      applyFovDelta(e.deltaY);
    },
    { passive: false }
  );

  function resizeAll() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    passAMat.uniforms.fovY.value = MathUtils.degToRad(camera.fov);
    passAMat.uniforms.aspect.value = camera.aspect;

    renderer.getDrawingBufferSize(db);
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
  

  window.addEventListener("resize", resizeAll);
}
