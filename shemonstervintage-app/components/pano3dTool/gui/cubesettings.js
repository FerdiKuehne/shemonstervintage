import { CUBE_RANGE, DEFAULT_SIZE } from "../constants.js";
import { snap001, toRad, toDeg } from "../helper.js";

export function createCubeSettingsGUI(
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
) {

  if (!cubesFolder) {
    cubesFolder = gui.addFolder("Würfel");
  }

  const state = {
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    rx: 0,
    ry: 0,
    rz: 0,
    sizeX: sizes.x,
    sizeY: sizes.y,
    sizeZ: sizes.z,
    color: "#5a7dff",
    opacity: 1.0,
  };

  /* Add cube to cubefolder */

  const f = cubesFolder.addFolder(`Würfel ${cubes.length + 1}`);

  let posX, posY, posZ;
  let rotX, rotY, rotZ;
  let sizeXCtrl, sizeYCtrl, sizeZCtrl;
  let colorCtrl, opacityCtrl;

  posX = f
    .add(state, "x", -CUBE_RANGE, CUBE_RANGE, 0.01)
    .name("Pos X [m]")
    .onChange((v) => {
      mesh.position.x = snap001(+v);
      updateRaysFor(mesh, rays, sizes);
    });
  posY = f
    .add(state, "y", -CUBE_RANGE, CUBE_RANGE, 0.01)
    .name("Pos Y [m]")
    .onChange((v) => {
      mesh.position.y = snap001(+v);
      updateRaysFor(mesh, rays, sizes);
    });
  posZ = f
    .add(state, "z", -CUBE_RANGE, CUBE_RANGE, 0.01)
    .name("Pos Z [m]")
    .onChange((v) => {
      mesh.position.z = snap001(+v);
      updateRaysFor(mesh, rays, sizes);
    });
  rotX = f
    .add(state, "rx", -180, 180, 0.1)
    .name("Rot X [°]")
    .onChange((v) => {
      mesh.rotation.x = toRad(v);
      updateRaysFor(mesh, rays, sizes);
    });
  rotY = f
    .add(state, "ry", -180, 180, 0.1)
    .name("Rot Y [°]")
    .onChange((v) => {
      mesh.rotation.y = toRad(v);
      updateRaysFor(mesh, rays, sizes);
    });
  rotZ = f
    .add(state, "rz", -180, 180, 0.1)
    .name("Rot Z [°]")
    .onChange((v) => {
      mesh.rotation.z = toRad(v);
      updateRaysFor(mesh, rays, sizes);
    });

  sizeXCtrl = f
    .add(state, "sizeX", 0.05, 5.0, 0.01)
    .name("Größe X [m]")
    .onChange((v) => {
      sizes.x = Math.max(0.01, +v);
      mesh.scale.x = sizes.x / DEFAULT_SIZE;
      updateRaysFor(mesh, rays, sizes);
    });
  sizeYCtrl = f
    .add(state, "sizeY", 0.05, 5.0, 0.01)
    .name("Größe Y [m]")
    .onChange((v) => {
      const centerAboveGrid =
        mesh.position.y - gridMesh.position.y - sizes.y * 0.5;
      sizes.y = Math.max(0.01, +v);
      mesh.scale.y = sizes.y / DEFAULT_SIZE;
      mesh.position.y = gridMesh.position.y + sizes.y * 0.5 + centerAboveGrid;
      updateRaysFor(mesh, rays, sizes);
      syncFromMesh();
    });
  sizeZCtrl = f
    .add(state, "sizeZ", 0.05, 5.0, 0.01)
    .name("Größe Z [m]")
    .onChange((v) => {
      sizes.z = Math.max(0.01, +v);
      mesh.scale.z = sizes.z / DEFAULT_SIZE;
      updateRaysFor(mesh, rays, sizes);
    });

  colorCtrl = f
    .addColor(state, "color")
    .name("Farbe")
    .onChange((v) => {
      mesh.material.color.set(v);
      if (edges?.material) edges.material.color.set(v);
    });

  opacityCtrl = f
    .add(state, "opacity", 0.0, 1.0, 0.01)
    .name("Transparenz")
    .onChange((v) => {
      const val = Math.max(0, Math.min(1, +v));
      mesh.material.opacity = val;
      mesh.material.transparent = val < 1.0;
      mesh.material.depthWrite = true;
      mesh.material.needsUpdate = true;
    });

  f.add(
    {
      Entfernen: () => {
        const idx = cubes.findIndex((cc) => cc.id === id);
        f.destroy();
        if (rays) {
          rays.traverse((o) => {
            if (o.geometry) o.geometry.dispose?.();
          });
          scene.remove(rays);
        }
        if (mesh) {
          if (edges) {
            edges.geometry.dispose?.();
            edges.material.dispose?.();
          }
          mesh.geometry.dispose?.();
          mesh.material.dispose?.();
          scene.remove(mesh);
          const pi = pickables.indexOf(mesh);
          if (pi >= 0) pickables.splice(pi, 1);
        }
        if (idx >= 0) cubes.splice(idx, 1);
        cubes.forEach((c, i) => c.gui.title(`Würfel ${i + 1}`));
        if (params.activeId === id) {
          if (cubes.length)
            activateCubeById(cubes[Math.min(idx, cubes.length - 1)].id);
          else activateCubeById(-1);
        } else {
          const still = cubes.some((c) => c.id === params.activeId);
          activateCubeById(still ? params.activeId : -1);
        }
      },
    },
    "Entfernen"
  ).name("✖ Entfernen");

  function syncFromMesh() {
    state.x = snap001(mesh.position.x);
    state.y = snap001(mesh.position.y);
    state.z = snap001(mesh.position.z);
    state.rx = +toDeg(mesh.rotation.x).toFixed(1);
    state.ry = +toDeg(mesh.rotation.y).toFixed(1);
    state.rz = +toDeg(mesh.rotation.z).toFixed(1);
    state.sizeX = sizes.x;
    state.sizeY = sizes.y;
    state.sizeZ = sizes.z;
    state.opacity = +mesh.material.opacity.toFixed(2);
    [
      posX,
      posY,
      posZ,
      rotX,
      rotY,
      rotZ,
      sizeXCtrl,
      sizeYCtrl,
      sizeZCtrl,
      colorCtrl,
      opacityCtrl,
    ].forEach((c) => c.updateDisplay());
  }

  const record = {
    id,
    mesh,
    edges,
    rays,
    gui: f,
    state,
    sizes,
    inputControllers: [
      posX,
      posY,
      posZ,
      rotX,
      rotY,
      rotZ,
      sizeXCtrl,
      sizeYCtrl,
      sizeZCtrl,
      colorCtrl,
      opacityCtrl,
    ],
    syncFromMesh,
    sizeXCtrl,
    sizeYCtrl,
    sizeZCtrl,
    opacityCtrl,
  };

  syncFromMesh(state, mesh, sizes, record.inputControllers);

  return { cubesFolder: cubesFolder, record: record };
}
