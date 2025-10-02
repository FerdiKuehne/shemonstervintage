import { MathUtils } from "three";

export function toDeg(r) {
  return MathUtils.radToDeg(r);
}

export function toRad(d) {
  return MathUtils.degToRad(d);
}

export function snap001(v) {
  const s = Math.round(v / 0.01) * 0.01;
  return Math.abs(s) < 1e-9 ? 0 : +s.toFixed(6);
}

export function syncFromMesh(state, mesh, sizes, updateArray) {
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
  updateArray.forEach((c) => c.updateDisplay());
}
