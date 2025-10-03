// minimap.js (ersetzt deine Datei komplett)
import { SPHERE_RADIUS } from "../constants.js";
import { Vector3 } from "three";

/* ---------- Farben/Style ---------- */
const COLORS = {
  bg: "#0e0e10",
  grid: "rgba(170,190,210,0.28)",
  axes: "rgba(255,226,138,0.65)",
  circleDynamic: "rgba(100,180,255,0.55)",
  circleFixed: "rgba(255,255,255,0.20)",
  centerDot: "rgba(255,255,255,0.90)",
  cubeOutline: "#222",
  cubeOutlineActive: "#ffd400",
};
const LINE = { grid: 1, axes: 2, cDyn: 2, cFix: 1.5 };

/* ---------- DPI / Transform ---------- */
export function resizeMiniToDPR(mini) {
  const dpr = window.devicePixelRatio || 1;
  const rect = mini.getBoundingClientRect();
  mini.style.width = rect.width + "px";
  mini.style.height = rect.height + "px";
  mini.width  = Math.max(1, Math.round(rect.width  * dpr));
  mini.height = Math.max(1, Math.round(rect.height * dpr));
  // Wichtig: Context in CSS-Pixeln betreiben
  const ctx = mini.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* ---------- Koordinaten-Helper (inkl. Pan) ---------- */
export function getMiniTransform(mini, miniPan) {
  const dpr = window.devicePixelRatio || 1;
  const W = mini.width / dpr;
  const H = mini.height / dpr;
  const marginPx = 10;
  const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
  const cx = W * 0.5 + (miniPan?.x ?? 0);
  const cy = H * 0.5 + (miniPan?.y ?? 0);
  return { W, H, cx, cy, pxPerMeter, marginPx };
}

export function worldXZToMiniCSS(x, z, mini, miniPan) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini, miniPan);
  return { x: x * pxPerMeter + cx, y: z * pxPerMeter + cy };
}

export function miniCSSToWorldXZ(mini, px, py, miniPan) {
  const { pxPerMeter, cx, cy } = getMiniTransform(mini, miniPan);
  return { x: (px - cx) / pxPerMeter, z: (py - cy) / pxPerMeter };
}

/* ---------- API ---------- */
export function createMinimap() {
  const mini = document.getElementById("minimap");
  const mctx = mini.getContext("2d");
  return { mini, mctx };
}

/**
 * Unendlich pannbares Grid:
 * - Linien werden viewport-gefüllt gezeichnet.
 * - Startposition nutzt modulo mit Pan-Offset ⇒ kein Drift/Gap.
 */
export function drawMinimapPannable(mini, mctx, gridMesh, gridMat, cubes, params, miniPan) {
  const { W, H, cx, cy, pxPerMeter } = getMiniTransform(mini, miniPan);
  const halfW = W * 0.5, halfH = H * 0.5;

  // Hintergrund reset in CSS-Pixeln
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, mini.width, mini.height);
  mctx.fillStyle = COLORS.bg;
  mctx.fillRect(0, 0, mini.width, mini.height);

  // In CSS-Pixeln weiterzeichnen, Ursprung = (cx, cy)
  mctx.save();
  mctx.translate(cx, cy);

  // Schrittweite in Pixeln (weltmetergenau)
  const spacingMeters = gridMat.uniforms.spacing.value;
  const stepPx = Math.max(1, spacingMeters * pxPerMeter);

  // modulo-Start, damit Linien immer „einrasten“, auch bei Pan
  const startX = -halfW - ((-halfW) % stepPx);
  const endX   =  halfW;
  const startY = -halfH - ((-halfH) % stepPx);
  const endY   =  halfH;

  // Grid
  mctx.strokeStyle = COLORS.grid;
  mctx.lineWidth = LINE.grid;
  for (let x = startX; x <= endX + 0.5; x += stepPx) {
    mctx.beginPath(); mctx.moveTo(x, -halfH); mctx.lineTo(x, halfH); mctx.stroke();
  }
  for (let y = startY; y <= endY + 0.5; y += stepPx) {
    mctx.beginPath(); mctx.moveTo(-halfW, y); mctx.lineTo(halfW, y); mctx.stroke();
  }

  // Achsen (laufen mit Pan mit)
  mctx.strokeStyle = COLORS.axes;
  mctx.lineWidth = LINE.axes;
  mctx.beginPath(); mctx.moveTo(-halfW, 0); mctx.lineTo(halfW, 0); mctx.stroke();
  mctx.beginPath(); mctx.moveTo(0, -halfH); mctx.lineTo(0, halfH); mctx.stroke();

  // Kreise
  const rPxFixed   = SPHERE_RADIUS * pxPerMeter;
  const h          = gridMesh.position.y;
  const rEff       = Math.max(0, Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - h * h, 0)));
  const rPxDynamic = rEff * pxPerMeter;

  mctx.strokeStyle = COLORS.circleFixed;
  mctx.lineWidth = LINE.cFix;
  mctx.beginPath(); mctx.arc(0, 0, rPxFixed, 0, Math.PI * 2); mctx.stroke();

  mctx.strokeStyle = COLORS.circleDynamic;
  mctx.lineWidth = LINE.cDyn;
  mctx.beginPath(); mctx.arc(0, 0, rPxDynamic, 0, Math.PI * 2); mctx.stroke();

  // Mittelpunkt
  mctx.fillStyle = COLORS.centerDot;
  mctx.beginPath(); mctx.arc(0, 0, 3, 0, Math.PI * 2); mctx.fill();

  // Würfel (inkl. Pan)
  cubes.forEach((c) => {
    const hx = c.sizes.x * 0.5, hy = c.sizes.y * 0.5, hz = c.sizes.z * 0.5;
    const cornersLocal = [
      new Vector3(-hx, -hy, -hz),
      new Vector3( hx, -hy, -hz),
      new Vector3( hx, -hy,  hz),
      new Vector3(-hx, -hy,  hz),
    ];
    const ptsAbs = cornersLocal.map((v) => {
      const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
      return worldXZToMiniCSS(w.x, w.z, mini, miniPan);
    });

    // Da wir am Anfang (cx,cy) ins lokale (0,0) verschoben haben:
    const pts = ptsAbs.map(p => ({ x: p.x - cx, y: p.y - cy }));

    mctx.fillStyle = c.state?.color || "#5a7dff";
    mctx.strokeStyle = c.id === params.activeId ? COLORS.cubeOutlineActive : COLORS.cubeOutline;
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
