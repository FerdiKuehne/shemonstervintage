// ~/components/pano3dTool/minimap/minimap.js
import { SPHERE_RADIUS } from "../constants.js";
import { Vector3 } from "three";

function getMiniTransform(mini) {
  const W = mini.width, H = mini.height;
  const marginPx = 10;
  const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
  const cx = W * 0.5, cy = H * 0.5;
  return { W, H, cx, cy, pxPerMeter, marginPx };
}

function worldXZToMini(x, z, mini) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini);
  return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
}

export function createMinimap() {
  const mini = document.getElementById("minimap");
  const mctx = mini.getContext("2d");
  return { mini, mctx };
}

export function drawMinimap(mini, mctx, gridMesh, gridMat, cubes, params) {
  const { W, H, cx, cy, pxPerMeter } = getMiniTransform(mini);

  // Hintergrund
  mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = "#0e0e10";
  mctx.fillRect(0, 0, W, H);

  mctx.save();
  mctx.translate(cx, cy);

  // --- Kreisradius (effektiver Schnitt) ---
  const h = gridMesh.position.y;
  const rEff = Math.max(0, Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - h * h, 0)));
  const rPx = rEff * pxPerMeter;

  // --- GRID: immer volle Fläche, unabhängig vom Kreis ---
  const stepPx = Math.max(1, gridMat.uniforms.spacing.value * pxPerMeter);

  mctx.strokeStyle = "#1a1f24";
  mctx.lineWidth = 1;

  const halfW = Math.floor((W * 0.5) / stepPx) + 1;
  const halfH = Math.floor((H * 0.5) / stepPx) + 1;

  // Vertikale Linien (x konstant) über volle Höhe
  for (let i = -halfW; i <= halfW; i++) {
    const x = i * stepPx;
    mctx.beginPath();
    mctx.moveTo(x, -H * 0.5);
    mctx.lineTo(x, H * 0.5);
    mctx.stroke();
  }
  // Horizontale Linien (y konstant) über volle Breite
  for (let j = -halfH; j <= halfH; j++) {
    const y = j * stepPx;
    mctx.beginPath();
    mctx.moveTo(-W * 0.5, y);
    mctx.lineTo(W * 0.5, y);
    mctx.stroke();
  }

  // --- Mittelachsen: dezenter ---
  mctx.strokeStyle = "rgba(255,226,138,0.5)"; // dezentes Gelb
  mctx.lineWidth = 1; // dünner
  // X-Achse
  mctx.beginPath();
  mctx.moveTo(-W * 0.5, 0);
  mctx.lineTo(W * 0.5, 0);
  mctx.stroke();
  // Z-Achse
  mctx.beginPath();
  mctx.moveTo(0, -H * 0.5);
  mctx.lineTo(0, H * 0.5);
  mctx.stroke();

  // --- Kreis (Schnitt auf Höhe h) ---
  mctx.strokeStyle = "#4ea1ff";
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.arc(0, 0, rPx, 0, Math.PI * 2);
  mctx.stroke();

  // Mittelpunkt
  mctx.fillStyle = "#ffffff";
  mctx.beginPath();
  mctx.arc(0, 0, 3, 0, Math.PI * 2);
  mctx.fill();

  // --- Cubes ---
  cubes.forEach((c) => {
    const hx = c.sizes.x * 0.5, hy = c.sizes.y * 0.5, hz = c.sizes.z * 0.5;
    const cornersLocal = [
      new Vector3(-hx, -hy, -hz),
      new Vector3(hx, -hy, -hz),
      new Vector3(hx, -hy,  hz),
      new Vector3(-hx, -hy,  hz),
    ];
    const pts = cornersLocal.map((v) => {
      const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
      return worldXZToMini(w.x, w.z, mini);
    });

    mctx.fillStyle = c.state.color || "#5a7dff";
    mctx.strokeStyle = c.id === params.activeId ? "#ffd400" : "#222";
    mctx.lineWidth = c.id === params.activeId ? 3 : 1;

    mctx.beginPath();
    mctx.moveTo(pts[0].x - cx, pts[0].y - cy);
    for (let i = 1; i < pts.length; i++) mctx.lineTo(pts[i].x - cx, pts[i].y - cy);
    mctx.closePath();
    mctx.fill();
    mctx.stroke();
  });

  mctx.restore();
}

export { getMiniTransform, worldXZToMini };
