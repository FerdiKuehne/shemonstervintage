// ~/components/pano3dTool/minimap/roomEditor.js
import { SPHERE_RADIUS } from "../constants.js";
import { Vector3 } from "three";

/** Aus Minimap abgeleitete Basis-Skalierung (Pixel pro Meter) */
function getMiniTransformLike(mini) {
  const W = mini.width, H = mini.height;
  const marginPx = 10;
  const pxPerMeter = (Math.min(W, H) * 0.5 - marginPx) / SPHERE_RADIUS;
  return { pxPerMeter };
}

/** Styles einmalig injizieren */
function ensureEditorStyles() {
  const id = "__room_editor_styles__";
  if (document.getElementById(id)) return;
  const st = document.createElement("style");
  st.id = id;
  st.textContent = `
    .re-overlay { position: fixed; inset: 0; z-index: 10020; background: #0e0e10; outline: none;
                  /* blocke Browser-Gesten im Overlay */
                  touch-action: none; overscroll-behavior: contain; }
    .re-canvas  { position: absolute; inset: 0; width: 100%; height: 100%; display: block; border: none; cursor: default;
                  /* wichtig für Touch/Trackpad: erlaubt eigenes Pinch/Pan Handling */
                  touch-action: none; }
    .re-close   { position: absolute; right: 12px; top: 12px; z-index: 3; width: 36px; height: 36px; border-radius: 10px;
                  border: 1px solid #2a2a2a; background: rgba(18,18,20,.9); color: #e6ebff; display: grid; place-items: center;
                  box-shadow: 0 6px 18px rgba(0,0,0,.35); cursor: pointer; }
    .re-help    { position: absolute; left: 64px; top: 12px; z-index: 2; padding: 6px 10px; border-radius: 10px;
                  border: 1px solid #2a2a2a; background: rgba(18,18,20,.9); color: #e6ebff; font: 600 12px/1.4 system-ui;
                  white-space: nowrap; }

    .re-canvas.space-pan { cursor: grab; }
    .re-canvas.space-pan.dragging { cursor: grabbing; }

    /* ---------- Toolleiste links ---------- */
    .re-tools { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); z-index: 2;
                display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px;
                border: 1px solid #2a2a2a; background: rgba(18,18,20,.9); box-shadow: 0 6px 18px rgba(0,0,0,.35); }
    .re-tool-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #2a2a2a; background: #121216; color: #e6ebff;
                   display: grid; place-items: center; cursor: pointer; transition: transform .12s ease, background .12s ease, border-color .12s ease; }
    .re-tool-btn:hover { transform: translateY(-1px); }
    .re-tool-btn.active { outline: 2px solid #3d6bff; }
    .re-tool-sep { height: 1px; background: #2a2a2a; margin: 4px 0; }

    /* ---------- Zoom-Bottom-Bar (kompakt) ---------- */
    .re-zoom-bottom { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 3;
                      display: grid; grid-auto-flow: column; align-items: center; gap: 8px;
                      padding: 6px 10px; border-radius: 10px; border: 1px solid #2a2a2a; background: rgba(18,18,20,.9);
                      box-shadow: 0 6px 18px rgba(0,0,0,.35); }
    .re-zoom-label { font: 600 10px system-ui; color: #aab1c5; }
    .re-zoom-val   { font: 700 10px system-ui; color: #e6ebff; min-width: 38px; text-align: right; }
    .re-zoom-range { width: 200px; height: 18px; }

    /* Measure Tooltip an der Maus */
    .re-measure { position: absolute; z-index: 3; padding: 2px 6px; border-radius: 6px;
                  background: rgba(0,0,0,0.7); color: #fff; font: 600 12px/1 system-ui;
                  pointer-events: none; transform: translate(10px, -24px); white-space: nowrap; }

    /* Marquee */
    .re-marquee { position: absolute; z-index: 3; pointer-events: none; border: 1px dashed #3d6bff; background: rgba(61,107,255,0.08); }
  `;
  document.head.appendChild(st);
}

/* Helpers */
function formatMeters(m) {
  const cm = Math.round(m * 100);
  const meters = Math.trunc(cm / 100);
  const rest = Math.abs(cm % 100);
  if (meters === 0) return `${rest} cm`;
  return `${meters} m ${rest.toString().padStart(2, "0")} cm`;
}
function snapAngle(dx, dy) {
  const theta = Math.atan2(dy, dx);
  const inc = Math.PI / 4; // 45°
  const snapped = Math.round(theta / inc) * inc;
  const len = Math.hypot(dx, dy);
  return { dx: Math.cos(snapped) * len, dy: Math.sin(snapped) * len };
}

/** Temporär Browser-Page-Zoom deaktivieren (Viewport sperren) */
function lockPageZoom() {
  let meta = document.querySelector('meta[name="viewport"]');
  const created = !meta;
  const prev = meta ? meta.getAttribute("content") : "";
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  // Maximale Kontrolle: keine user-scaling während Overlay
  meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
  return () => {
    if (created) {
      meta.remove();
    } else {
      meta.setAttribute("content", prev || "width=device-width, initial-scale=1");
    }
  };
}

/**
 * Öffnet den Vollbild-Editor.
 */
export function openRoomEditor({ mini, gridMesh, gridMat, cubes, params }) {
  ensureEditorStyles();

  const { pxPerMeter: ppmBase } = getMiniTransformLike(mini); // Basis aus Minimap
  let zoom = 1;                                                // variable Ansichtsskalierung
  const ppm = () => ppmBase * zoom;

  // Overlay + UI
  const overlay = document.createElement("div");
  overlay.className = "re-overlay";
  overlay.tabIndex = 0;

  const unlockViewport = lockPageZoom(); // <— Page-Zoom sperren, später wiederherstellen

  const closeBtn = document.createElement("button");
  closeBtn.className = "re-close";
  closeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  const help = document.createElement("div");
  help.className = "re-help";
  help.textContent = "Tools: Auswahl(V) · Zeichnen(L) · Zoom(Z: Klick=rein, Alt/Option=raus, Pinch/Trackpad) · Space/MiddleMouse=Pan · Shift=45° · Drag ins Leere=Rahmenauswahl · Backspace/Delete=Löschen · ESC=Schließen";

  const canvas = document.createElement("canvas");
  canvas.className = "re-canvas";

  // Linke Toolleiste
  const tools = document.createElement("div");
  tools.className = "re-tools";

  const btnSelect = document.createElement("button");
  btnSelect.className = "re-tool-btn active";
  btnSelect.title = "Auswählen/Anpassen (V)";
  btnSelect.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l7 17 2-7 7-2z" />
    </svg>`;

  const btnDraw = document.createElement("button");
  btnDraw.className = "re-tool-btn";
  btnDraw.title = "Wand zeichnen (L)";
  btnDraw.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 20 L20 4" />
    </svg>`;

  const sep1 = document.createElement("div"); sep1.className = "re-tool-sep";

  const btnUndo = document.createElement("button");
  btnUndo.className = "re-tool-btn";
  btnUndo.title = "Undo (Ctrl/Cmd+Z)";
  btnUndo.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 14 4 9 9 4"></polyline>
      <path d="M20 20a8 8 0 0 0-8-8H4"></path>
    </svg>`;

  const btnClear = document.createElement("button");
  btnClear.className = "re-tool-btn";
  btnClear.title = "Alle Wände löschen";
  btnClear.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 1 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>`;

  tools.append(btnSelect, btnDraw, sep1, btnUndo, btnClear);

  // Bottom-Center Zoom-Bar (kompakt)
  const zoomBar = document.createElement("div");
  zoomBar.className = "re-zoom-bottom";
  const zoomLabel = document.createElement("div");
  zoomLabel.className = "re-zoom-label";
  zoomLabel.textContent = "Zoom";
  const zoomVal = document.createElement("div");
  zoomVal.className = "re-zoom-val";
  zoomVal.textContent = "100%";
  const zoomRange = document.createElement("input");
  zoomRange.className = "re-zoom-range";
  zoomRange.type = "range";
  zoomRange.min = "0.25";
  zoomRange.max = "8";
  zoomRange.step = "0.05";
  zoomRange.value = "1";
  zoomBar.append(zoomLabel, zoomRange, zoomVal);

  // Measure Tooltip + Marquee DOM
  const chip = document.createElement("div");
  chip.className = "re-measure";
  chip.style.display = "none";

  const marquee = document.createElement("div");
  marquee.className = "re-marquee";
  marquee.style.display = "none";

  overlay.append(closeBtn, help, tools, chip, canvas, marquee, zoomBar);
  document.body.appendChild(overlay);
  overlay.focus();

  // Body-Scroll sperren
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // Canvas-Backing in Device-Pixeln
  function fitCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }
  fitCanvas();

  const ctx = canvas.getContext("2d");

  // Welt-zu-Screen: screen = offsetPx + world*(ppmBase*zoom)
  let offsetPx = { x: canvas.width * 0.5, y: canvas.height * 0.5 };

  // Interaktion State
  let isSpaceDown = false;
  let isShiftDown = false;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };     // Backing px
  let offsetStart = { x: 0, y: 0 };   // Backing px
  let activePointerId = null;

  // Tools
  let activeTool = "select"; // 'select' | 'draw' | 'zoom'
function setTool(t) {
  activeTool = t;
  btnSelect.classList.toggle("active", t === "select");
  btnDraw.classList.toggle("active", t === "draw");
}
  btnSelect.addEventListener("click", () => setTool("select"));
  btnDraw.addEventListener("click", () => setTool("draw"));

  // Wände & Auswahl
  const walls = []; // { a:{x,y}, b:{x,y} } (in Weltmetern)
  const drawing = { active: false, a: {x:0,y:0}, b: {x:0,y:0} };
  const selected = new Set(); // Set<number>
  let editMode = "none";      // 'none' | 'handleA' | 'handleB' | 'segment' | 'group' | 'mid' | 'world'
  let worldSelected = false;
  let selectedSingleIndex = -1;
  let editStartWorld = null;

  // Marquee-Selection State (in Screen-Client-PX)
  const marqueeState = { active: false, startX: 0, startY: 0, curX: 0, curY: 0 };

 // Weltgruppen-Offset (in Metern): verschiebt Kreis + Cubes als "Gruppe"
 const worldGroup = { offset: { x: 0, y: 0 } };

function screenToWorld(sx, sy) {
  const p = ppm();
  // reine Weltkoordinaten (Grid-Referenz, unabhängig von Gruppen-Offset)
  return { x: (sx - offsetPx.x) / p, y: (sy - offsetPx.y) / p };
}

function worldToScreen(wx, wy) {
  const p = ppm();
  // Gruppe wird relativ zum Grid verschoben
  return {
    x: offsetPx.x + (wx + worldGroup.offset.x) * p,
    y: offsetPx.y + (wy + worldGroup.offset.y) * p
  };
 }

 function worldToScreenNoWorld(wx, wy) {
  const p = ppm();
  return { x: offsetPx.x + wx * p, y: offsetPx.y + wy * p };
}

  // Hit-Tests
  const HANDLE_R_PX = 6;
  const HIT_TOL_PX = 8;
  const MID_SIZE_PX = 10;

  function hitTestHandle(wx, wy, sx, sy) {
    const p = worldToScreen(wx, wy);
    const dx = sx - p.x;
    const dy = sy - p.y;
    return (dx*dx + dy*dy) <= HANDLE_R_PX*HANDLE_R_PX;
  }
  function hitTestHandleNoWorld(wx, wy, sx, sy) {
    const p = worldToScreenNoWorld(wx, wy);
    const dx = sx - p.x;
    const dy = sy - p.y;
    return (dx*dx + dy*dy) <= HANDLE_R_PX*HANDLE_R_PX;
 }
  function distancePointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const len2 = vx*vx + vy*vy || 1e-9;
    let t = (wx*vx + wy*vy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t*vx, cy = ay + t*vy;
    return Math.hypot(px - cx, py - cy);
  }
  function hitTestMidRect(sa, sb, sx, sy) {
    const mx = (sa.x + sb.x) * 0.5;
    const my = (sa.y + sb.y) * 0.5;
    const half = MID_SIZE_PX * 0.5;
    return (sx >= mx - half && sx <= mx + half && sy >= my - half && sy <= my + half);
  }
  function hitTestWallsSingle(sx, sy) {
    for (let i = walls.length - 1; i >= 0; i--) {
      const w = walls[i];
      const sa = worldToScreenNoWorld(w.a.x, w.a.y);
      const sb = worldToScreenNoWorld(w.b.x, w.b.y);
      if (hitTestHandleNoWorld(w.a.x, w.a.y, sx, sy)) return { type: "handleA", index: i };
      if (hitTestHandleNoWorld(w.b.x, w.b.y, sx, sy)) return { type: "handleB", index: i };
      if (hitTestMidRect(sa, sb, sx, sy))     return { type: "mid",     index: i };
      const d = distancePointToSegment(sx, sy, sa.x, sa.y, sb.x, sb.y);
      if (d <= HIT_TOL_PX) return { type: "segment", index: i };
    }
    return { type: "none", index: -1 };
  }

  function clearSelection() { selected.clear(); selectedSingleIndex = -1; }
  function selectOnly(i) { selected.clear(); if (i>=0) selected.add(i); selectedSingleIndex = i; }
  function selectSet(indices) { selected.clear(); indices.forEach(i => selected.add(i)); selectedSingleIndex = (selected.size===1) ? [...selected][0] : -1; }
  function isSelected(i) { return selected.has(i); }

  function getSelectedScreenBBox() {
    if (selected.size === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(i => {
      const w = walls[i];
      const sa = worldToScreenNoWorld(w.a.x, w.a.y);
      const sb = worldToScreenNoWorld(w.b.x, w.b.y);
      minX = Math.min(minX, sa.x, sb.x);
      minY = Math.min(minY, sa.y, sb.y);
      maxX = Math.max(maxX, sa.x, sb.x);
      maxY = Math.max(maxY, sa.y, sb.y);
    });
    return { minX, minY, maxX, maxY };
  }

  // Zeichnen (… unverändert wie zuvor …) — SNIP —
function draw() {
  fitCanvas();
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(0, 0, W, H);

 // worldToScreen() enthält bereits den worldGroup.offset → hier KEIN zweites Mal addieren


function worldToScreenNoWorld(wx, wy) {
  const p = ppm();
  // ohne worldGroup.offset → Editor-fixe Projektion
  return { x: offsetPx.x + wx * p, y: offsetPx.y + wy * p };
}

 const toScreenWithWorld = (wx, wy) => worldToScreen(wx, wy);

  // --- GRID (meterbasiert, panned via offsetPx und zoom; bleibt stets vollflächig) ---
  const stepMeters = Math.max(0.01, gridMat.uniforms.spacing.value);
  const p = ppm();
  const stepPx = Math.max(1, stepMeters * p);

  ctx.strokeStyle = "#1a1f24";
  ctx.lineWidth = 1;

  const worldMinX = (0 - offsetPx.x) / p;
  const worldMaxX = (W - offsetPx.x) / p;
  const worldMinY = (0 - offsetPx.y) / p;
  const worldMaxY = (H - offsetPx.y) / p;

  const startXi = Math.floor(worldMinX / stepMeters) - 1;
  const endXi   = Math.floor(worldMaxX / stepMeters) + 1;
  const startYi = Math.floor(worldMinY / stepMeters) - 1;
  const endYi   = Math.floor(worldMaxY / stepMeters) + 1;

  // Vertikale Linien
  for (let i = startXi; i <= endXi; i++) {
    const xWorld = i * stepMeters;
    const xScreen = offsetPx.x + xWorld * p;
    ctx.beginPath();
    ctx.moveTo(xScreen, 0);
    ctx.lineTo(xScreen, H);
    ctx.stroke();
  }
  // Horizontale Linien
  for (let j = startYi; j <= endYi; j++) {
    const yWorld = j * stepMeters;
    const yScreen = offsetPx.y + yWorld * p;
    ctx.beginPath();
    ctx.moveTo(0, yScreen);
    ctx.lineTo(W, yScreen);
    ctx.stroke();
  }

  // --- Mittelachsen (dezent) — orientieren sich am Editor-Zentrum (nicht am Welt-Offset) ---
  ctx.strokeStyle = "rgba(255,226,138,0.5)";
  ctx.lineWidth = 1;
  const xAxisY = offsetPx.y;
  ctx.beginPath(); ctx.moveTo(0, xAxisY); ctx.lineTo(W, xAxisY); ctx.stroke();
  const zAxisX = offsetPx.x;
  ctx.beginPath(); ctx.moveTo(zAxisX, 0); ctx.lineTo(zAxisX, H); ctx.stroke();

  // --- Kreise (Sphere-Projektion) am WELT-Zentrum (mit worldGroup.offset) ---
  const h = gridMesh.position.y;
  const rEffMeters = Math.max(0, Math.sqrt(Math.max(SPHERE_RADIUS * SPHERE_RADIUS - h * h, 0)));
  const rEffPx = rEffMeters * p;
  const rMaxPx = SPHERE_RADIUS * p;

  const center = toScreenWithWorld(0, 0); // Weltzentrum inkl. Gruppenoffset

  // Max-Kreis
  ctx.strokeStyle = "#3d6bff";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(center.x, center.y, rMaxPx, 0, Math.PI * 2); ctx.stroke();

  // Eff-Kreis (Schnitt bei Höhe h)
  ctx.strokeStyle = "#4ea1ff";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(center.x, center.y, rEffPx, 0, Math.PI * 2); ctx.stroke();

  // Mittelpunkt
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(center.x, center.y, 3, 0, Math.PI * 2); ctx.fill();

  // --- Welt-Auswahl visualisieren (gestrichelter Kreis + zentraler Quadrat-Anfasser) ---
  if (worldSelected) {
    // gestrichelter Highlight-Kreis
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,212,0,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(center.x, center.y, rMaxPx, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // zentraler "Move"-Anfasser (Quadrat)
    ctx.fillStyle = "rgba(14,14,16,0.9)";
    ctx.strokeStyle = "#ffd400";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(center.x - 6, center.y - 6, 12, 12); ctx.fill(); ctx.stroke();
  }

  // --- Wände (Editor-Ebene; KEIN Welt-Offset) ---
  walls.forEach((w, i) => {
    const sa = worldToScreenNoWorld(w.a.x, w.a.y);
    const sb = worldToScreenNoWorld(w.b.x, w.b.y);

    const sel = isSelected(i);
    ctx.strokeStyle = sel ? "#ffd400" : "#ffffff";
    ctx.lineWidth = 1;
    if (sel) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    if (sel) ctx.setLineDash([]);

    // Handles nur bei Single-Selection
    if (sel && selected.size === 1) {
      // End-Handles
      ctx.fillStyle = "#0e0e10";
      ctx.strokeStyle = "#ffd400";
      ctx.beginPath(); ctx.arc(sa.x, sa.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(sb.x, sb.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Mid-Handle (Rechteck)
      const mx = (sa.x + sb.x) * 0.5, my = (sa.y + sb.y) * 0.5;
      ctx.fillStyle = "rgba(14,14,16,0.9)";
      ctx.strokeStyle = "#ffd400";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(mx - 5, my - 5, 10, 10); ctx.fill(); ctx.stroke();
    }
  });

  // --- Aktives Zeichensegment (Preview; Editor-Ebene) ---
  if (drawing.active) {
    const sa = worldToScreenNoWorld(drawing.a.x, drawing.a.y);
    const sb = worldToScreenNoWorld(drawing.b.x, drawing.b.y);
    ctx.strokeStyle = "#ffd400";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Cubes (liegen in der Welt; übernehmen worldGroup.offset) ---
  cubes.forEach((c) => {
    const hx = c.sizes.x * 0.5, hy = c.sizes.y * 0.5, hz = c.sizes.z * 0.5;
    const cornersLocal = [
      new Vector3(-hx, -hy, -hz),
      new Vector3( hx, -hy, -hz),
      new Vector3( hx, -hy,  hz),
      new Vector3(-hx, -hy,  hz),
    ];
    const pts = cornersLocal.map((v) => {
      const w = v.clone().applyQuaternion(c.mesh.quaternion).add(c.mesh.position);
      return toScreenWithWorld(w.x, w.z);
    });
    ctx.fillStyle = c.state.color || "#5a7dff";
    ctx.strokeStyle = c.id === params.activeId ? "#ffd400" : "#222";
    ctx.lineWidth = c.id === params.activeId ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // --- BBox der Gruppe (optional), wenn mehrere Wände selektiert sind ---
  if (selected.size > 1) {
    const bb = getSelectedScreenBBox();
    if (bb) {
      ctx.strokeStyle = "rgba(61,107,255,0.8)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.strokeRect(bb.minX, bb.minY, bb.maxX - bb.minX, bb.maxY - bb.minY);
      ctx.setLineDash([]);
    }
  }
}


  // Tool Actions
  btnUndo.addEventListener("click", () => {
    if (drawing.active) { drawing.active = false; chip.style.display = "none"; return; }
    if (selected.size > 0) {
      const arr = Array.from(selected).sort((a,b)=>b-a);
      walls.splice(arr[0], 1);
      clearSelection();
      return;
    }
    if (walls.length > 0) walls.pop();
  });
  btnClear.addEventListener("click", () => {
    walls.length = 0; clearSelection(); drawing.active = false; chip.style.display = "none";
  });

  /** --- Zoom Utilities --- */
  function setZoom(newZoom, anchorScreenX, anchorScreenY) {
    newZoom = Math.max(0.25, Math.min(8, newZoom));
    const oldZoom = zoom;
    if (Math.abs(newZoom - oldZoom) < 1e-6) return;

    const pOld = ppmBase * oldZoom;
    const pNew = ppmBase * newZoom;

    if (typeof anchorScreenX === "number" && typeof anchorScreenY === "number") {
      const wx = (anchorScreenX - offsetPx.x) / pOld;
      const wy = (anchorScreenY - offsetPx.y) / pOld;
      offsetPx.x = anchorScreenX - wx * pNew;
      offsetPx.y = anchorScreenY - wy * pNew;
    } else {
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;
      const wx = (cx - offsetPx.x) / pOld;
      const wy = (cy - offsetPx.y) / pOld;
      offsetPx.x = cx - wx * pNew;
      offsetPx.y = cy - wy * pNew;
    }
    zoom = newZoom;
    zoomRange.value = String(zoom);
    zoomVal.textContent = `${Math.round(zoom * 100)}%`;
  }

  // Zoom-Slider
  const onZoomInput = () => setZoom(parseFloat(zoomRange.value));
  zoomRange.addEventListener("input", onZoomInput);

  // Keyboard
  function onKeyDown(e) {
    if (e.code === "Space") {
      e.preventDefault(); if (!isSpaceDown) { isSpaceDown = true; canvas.classList.add("space-pan"); }
    } else if (e.key === "Shift") { isShiftDown = true;
    } else if (e.code === "KeyV") { setTool("select");
    } else if (e.code === "KeyL") { setTool("draw");
    } else if (e.code === "KeyZ") { setTool("zoom");
    } else if (e.code === "Escape") { e.preventDefault(); cleanup();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); btnUndo.click();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (drawing.active) { drawing.active = false; chip.style.display = "none"; }
      else if (selected.size > 0) {
        const arr = Array.from(selected).sort((a,b)=>b-a);
        for (const idx of arr) walls.splice(idx, 1);
        clearSelection();
      }
    }
  }
  function onKeyUp(e) {
    if (e.code === "Space") {
      e.preventDefault(); isSpaceDown = false; canvas.classList.remove("space-pan");
      if (isDragging) { isDragging = false; canvas.classList.remove("dragging"); canvas.releasePointerCapture?.(activePointerId); activePointerId = null; }
    } else if (e.key === "Shift") { isShiftDown = false; }
  }
  const currentToolIsPan = () => isSpaceDown;

  // --- Pinch Handling (Pointer Events) ---
  const touches = new Map(); // pointerId -> {x,y}
  let pinchStartDist = 0, pinchStartZoom = 1;
  let pinchAnchor = { x: 0, y: 0 };
  function updateTouch(e, add=false, remove=false) {
    const rect = canvas.getBoundingClientRect();
    const dpr  = Math.max(1, window.devicePixelRatio || 1);
    const sx   = (e.clientX - rect.left) * dpr;
    const sy   = (e.clientY - rect.top)  * dpr;
    if (add) touches.set(e.pointerId, { x: sx, y: sy });
    else if (remove) touches.delete(e.pointerId);
    else touches.set(e.pointerId, { x: sx, y: sy });
  }
  function calcPinch() {
    if (touches.size < 2) return null;
    const arr = [...touches.values()];
    const a = arr[0], b = arr[1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const mid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    return { dist, mid };
  }

  // --- Safari iOS Fallback (gesture* events) ---
  let gestureStartZoom = 1;
  function onGestureStart(e) {
    // Nur im Overlay: Browser-Pinch unterbinden
    e.preventDefault();
    gestureStartZoom = zoom;
  }
  function onGestureChange(e) {
    e.preventDefault();
    // e.scale ist relativ zum Start (=1.0)
    const rect = canvas.getBoundingClientRect();
    const anchorX = e.clientX ?? (rect.left + rect.width * 0.5);
    const anchorY = e.clientY ?? (rect.top  + rect.height * 0.5);
    setZoom(gestureStartZoom * e.scale, anchorX * (window.devicePixelRatio || 1), anchorY * (window.devicePixelRatio || 1));
  }
  function onGestureEnd(e) { e.preventDefault(); }

  // --- Trackpad-Pinch (Ctrl/⌘ + Wheel) ---
  function onWheel(e) {
    // Viele Browser senden bei Pinch ein Wheel mit ctrlKey==true
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dpr  = Math.max(1, window.devicePixelRatio || 1);
      const sx   = (e.clientX - rect.left) * dpr;
      const sy   = (e.clientY - rect.top)  * dpr;
      const scale = Math.exp(-e.deltaY * 0.0015); // smooth
      setZoom(zoom * scale, sx, sy);
    }
  }

  // Pointer
  let isDraggingMid = false;
  function onPointerDown(e) {
    // register touch for pinch
    if (e.pointerType === "touch") {
      updateTouch(e, true, false);
      const pinch = calcPinch();
      if (pinch && touches.size === 2) {
        e.preventDefault();
        pinchStartDist = pinch.dist;
        pinchStartZoom = zoom;
        pinchAnchor = pinch.mid;
        return; // während Pinch keinen anderen Modus starten
      }
    }

    const rect = canvas.getBoundingClientRect();
    const dpr  = Math.max(1, window.devicePixelRatio || 1);
    const sx   = (e.clientX - rect.left) * dpr;
    const sy   = (e.clientY - rect.top)  * dpr;

    // ZOOM-Tool: Klick zoomt um Cursor (Alt/Option = raus)
    if (activeTool === "zoom" && e.button === 0) {
      e.preventDefault();
      const step = 1.25;
      const out = e.altKey;
      const newZ = out ? (zoom / step) : (zoom * step);
      setZoom(newZ, sx, sy);
      return;
    }

    // PAN via Space oder MiddleMouse
    if (currentToolIsPan() || e.button === 1) {
      e.preventDefault();
      activePointerId = e.pointerId;
      canvas.setPointerCapture?.(activePointerId);
      isDragging = true;
      canvas.classList.add("dragging");
      dragStart.x = sx; dragStart.y = sy;
      offsetStart.x = offsetPx.x; offsetStart.y = offsetPx.y;
      return;
    }

    // DRAW → vorhandene Linie anklicken erlaubt Umschalten zu Select & Edit
    if (activeTool === "draw" && !drawing.active && e.button === 0) {
      const hit = hitTestWallsSingle(sx, sy);
      if (hit.index >= 0) {
        e.preventDefault();
        setTool("select");
        applySelectHit(hit, e, sx, sy);
        return;
      }
    }

    // DRAW Start
    if (activeTool === "draw" && e.button === 0) {
      e.preventDefault();
      const world = screenToWorld(sx, sy);
      if (!drawing.active) {
        drawing.active = true;
        drawing.a = { ...world };
        drawing.b = { ...world };
        chip.style.display = "block";
        chip.textContent = "0 cm";
        chip.style.left = `${e.clientX}px`;
        chip.style.top  = `${e.clientY}px`;
      }
      return;
    }

    // SELECT
    if (activeTool === "select" && e.button === 0) {
      e.preventDefault();
      const hit = hitTestWallsSingle(sx, sy);
      applySelectHit(hit, e, sx, sy);
      return;
    }
  }

function applySelectHit(hit, e, sx, sy) {
  if (hit.index >= 0) {
    // --- Klick auf eine Wand (Handle/Segment/Mid) ---
    if (!isSelected(hit.index)) selectOnly(hit.index);

    selectedSingleIndex = (selected.size === 1) ? hit.index : -1;

    // Multi-Selection → nur Gruppentranslation, keine Einzel-Handles
    if (selected.size > 1) {
      if (hit.type === "segment" || hit.type === "mid") {
        editMode = "group";
        activePointerId = e.pointerId;
        canvas.setPointerCapture?.(activePointerId);
        isDragging = true;
        editStartWorld = screenToWorld(sx, sy);
      } else {
        editMode = "none";
      }
      return;
    }

    // Single-Selection → Handle/Segment/Mid direkt editieren
    editMode = hit.type; // 'handleA' | 'handleB' | 'segment' | 'mid'
    activePointerId = e.pointerId;
    canvas.setPointerCapture?.(activePointerId);
    isDragging = true;
    if (editMode === "segment" || editMode === "mid") {
      editStartWorld = screenToWorld(sx, sy);
    }
    return;
  } else {
    // --- Kreis/Gruppe hit-testen: Klick innerhalb Max-Kreis? ---
    const p = ppm();
    const centerScr = worldToScreen(0, 0); // Weltzentrum inkl. Gruppenoffset
    const dx = sx - centerScr.x;
    const dy = sy - centerScr.y;
    const dist = Math.hypot(dx, dy);
    const rMaxPx = SPHERE_RADIUS * p;
    // kleine Toleranz, damit man den Kreis gut trifft
    const hitWorld = dist <= (rMaxPx + 10);

    if (hitWorld) {
      // Weltgruppe auswählen: Anfasser in der Mitte, Drag verschiebt Gruppen-Offset
      worldSelected = true;
      clearSelection();
      editMode = "world";
      activePointerId = e.pointerId;
      canvas.setPointerCapture?.(activePointerId);
      isDragging = true;
      editStartWorld = screenToWorld(sx, sy);
      return;
    }

    // --- Kein Hit → Marquee-Selection starten ---
    marqueeState.active = true;
    marqueeState.startX = e.clientX;
    marqueeState.startY = e.clientY;
    marqueeState.curX   = e.clientX;
    marqueeState.curY   = e.clientY;
    marquee.style.display = "block";
    marquee.style.left   = `${marqueeState.startX}px`;
    marquee.style.top    = `${marqueeState.startY}px`;
    marquee.style.width  = `0px`;
    marquee.style.height = `0px`;

    activePointerId = e.pointerId;
    canvas.setPointerCapture?.(activePointerId);
    return;
  }
}


function onPointerMove(e) {
  // --- Pinch tracking (Pointer Events) ---
  if (e.pointerType === "touch" && touches.has(e.pointerId)) {
    updateTouch(e);
    const pinch = calcPinch();
    if (pinch && touches.size === 2) {
      e.preventDefault();
      const scale = pinch.dist / (pinchStartDist || 1);
      const newZ = Math.max(0.25, Math.min(8, pinchStartZoom * scale));
      setZoom(newZ, pinch.mid.x, pinch.mid.y);
      return;
    }
  }

  const rect = canvas.getBoundingClientRect();
  const dpr  = Math.max(1, window.devicePixelRatio || 1);
  const sx   = (e.clientX - rect.left) * dpr;
  const sy   = (e.clientY - rect.top)  * dpr;

  // --- WORLD edit: gesamte Gruppe (Kreise + Cubes) verschieben ---
  if (isDragging && activeTool === "select" && worldSelected && editMode === "world") {
    e.preventDefault();
    const curWorld = screenToWorld(sx, sy);
    const dxm = curWorld.x - editStartWorld.x;
    const dym = curWorld.y - editStartWorld.y;
    worldGroup.offset.x += dxm;
    worldGroup.offset.y += dym;
    editStartWorld = curWorld;
    return;
  }

  // --- PAN (Space down oder Middle Mouse) ---
  if (isDragging && (currentToolIsPan() || e.button === 1)) {
    e.preventDefault();
    const dx = sx - dragStart.x;
    const dy = sy - dragStart.y;
    offsetPx.x = offsetStart.x + dx;
    offsetPx.y = offsetStart.y + dy;
    return;
  }

  // --- DRAW (Preview während des Zeichnens) ---
  if (drawing.active) {
    const world = screenToWorld(sx, sy);
    let dxm = world.x - drawing.a.x;
    let dym = world.y - drawing.a.y;
    if (isShiftDown) {
      const snapped = snapAngle(dxm, dym);
      dxm = snapped.dx; dym = snapped.dy;
    }
    drawing.b.x = drawing.a.x + dxm;
    drawing.b.y = drawing.a.y + dym;

    const dist = Math.hypot(dxm, dym);
    chip.textContent = formatMeters(dist);
    chip.style.left = `${e.clientX}px`;
    chip.style.top  = `${e.clientY}px`;
    return;
  }

  // --- SELECT – Marquee aktiv? ---
  if (marqueeState.active) {
    marqueeState.curX = e.clientX;
    marqueeState.curY = e.clientY;

    const x = Math.min(marqueeState.startX, marqueeState.curX);
    const y = Math.min(marqueeState.startY, marqueeState.curY);
    const w = Math.abs(marqueeState.curX - marqueeState.startX);
    const h = Math.abs(marqueeState.curY - marqueeState.startY);
    marquee.style.left = `${x}px`;
    marquee.style.top  = `${y}px`;
    marquee.style.width = `${w}px`;
    marquee.style.height = `${h}px`;
    return;
  }

  // --- SELECT – Edit (Single) ---
  if (isDragging && activeTool === "select" && selected.size === 1 && selectedSingleIndex >= 0) {
    e.preventDefault();
    const w = walls[selectedSingleIndex];

    if (editMode === "handleA" || editMode === "handleB") {
      const world = screenToWorld(sx, sy);
      if (editMode === "handleA") {
        let nx = world.x, ny = world.y;
        if (isShiftDown) {
          const snapped = snapAngle(w.b.x - nx, w.b.y - ny);
          nx = w.b.x - snapped.dx; ny = w.b.y - snapped.dy;
        }
        w.a.x = nx; w.a.y = ny;
      } else {
        let nx = world.x, ny = world.y;
        if (isShiftDown) {
          const snapped = snapAngle(nx - w.a.x, ny - w.a.y);
          nx = w.a.x + snapped.dx; ny = w.a.y + snapped.dy;
        }
        w.b.x = nx; w.b.y = ny;
      }
      const dist = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
      chip.style.display = "block";
      chip.textContent = formatMeters(dist);
      chip.style.left = `${e.clientX}px`;
      chip.style.top  = `${e.clientY}px`;
      return;
    }

    if (editMode === "segment" || editMode === "mid") {
      const curWorld = screenToWorld(sx, sy);
      const dxm = curWorld.x - editStartWorld.x;
      const dym = curWorld.y - editStartWorld.y;
      w.a.x += dxm; w.a.y += dym;
      w.b.x += dxm; w.b.y += dym;
      editStartWorld = curWorld;
      return;
    }
  }

  // --- SELECT – Edit (Group) ---
  if (isDragging && activeTool === "select" && selected.size > 1 && editMode === "group") {
    e.preventDefault();
    const curWorld = screenToWorld(sx, sy);
    const dxm = curWorld.x - editStartWorld.x;
    const dym = curWorld.y - editStartWorld.y;
    selected.forEach(i => {
      const w = walls[i];
      w.a.x += dxm; w.a.y += dym;
      w.b.x += dxm; w.b.y += dym;
    });
    editStartWorld = curWorld;
    return;
  }
}


  function onPointerUp(e) {
    if (e.pointerType === "touch") updateTouch(e, false, true);

    // PAN Ende
    if (isDragging && (currentToolIsPan() || e.button === 1)) {
      isDragging = false;
      canvas.classList.remove("dragging");
      if (activePointerId != null) { canvas.releasePointerCapture?.(activePointerId); activePointerId = null; }
      return;
    }

    // DRAW finalisieren
    if (drawing.active && e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const dpr  = Math.max(1, window.devicePixelRatio || 1);
      const sx   = (e.clientX - rect.left) * dpr;
      const sy   = (e.clientY - rect.top)  * dpr;

      const world = screenToWorld(sx, sy);
      let dxm = world.x - drawing.a.x;
      let dym = world.y - drawing.a.y;
      if (isShiftDown) {
        const snapped = snapAngle(dxm, dym);
        dxm = snapped.dx; dym = snapped.dy;
      }
      drawing.b.x = drawing.a.x + dxm;
      drawing.b.y = drawing.a.y + dym;

      if (Math.hypot(dxm, dym) > 1e-6) {
        walls.push({ a: { ...drawing.a }, b: { ...drawing.b } });
        clearSelection();
        selectOnly(walls.length - 1);
      }
      drawing.active = false;
      chip.style.display = "none";
      return;
    }

    // SELECT – Marquee abschließen
    if (marqueeState.active) {
      marqueeState.active = false;
      marquee.style.display = "none";

      const rectDom = canvas.getBoundingClientRect();
      const dpr  = Math.max(1, window.devicePixelRatio || 1);
      const x1c = Math.min(marqueeState.startX, marqueeState.curX);
      const y1c = Math.min(marqueeState.startY, marqueeState.curY);
      const x2c = Math.max(marqueeState.startX, marqueeState.curX);
      const y2c = Math.max(marqueeState.startY, marqueeState.curY);

      const x1 = (x1c - rectDom.left) * dpr;
      const y1 = (y1c - rectDom.top ) * dpr;
      const x2 = (x2c - rectDom.left) * dpr;
      const y2 = (y2c - rectDom.top ) * dpr;

      const inside = (sx, sy) => (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2);

      const picked = [];
      walls.forEach((w, i) => {
        const sa = worldToScreenNoWorld(w.a.x, w.a.y);
        const sb = worldToScreenNoWorld(w.b.x, w.b.y);
        if (inside(sa.x, sa.y) && inside(sb.x, sb.y)) picked.push(i);
      });

      if (picked.length) selectSet(picked); else clearSelection();

      if (activePointerId != null) { canvas.releasePointerCapture?.(activePointerId); activePointerId = null; }
      return;
    }

    // SELECT – Edit beenden
    if (isDragging && activeTool === "select") {
      isDragging = false;
      canvas.classList.remove("dragging");
      if (activePointerId != null) { canvas.releasePointerCapture?.(activePointerId); activePointerId = null; }
      chip.style.display = "none";
      editMode = "none";
      return;
    }
  }

  function onResize() { fitCanvas(); }
  function cleanup() {
    // Events abmelden
    overlay.removeEventListener("keydown", onKeyDown);
    overlay.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("wheel", onWheel);
    // Safari gesture*
    overlay.removeEventListener("gesturestart", onGestureStart);
    overlay.removeEventListener("gesturechange", onGestureChange);
    overlay.removeEventListener("gestureend", onGestureEnd);
    zoomRange.removeEventListener("input", onZoomInput);

    cancelAnimationFrame(rafId);
    document.body.style.overflow = prevOverflow;
    unlockViewport(); // <— Viewport zurücksetzen
    overlay.remove();
  }

  // Event-Bindings
  closeBtn.addEventListener("click", cleanup);
  overlay.addEventListener("keydown", onKeyDown);
  overlay.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

  // Pointer/Touch
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp, { passive: true });

  // Trackpad-Pinch (Ctrl/⌘ + Wheel)
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // Safari iOS Pinch (gesture*), nur im Overlay
  overlay.addEventListener("gesturestart", onGestureStart, { passive: false });
  overlay.addEventListener("gesturechange", onGestureChange, { passive: false });
  overlay.addEventListener("gestureend", onGestureEnd, { passive: false });

  // Renderloop
  let rafId = 0;
  (function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  })();
}
