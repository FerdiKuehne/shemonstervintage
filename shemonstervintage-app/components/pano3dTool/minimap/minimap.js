// minimap.js
import { SPHERE_RADIUS } from "../constants.js";
import { Vector3 } from "three";

/* ---------- Look & Feel ---------- */
const COLORS = {
  bg: "#0e0e10",
  grid: "rgba(170, 190, 210, 0.32)",       // etwas heller/dezenter
  axes: "rgba(255, 226, 138, 0.55)",       // dezente Achsen
  circleDynamic: "rgba(100, 180, 255, 0.45)", // skaliert mit h
  circleFixed: "rgba(255, 255, 255, 0.18)",   // fixer Referenz-Kreis
  centerDot: "rgba(255,255,255,0.85)",
  cubeOutline: "#222",
  cubeOutlineActive: "#ffd400",
};

const LINE_WIDTHS = {
  grid: 1,
  axes: 2,
  circleDynamic: 2,
  circleFixed: 1.5,
};

/* ---------- Helpers ---------- */
function getMiniTransform(mini) {
  const W = mini.width;
  const H = mini.height;
  const marginPx = 10;
  const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
  const cx = W * 0.5;
  const cy = H * 0.5;
  return { W, H, cx, cy, pxPerMeter, marginPx };
}

function worldXZToMini(x, z, mini) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini);
  return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
}

/* ---------- API ---------- */
export function createMinimap() {
  const mini = document.getElementById("minimap");
  const mctx = mini.getContext("2d");
  return { mini, mctx };
}

export function drawMinimap(mini, mctx, gridMesh, gridMat, cubes, params) {
  const { W, H, cx, cy, pxPerMeter } = getMiniTransform(mini);

  // Hintergrund
  mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = COLORS.bg;
  mctx.fillRect(0, 0, W, H);

  mctx.save();
  mctx.translate(cx, cy);

  // Maximaler Pixel-Radius bei h = 0 (breiteste Stelle der Sphere)
  const rPxMax = SPHERE_RADIUS * pxPerMeter;

  // Dynamischer Schnittkreis (skaliert mit h)
  const h = gridMesh.position.y;
  const rEff = Math.max(0, Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - h * h, 0)));
  const rPxDynamic = rEff * pxPerMeter;

  // Fester Referenz-Kreis (NICHT skaliert)
  const rPxFixed = rPxMax;

  // ---- Grid (FIX: orientiert sich am festen Radius, NICHT an rPxDynamic) ----
  // Schrittweite bleibt in Weltmetern konstant -> in Pixeln via pxPerMeter
  const stepPx = Math.max(1, gridMat.uniforms.spacing.value * pxPerMeter);
  const count = Math.floor(rPxFixed / stepPx);

  mctx.strokeStyle = COLORS.grid;
  mctx.lineWidth = LINE_WIDTHS.grid;
  for (let i = -count; i <= count; i++) {
    const x = i * stepPx;
    mctx.beginPath();
    mctx.moveTo(x, -rPxFixed);
    mctx.lineTo(x, rPxFixed);
    mctx.stroke();

    const z = i * stepPx;
    mctx.beginPath();
    mctx.moveTo(-rPxFixed, z);
    mctx.lineTo(rPxFixed, z);
    mctx.stroke();
  }

  // ---- Achsen (ebenfalls fix bis zum festen Radius) ----
  mctx.strokeStyle = COLORS.axes;
  mctx.lineWidth = LINE_WIDTHS.axes;
  mctx.beginPath(); mctx.moveTo(-rPxFixed, 0); mctx.lineTo(rPxFixed, 0); mctx.stroke();
  mctx.beginPath(); mctx.moveTo(0, -rPxFixed); mctx.lineTo(0, rPxFixed); mctx.stroke();

  // ---- Fixer Kreis (bleibt gleich groß; bei Start == dynamischer Kreis) ----
  mctx.strokeStyle = COLORS.circleFixed;
  mctx.lineWidth = LINE_WIDTHS.circleFixed;
  mctx.beginPath();
  mctx.arc(0, 0, rPxFixed, 0, Math.PI * 2);
  mctx.stroke();

  // ---- Dynamischer Kreis (Schnitt mit Kugel, skaliert mit h) ----
  mctx.strokeStyle = COLORS.circleDynamic;
  mctx.lineWidth = LINE_WIDTHS.circleDynamic;
  mctx.beginPath();
  mctx.arc(0, 0, rPxDynamic, 0, Math.PI * 2);
  mctx.stroke();

  // Mittelpunkt
  mctx.fillStyle = COLORS.centerDot;
  mctx.beginPath();
  mctx.arc(0, 0, 3, 0, Math.PI * 2);
  mctx.fill();

  // ---- Würfel (ohne zusätzliche Skalierung) ----
  cubes.forEach((c) => {
    const hx = c.sizes.x * 0.5;
    const hy = c.sizes.y * 0.5;
    const hz = c.sizes.z * 0.5;

    const cornersLocal = [
      new Vector3(-hx, -hy, -hz),
      new Vector3( hx, -hy, -hz),
      new Vector3( hx, -hy,  hz),
      new Vector3(-hx, -hy,  hz),
    ];

    const pts = cornersLocal.map((v) => {
      const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
      return worldXZToMini(w.x, w.z, mini);
    });

    mctx.fillStyle = c.state?.color || "#5a7dff";
    mctx.strokeStyle = c.id === params.activeId ? COLORS.cubeOutlineActive : COLORS.cubeOutline;
    mctx.lineWidth = c.id === params.activeId ? 3 : 1;

    mctx.beginPath();
    mctx.moveTo(pts[0].x - cx, pts[0].y - cy);
    for (let i = 1; i < pts.length; i++) {
      mctx.lineTo(pts[i].x - cx, pts[i].y - cy);
    }
    mctx.closePath();
    mctx.fill();
    mctx.stroke();
  });

  mctx.restore();
}

