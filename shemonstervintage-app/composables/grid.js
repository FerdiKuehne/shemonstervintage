// grid.js
import {
  Group,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  LinearFilter,
  NearestFilter,
  Mesh,
  Box3,
  Vector3,
  MeshBasicMaterial,
  Vector2,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  LineLoop,
  Shape,
  ShapeGeometry,
  Raycaster,
  ShaderMaterial,
  NoToneMapping,
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
import { urls, imagesDescription } from "./refsHelper.js";

gsap.registerPlugin(ScrollTrigger);

/* =========================
   Zentrale Animationssteuerung
   ========================= */
const ANIM = {
  open:   { dur: 0.48, ease: "power2.out" },   // Grid -> Detail
  close:  { dur: 0.40, ease: "power2.inOut" }, // Detail -> Grid
  speed:  1.15,                                // globales timeScale
  pause:  0.06,                                // kurze Pause zw. Bild-Return & Grid-Return
  hinge:  { angle: 0.6, depth: 3.0 },
  object: { depth: 2.2, overscan: 1.01 },
  crop:   { targetHalfNDC: 0.5, offNDC: 2.0 }, // offNDC > 1.0 => Maske "aus"
};

const makeTL = (phase = "open") =>
  gsap.timeline({ defaults: { duration: ANIM[phase].dur, ease: ANIM[phase].ease } })
      .timeScale(ANIM.speed);

const tween = (target, props, phase = "open") =>
  gsap.to(target, { duration: ANIM[phase].dur, ease: ANIM[phase].ease, ...props });

const delayed = (sec, fn) => gsap.delayedCall(sec, fn);

/* =========================
   Farbraum/Look Steuerung (runtime tweakbar)
   ========================= */
// Modus-Erklärung:
// - "srgb":    sRGB -> Linear -> Exposure -> sRGB (präzise IEC-Kurven)
// - "passthrough": keinerlei sRGB-Konvertierung, nur Exposure/Gamma direkt auf Textur
// - "gamma22": pow(2.2)-Näherung statt IEC (manchmal näher am „Bild-Tag“-Look je nach Pipeline)
const COLOR = {
  mode: "passthrough", // "srgb" | "passthrough" | "gamma22"
  exposure: 1.04,      // 1.00..1.08 (kleine Schritte)
  gamma: 2.00,         // 1.00..0.95 (feiner Ausgleich)
};

/* =========================
   UI/Icons/Geometrie Config
   ========================= */
const OUTLINE_THICKNESS_PX = 0.5;
const PLUS_THICKNESS_PX = 1.0;

const ICON_SCALE = 0.003;
const SVG_UNITS_PER_PX = 2;
const VIEWBOX_SIZE = 64;

const ICON_MARGIN_X_WU = 0.265;
const ICON_MARGIN_Y_WU = 0.095;

/* Grid settings */
let gridSize, currendGrid;
let resizeTimeout;
let loadingMore = false;
let scrollTrigger;
let gridWorldHeight = 0;
let gridPosYOffset = 0.1;

const gapX = 2.05;
const gapY = 2.2;
const targetHeight = 4.5 * 0.46;
const targetWidth = 4 * 0.46;

const grid = new Group();
const geometry = new PlaneGeometry(targetWidth, targetHeight);
grid.frustumCulled = false;

let images = [];
let batch = 1;
let clickableBtn = [];
let frustumHeight, frustumWidth;

let bookmarkIconPrefab = null;

// Hinge-Gruppen
let hingeLeft = null;
let hingeRight = null;

/* =========================
   Crop-Shader (Maske klebt am Bild) + flexible Farbraum-Modi
   ========================= */
const cropVertex = /* glsl */ `
  varying float vNdcX;
  varying vec2  vUv;
  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vNdcX = clip.x / clip.w; // NDC X [-1..+1]
    gl_Position = clip;
  }
`;

// Keine Three.js-Includes → kompatibel mit AR.js/versch. Three-Builds
// Drei Color-Modi + Exposure/Gamma als Uniforms
const cropFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  uniform float uCenterNDC;
  uniform float uHalfWidthNDC;   // >1.0 => "Maske aus"
  uniform float uGlobalAlpha;    // Global-Alpha fürs Fading

  uniform int   uColorMode;      // 0=srgb, 1=passthrough, 2=gamma22
  uniform float uExposure;       // Gain in linearem bzw. Texturraum (je nach Modus)
  uniform float uGamma;          // Post-Gamma auf dem Ausgabewert

  varying float vNdcX;
  varying vec2  vUv;

  // sRGB <-> Linear (IEC 61966-2-1)
  vec3 sRGBToLinear(vec3 c){
    bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
    vec3 low  = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(high, low, vec3(cutoff));
  }
  vec3 LinearToSRGB(vec3 c){
    bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
    vec3 low  = c * 12.92;
    vec3 high = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
    return mix(high, low, vec3(cutoff));
  }

  void main(){
    if (abs(vNdcX - uCenterNDC) > uHalfWidthNDC) discard;

    vec4 tex = texture2D(map, vUv);
    float a = tex.a * uGlobalAlpha;

    vec3 outColor;

    if (uColorMode == 0) {
      // sRGB -> Linear -> Exposure -> sRGB
      vec3 lin = sRGBToLinear(tex.rgb);
      lin *= uExposure;
      outColor = LinearToSRGB(lin);
      outColor = pow(outColor, vec3(1.0 / uGamma));
    } else if (uColorMode == 1) {
      // passthrough: keine sRGB-Konvertierung
      outColor = pow(tex.rgb * uExposure, vec3(1.0 / uGamma));
    } else {
      // gamma22 Approx
      vec3 lin = pow(tex.rgb, vec3(2.2));
      lin *= uExposure;
      outColor = pow(lin, vec3(1.0/2.2));
      outColor = pow(outColor, vec3(1.0 / uGamma));
    }

    gl_FragColor = vec4(outColor, a);
  }
`;

function makeAnimatedCropMaterial(texture) {
  const mat = new ShaderMaterial({
    uniforms: {
      map:            { value: texture },
      uCenterNDC:     { value: 0.0 },              // pro Frame gesetzt
      uHalfWidthNDC:  { value: ANIM.crop.offNDC }, // Grid: Maske aus
      uGlobalAlpha:   { value: 1.0 },              // Grid-Fade
      uColorMode:     { value: COLOR.mode === "srgb" ? 0 : (COLOR.mode === "passthrough" ? 1 : 2) },
      uExposure:      { value: COLOR.exposure },
      uGamma:         { value: COLOR.gamma },
    },
    vertexShader: cropVertex,
    fragmentShader: cropFragment,
    transparent: true,   // stabil transparent
    depthWrite: true,    // stabil, kein Flip
  });
  // Wir managen Farbraum im Shader → kein ToneMapping durch Three
  mat.toneMapped = false;
  return mat;
}

/* helper: polyline -> LineLoop (XY-Punkte in Screen-like SVG-Einheiten) */
function makeLineLoopFromXY(pointsXY, material, dx = 0, dy = 0) {
  const geom = new BufferGeometry();
  const count = pointsXY.length / 2;
  const arr = new Float32BufferAttribute(count * 3, 3);
  for (let i = 0; i < pointsXY.length; i += 2) {
    const x = pointsXY[i] + dx;
    const y = pointsXY[i + 1] + dy;
    arr.setXYZ(i / 2, x, y, 0);
  }
  geom.setAttribute("position", arr);
  return new LineLoop(geom, material);
}

// Hilfsobjekte (weniger GC/Allokationen)
const _tmpV = new Vector3();
const _box3 = new Box3();
const _tmpV3a = new Vector3();
const _tmpV3b = new Vector3();

const LOCAL_CORNERS = [
  new Vector3(-targetWidth / 2,  targetHeight / 2, 0), // TL
  new Vector3( targetWidth / 2,  targetHeight / 2, 0), // TR
  new Vector3(-targetWidth / 2, -targetHeight / 2, 0), // BL
  new Vector3( targetWidth / 2, -targetHeight / 2, 0), // BR
];

// NDC.x eines Weltpunkts
function worldToNdcX(world, camera) {
  _tmpV.copy(world).project(camera);
  return _tmpV.x; // -1..+1
}

function captureMeshScreenNdc(mesh, camera) {
  let minX = +Infinity, maxX = -Infinity;
  for (let i = 0; i < LOCAL_CORNERS.length; i++) {
    const ndc = worldToNdcX(mesh.localToWorld(LOCAL_CORNERS[i].clone()), camera);
    if (ndc < minX) minX = ndc;
    if (ndc > maxX) maxX = ndc;
  }
  const halfNow = (maxX - minX) * 0.5;
  const centerNow = worldToNdcX(mesh.localToWorld(_tmpV3a.set(0,0,0)), camera);
  return { halfNdc: halfNow, centerNdc: centerNow };
}

/** Crop-Anim State */
let activeCrop = {
  mesh: null,            // aktuelles Bild
  cropMaterial: null,    // dessen ShaderMaterial
  halfStart: 0,          // Start-Halbbreite (Grid)
  isActive: false,       // ob wir gerade animieren
};

/** Crop-Uniforms dynamisch aktualisieren (Mitte folgt Bild, Breite tweened) */
function updateCropUniformDynamic(mesh, camera, progress) {
  if (!mesh || !activeCrop.cropMaterial) return;
  const L = (a, b, t) => a + (b - a) * t;

  const { centerNdc: imgCenter } = captureMeshScreenNdc(mesh, camera);
  const half = L(activeCrop.halfStart, ANIM.crop.targetHalfNDC, progress);

  const u = activeCrop.cropMaterial.uniforms;
  u.uCenterNDC.value    = imgCenter;
  u.uHalfWidthNDC.value = half;
  u.uCenterNDC.needsUpdate = true;
  u.uHalfWidthNDC.needsUpdate = true;
}

/* =========================
   Fade-Helper (fürs Grid)
   ========================= */
function collectGridFadeMaterials(root, excludeNodes = []) {
  const excludeSet = new Set();
  excludeNodes.forEach((n) => n.traverse((o) => excludeSet.add(o)));

  const mats = new Set();
  root.traverse((o) => {
    if (excludeSet.has(o)) return;
    if (o.userData?.isIcon) return;
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => mats.add(m));
      else mats.add(o.material);
    }
  });
  return Array.from(mats);
}
function collectIconNodes(root, excludeNodes = []) {
  const excludeSet = new Set();
  excludeNodes.forEach((n) => n.traverse((o) => excludeSet.add(o)));
  const nodes = [];
  root.traverse((o) => {
    if (!excludeSet.has(o) && o.userData?.isIcon) nodes.push(o);
  });
  return nodes;
}
const originalState = new WeakMap();
function prepareForFade(materials) {
  materials.forEach((m) => {
    if (!originalState.has(m)) {
      originalState.set(m, {
        transparent: !!m.transparent,
        depthWrite: m.depthWrite !== undefined ? m.depthWrite : true,
        depthTest: m.depthTest !== undefined ? m.depthTest : true,
        opacity: m.opacity !== undefined ? m.opacity : 1,
      });
    }
    if (!m.transparent) {
      m.transparent = true;
      m.needsUpdate = true;
    }
    m.depthWrite = false;
    m.depthTest  = false;
  });
}
function restoreAfterFade(materials) {
  materials.forEach((m) => {
    const st = originalState.get(m);
    if (st) {
      m.transparent = st.transparent;
      m.depthWrite  = st.depthWrite;
      m.depthTest   = st.depthTest;
      m.opacity     = st.opacity;
      m.needsUpdate = true;
      originalState.delete(m);
    } else {
      m.opacity     = 1;
      m.needsUpdate = true;
    }
  });
}

// Fadetargets: unterstützt Shader (uGlobalAlpha.value) und BasicMaterials (opacity)
function makeFadeTargets(materials) {
  const targets = [];
  for (const m of materials) {
    if (m instanceof ShaderMaterial && m.uniforms?.uGlobalAlpha) {
      targets.push(m.uniforms.uGlobalAlpha); // { value: number }
    } else if ("opacity" in m) {
      targets.push(m); // MeshBasicMaterial etc.
    }
  }
  return targets;
}

/* =========================
   Data / Grid / Scroll
   ========================= */
const loadFront = async (dpr) => {
  const url = `http://localhost:8000/stokes/gallery?type=front&batch=${batch}&dpr=${dpr}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const urls = Object.values(data.data.front);
    if (data.success) {
      batch++;
      return urls;
    } else console.error("API error:", data.message);
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
};

function getGridSize() {
  const rows = Math.ceil(grid.children.length / gridSize);
  const width = gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  const height =
    rows * targetHeight + (rows - 1) * (gapY - targetHeight) + gridPosYOffset;
  return { width, height };
}
function getObjectSize(obj) {
  _box3.setFromObject(obj);
  const size = _box3.getSize(_tmpV3a);
  return { width: size.x, height: size.y };
}
function updateGridPosition(nextGridSize) {
  if (currendGrid !== nextGridSize) {
    grid.children.forEach((obj, index) =>
      setGridPosition(index, nextGridSize, obj)
    );
    const { width } = getGridSize();
    const { width: objectWidth } = getObjectSize(grid.children[0]);
    grid.position.x = -width / 2 + objectWidth / 2;
    currendGrid = nextGridSize;
  }
}
function getCureentGridSize() {
  if (window.innerWidth > 1200) gridSize = 4;
  else if (window.innerWidth > 768) gridSize = 3;
  else gridSize = 2;
}
function setGridPosition(index, columns, object) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * gapX;
  object.position.y = -(row * gapY);
}

async function loadGridImages(dpr, gridGroup, imgs, renderer) {
  imgs = await loadFront(dpr);
  const iconPrefab = buildBookmarkIcon(); // einmal beziehen, dann klonen
  const promises = imgs.map(
    (url, index) =>
      new Promise((resolve, reject) => {
        const indexDelta = index + gridGroup.children.length;
        const loader = new TextureLoader();
        loader.load(
          "http://localhost:8000" + url,
          (texture) => {
            texture.colorSpace = SRGBColorSpace;
            texture.minFilter = LinearFilter;
            texture.magFilter = NearestFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.needsUpdate = true;

            const cropMat = makeAnimatedCropMaterial(texture);
            const mesh = new Mesh(geometry, cropMat);
            mesh.frustumCulled = false;

            // Icon (klonen statt neu bauen)
            const iconGroup = iconPrefab.clone(true);
            iconGroup.position.x = targetWidth / 2 - ICON_MARGIN_X_WU;
            iconGroup.position.y = targetHeight / 2 - ICON_MARGIN_Y_WU;
            mesh.add(iconGroup);

            mesh.userData.url = "http://localhost:8000" + url;
            mesh.userData.text = "Lorem ipsum ...";
            mesh.userData.type = "image";

            const hit = iconGroup.getObjectByName("bookmark-hit");
            clickableBtn.push(iconGroup, mesh, hit || iconGroup);

            setGridPosition(indexDelta, gridSize, mesh);
            gridGroup.add(mesh);
            resolve();
          },
          undefined,
          (err) => {
            console.error("Error loading texture:", err);
            reject(err);
          }
        );
      })
  );
  await Promise.all(promises);
  const size = getGridSize();
  currendGrid = gridSize;
  gridWorldHeight = size.height;
  return size;
}

/* =========================
   Dimensions & scroll
   ========================= */
function getGridHeightInPx(camera) {
  const halfFovRad = (camera.fov * Math.PI) / 360;
  const distance = camera.position.distanceTo(grid.position);
  const visibleHeight = 2 * distance * Math.tan(halfFovRad);
  const worldToScreenRatio = window.innerHeight / visibleHeight;

  _box3.setFromObject(grid);
  gridWorldHeight = _box3.max.y - _box3.min.y;
  const gridHeightInPx = gridWorldHeight * worldToScreenRatio;
  return gridHeightInPx;
}
function updateContainerHeight(scrollerRef, camera) {
  gridWorldHeight = getGridSize().height;
  frustumHeight =
    2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
  frustumWidth = frustumHeight * camera.aspect;

  const vhPerUnit = 100 / frustumHeight;
  const gridHeightInVh = gridWorldHeight * vhPerUnit + 5;
  scrollerRef.value.style.height = gridHeightInVh + "vh";
  ScrollTrigger.refresh();
}
function createScrollTrigger(dpr, camera, renderer, scrollContainer) {
  getGridHeightInPx(camera);
  scrollTrigger = ScrollTrigger.create({
    trigger: scrollContainer.value,
    start: "top top",
    end: () => scrollContainer.value.scrollHeight - window.innerHeight,
    scrub: true,
    onUpdate: async (self) => {
      grid.position.y =
        self.progress * (gridWorldHeight - 3 * targetHeight) +
        targetHeight -
        gridPosYOffset;
      if (batch < 15) {
        if (grid.children.length < 212 && self.progress > 0.7 && !loadingMore) {
          loadingMore = true;
          await loadGridImages(dpr, grid, images, renderer);
          updateContainerHeight(scrollContainer, camera);
          await nextTick();
          ScrollTrigger.refresh();
          grid.position.y = self.progress * gridWorldHeight;
          loadingMore = false;
        }
      }
    },
  });
}

function buildBookmarkIcon() {
  if (bookmarkIconPrefab) return bookmarkIconPrefab;
  const g = new Group();

  const outlinePtsXY = [52, 60, 32, 48, 12, 60, 12, 4, 52, 4, 52, 60];
  const outlineMat = new LineBasicMaterial({ color: 0x000000 });
  const off = (OUTLINE_THICKNESS_PX * SVG_UNITS_PER_PX) / 2;

  [
    [0, 0],
    [off, 0],
    [-off, 0],
    [0, off],
    [0, -off],
    [off, off],
    [-off, off],
    [off, -off],
    [-off, -off],
  ].forEach(([dx, dy]) => {
    const loop = makeLineLoopFromXY(outlinePtsXY, outlineMat.clone(), dx, dy);
    loop.userData.isIcon = true;
    loop.renderOrder = 10;
    g.add(loop);
  });

  const t = PLUS_THICKNESS_PX * SVG_UNITS_PER_PX;
  const plusMatV = new MeshBasicMaterial({ color: 0x000000 });
  const plusMatH = new MeshBasicMaterial({ color: 0x000000 });

  const rectShapeFn = (x, y, w, h) => {
    const s = new Shape();
    s.moveTo(x, y);
    s.lineTo(x + w, y);
    s.lineTo(x + w, y + h);
    s.lineTo(x, y + h);
    s.lineTo(x, y);
    return s;
  };

  const vGeo = new ShapeGeometry(rectShapeFn(32 - t / 2, 15.0, t, 18.0));
  const vMesh = new Mesh(vGeo, plusMatV);
  vMesh.position.z = 0.02;
  vMesh.userData.isIcon = true;
  vMesh.renderOrder = 10;
  g.add(vMesh);

  const hGeo = new ShapeGeometry(rectShapeFn(24.0, 24 - t / 2, 18.0, t));
  const hMesh = new Mesh(hGeo, plusMatH);
  hMesh.position.z = 0.02;
  hMesh.userData.isIcon = true;
  hMesh.renderOrder = 10;
  g.add(hMesh);

  const hitSize = 24;
  const hitGeom = new PlaneGeometry(hitSize, hitSize);
  const hitMat = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const hitMesh = new Mesh(hitGeom, hitMat);
  hitMesh.name = "bookmark-hit";
  hitMesh.position.set(32, 32, 0.02);
  hitMesh.userData.isIcon = true;
  hitMesh.renderOrder = 10;
  g.add(hitMesh);

  g.userData.isIcon = true;
  g.position.set(-VIEWBOX_SIZE / 2, -VIEWBOX_SIZE / 2, 0.01);
  g.scale.set(ICON_SCALE, -ICON_SCALE, ICON_SCALE);

  bookmarkIconPrefab = g;
  return bookmarkIconPrefab;
}

/* =========================
   App
   ========================= */
async function initGrid(
  scene,
  dpr,
  renderer,
  camera,
  containerHeight,
  scrollContainer
) {
  // Neutraler Output-Pfad (kein globales Tonemapping)
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  getCureentGridSize();
  buildBookmarkIcon();

  const totalWidth =
    gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  grid.position.x = -totalWidth / 2 + targetWidth / 2;
  grid.position.y = targetHeight - gridPosYOffset;

  await loadGridImages(dpr, grid, images, renderer);
  updateContainerHeight(scrollContainer, camera);
  createScrollTrigger(dpr, camera, renderer, scrollContainer);

  if (!hingeLeft) {
    hingeLeft = new Group();
    scene.add(hingeLeft);
  }
  if (!hingeRight) {
    hingeRight = new Group();
    scene.add(hingeRight);
  }

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  getCureentGridSize();
  updateGridPosition(gridSize);
  renderer.setSize(window.innerWidth, window.innerHeight);

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(
    () => updateContainerHeight(scrollContainer, camera),
    200
  );

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    getCureentGridSize();
    updateGridPosition(gridSize);
    renderer.setSize(window.innerWidth, window.innerHeight);
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(
      () => updateContainerHeight(scrollContainer, camera),
      200
    );
  });

  const raycaster = new Raycaster();
  const mouse = new Vector2();
  let openImg = false;

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableBtn, true);
    if (intersects.length > 0 && !openImg) {
      const clickedObject = intersects[0].object;

      if (clickedObject.userData.type === "image") {
        openImg = true;

        const originalParent   = clickedObject.parent;
        const originalPosition = clickedObject.position.clone();
        const originalRotation = clickedObject.rotation.clone();
        const originalScale    = clickedObject.scale.clone();

        const originalGridParent = grid.parent;

        // an Szene hängen (vorne)
        scene.attach(clickedObject);

        // View-Setup
        const viewDir = _tmpV3b;
        camera.getWorldDirection(viewDir);

        const zPos = 1.0;
        const halfFovRad = (camera.fov * Math.PI) / 360;

        let positionX = clickedObject.position.x;
        const baseSide =
          positionX === 0 ? (Math.random() > 0.5 ? 1 : -1) : (positionX > 0 ? -1 : 1);

        const objBase   = _tmpV3a.set(0, 0, zPos);
        const objToward = objBase.clone().add(viewDir.clone().multiplyScalar(-ANIM.object.depth));

        const dist = camera.position.distanceTo(objToward);
        const visibleHeight = 2 * dist * Math.tan(halfFovRad);
        const visibleWidth  = visibleHeight * camera.aspect;

        const scaleImg = (visibleHeight * ANIM.object.overscan) / targetHeight;

        // Objekt so platzieren, dass die 50vw-Box an der Browserkante anliegt
        const centerOffsetWorld = visibleWidth * 0.25 * (baseSide > 0 ? 1 : -1);
        positionX = centerOffsetWorld;
        objToward.setX(positionX);

        // ICONS: sofort raus
        const clickedIcon = clickedObject.children[0] || null;
        if (clickedIcon) clickedIcon.visible = false;
        const allGridIcons = collectIconNodes(grid, [clickedObject]);
        allGridIcons.forEach((n) => (n.visible = false));

        // Hinge-Setup
        _box3.setFromObject(grid);
        const leftEdgeX  = _box3.min.x;
        const rightEdgeX = _box3.max.x;
        const midY = (_box3.min.y + _box3.max.y) * 0.5;
        const midZ = (_box3.min.z + _box3.max.z) * 0.5;

        hingeLeft.position.set(leftEdgeX,  midY, midZ);
        hingeRight.position.set(rightEdgeX, midY, midZ);

        const activeHinge = baseSide > 0 ? hingeLeft : hingeRight;

        const originalHingePos = activeHinge.position.clone();
        const originalHingeRot = activeHinge.rotation.clone();

        scene.attach(activeHinge);
        activeHinge.attach(grid);

        const hingeAway = activeHinge.position
          .clone()
          .add(viewDir.clone().multiplyScalar(ANIM.hinge.depth));

        // Nur Grid-Flächen faden (Icons & geklicktes Objekt ausgeschlossen)
        const gridMats = collectGridFadeMaterials(grid, [clickedObject]);
        const gridFadeTargets = makeFadeTargets(gridMats);

        const ANGLE = ANIM.hinge.angle;
        const sign  = baseSide > 0 ? +1 : -1;

        // === Timeline OPEN
        const tl = makeTL("open").eventCallback("onComplete", () => {
          imagesDescription.value = {
            description:
              "lorem ipsum dolor sit amet consetetur sadipscing elitr sed diam nonumy eirmod tempor ...",
            url: clickedObject.userData.url,
            side: positionX > 0 ? "left" : "right",
            onClick: () => {
              imagesDescription.value = null;

              // === 1) Objekt-Rückfahrt + Reverse-Crop (0.5 -> halfStart) ===
              originalParent.attach(clickedObject);
              const tlObjBack = makeTL("close");

              if (clickedObject.material && clickedObject.material.uniforms) {
                const rev = { t: 1 };
                tlObjBack.to(rev, {
                  t: 0,
                  onUpdate: () => {
                    const { centerNdc: imgCenter } = captureMeshScreenNdc(clickedObject, camera);
                    const L = (a, b, t) => a + (b - a) * t;
                    const half = L(activeCrop.halfStart, ANIM.crop.targetHalfNDC, rev.t);
                    const u = clickedObject.material.uniforms;
                    u.uCenterNDC.value = imgCenter;
                    u.uHalfWidthNDC.value = half;
                    u.uCenterNDC.needsUpdate = true;
                    u.uHalfWidthNDC.needsUpdate = true;
                  },
                }, 0);
              }

              tlObjBack.to(clickedObject.rotation, {
                x: originalRotation.x, y: originalRotation.y, z: originalRotation.z,
              }, 0);
              tlObjBack.to(clickedObject.position, {
                x: originalPosition.x, y: originalPosition.y, z: originalPosition.z,
              }, 0);
              tlObjBack.to(clickedObject.scale, {
                x: originalScale.x, y: originalScale.y, z: originalScale.z,
              }, 0);

              // === 2) Nach Rückkehr ins Grid: Maske wieder AUS (kein Swap)
              tlObjBack.add(() => {
                const u = clickedObject.material?.uniforms;
                if (u) {
                  u.uHalfWidthNDC.value = ANIM.crop.offNDC; // Maske aus
                  u.uHalfWidthNDC.needsUpdate = true;
                }
              });

              // === 3) Grid zurückholen ===
              tlObjBack.add(() => {
                requestAnimationFrame(() => {
                  delayed(Math.max(0.02, ANIM.pause), () => {
                    const tlClose = makeTL("close");

                    tlClose.to(activeHinge.rotation, {
                      x: originalHingeRot.x, y: originalHingeRot.y, z: originalHingeRot.z,
                    }, 0);
                    tlClose.to(activeHinge.position, {
                      x: originalHingePos.x, y: originalHingePos.y, z: originalHingePos.z,
                      onComplete: () => {
                        if (originalGridParent) originalGridParent.attach(grid);
                        else scene.attach(grid);
                      },
                    }, 0);

                    // Grid-Fade IN (Shader uGlobalAlpha + Basic opacity gemeinsam)
                    prepareForFade(gridMats);
                    const gridFadeTargetsIn = makeFadeTargets(gridMats);
                    tlClose.to(gridFadeTargetsIn, { value: 1, opacity: 1 }, 0);

                    tlClose.add(() => {
                      restoreAfterFade(gridMats);
                      const allIconsNow = collectIconNodes(grid);
                      allIconsNow.forEach((n) => (n.visible = true));
                      if (clickedObject.children[0]) clickedObject.children[0].visible = true;
                      openImg = false;
                    });
                  });
                });
              });
            },
          };
        });

        // Fade vorbereiten (Grid OUT)
        tl.call(() => { prepareForFade(gridMats); }, null, 0);
        tl.call(() => {
          // direkt vor dem Fade Alpha auf 1 setzen (sicher)
          for (const m of gridMats) {
            if (m instanceof ShaderMaterial && m.uniforms?.uGlobalAlpha) {
              m.uniforms.uGlobalAlpha.value = 1;
            } else if ("opacity" in m) {
              m.opacity = 1;
            }
          }
        }, null, 0);

        // Vor Hinfahrt: Crop-Startbreite bestimmen und Maske aktivieren
        tl.call(() => {
          const mat = clickedObject.material;
          if (mat?.uniforms) {
            const { halfNdc } = captureMeshScreenNdc(clickedObject, camera);
            activeCrop.mesh = clickedObject;
            activeCrop.cropMaterial = mat;
            activeCrop.halfStart = Math.min(halfNdc, ANIM.crop.targetHalfNDC);
            activeCrop.isActive = true;
            updateCropUniformDynamic(clickedObject, camera, 0);
          }
        }, null, 0);

        // Crop 0 -> 1 (hin): halfStart -> 0.5
        const cropProg = { t: 0 };
        tl.to(cropProg, {
          t: 1,
          duration: ANIM.open.dur,
          ease: ANIM.open.ease,
          onUpdate: () => {
            if (activeCrop.mesh && activeCrop.cropMaterial) {
              updateCropUniformDynamic(activeCrop.mesh, camera, cropProg.t);
            }
          },
        }, 0);

        // Hinfahrt (Grid kippt/weg, Objekt nach vorn)
        tl.to(activeHinge.rotation, { y: originalHingeRot.y + sign * ANGLE }, 0)
          .to(activeHinge.position, { x: hingeAway.x, y: hingeAway.y, z: hingeAway.z }, 0)
          .to(clickedObject.position, { x: objToward.x, y: objToward.y, z: objToward.z }, 0)
          .to(clickedObject.scale,   { x: scaleImg, y: scaleImg, z: scaleImg }, 0);

        // Grid-Fade OUT (Shader uGlobalAlpha + Basic opacity gemeinsam)
        tl.to(gridFadeTargets, { value: 0, opacity: 0 }, 0);

      } else {
        // Bookmark-Icon Klick
        const target = clickedObject.parent.parent;

        const originalPosition = target.position.clone();
        const originalRotation = target.rotation.clone();
        const originalScale = target.scale.clone();

        scene.attach(target);

        const frontPosition = {
          x: frustumWidth / 2 - 0.2,
          y: frustumHeight / 2 - 0.2,
          z: 0.01,
        };
        const scale = 0.02;

        tween(target.position, {
          x: frontPosition.x, y: frontPosition.y, z: frontPosition.z,
        }, "open");
        tween(target.scale, {
          y: scale, x: scale, z: scale,
          onStart: () => { window.dispatchEvent(new CustomEvent("wishlist:bump")); },
          onComplete: () => {
            urls.value.push(target.userData.url);
            grid.attach(target);
            target.position.copy(originalPosition);
            target.rotation.copy(originalRotation);
            target.scale.copy(originalScale);
          },
        }, "open");
      }
    }
  }

  window.addEventListener("click", onMouseClick);

  return grid;
}

/* =========================
   Exports
   ========================= */
export { initGrid, updateContainerHeight };
