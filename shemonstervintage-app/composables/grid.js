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
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
import { urls, imagesDescription } from "./refsHelper.js";

gsap.registerPlugin(ScrollTrigger);

/* =========================
   Config
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

let images = [];
let batch = 1;
let clickableBtn = [];
let frustumHeight, frustumWidth;

let bookmarkIcon;

// Hinge-Gruppen
let hingeLeft = null;
let hingeRight = null;

// Tiefen/Timing
const DEPTH_GRID = 3.0;
const DEPTH_OBJ = 2.2;

// ---------- SPEED TWEAKS ----------
const OPEN_DUR = 0.42; // schneller (vorher 0.6)
const CLOSE_DUR = 0.34; // schneller (vorher 0.5)
const OPEN_EASE = "expo.out"; // knackiger (vorher power2.out)
const CLOSE_EASE = "power3.inOut"; // smoother close
const ANIM_SPEED = 1.35; // Globaler Multiplikator für ALLE Timelines (inkl. Masken-Progress)
// ----------------------------------

// Warten bis das Vue-Description-Panel ausgeblendet ist, bevor das Grid zurückkommt
const DESC_FADE_MS = 220; // etwas schneller (vorher 300)

/* =========================
   NDC-Cropshader (Maske klebt am Bild)
   ========================= */
const cropVertex = /* glsl */ `
  varying float vNdcX;
  varying vec2  vUv;
  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vNdcX = clip.x / clip.w;           // NDC X [-1..+1]
    gl_Position = clip;
  }
`;

const cropFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D map;
  uniform float uCenterNDC;
  uniform float uHalfWidthNDC;
  varying float vNdcX;
  varying vec2  vUv;

  // sRGB <-> Linear helpers (ohne three-Chunks)
  vec3 SRGBToLinear(vec3 c)  { return pow(c, vec3(2.2)); }
  vec3 LinearToSRGB(vec3 c)  { return pow(c, vec3(1.0/2.2)); }

  void main() {
    if (abs(vNdcX - uCenterNDC) > uHalfWidthNDC) discard;

    vec4 tex = texture2D(map, vUv);

    // Wie MeshBasic: sRGB-Texture -> Linear arbeiten -> zurück nach sRGB ausgeben
    vec3 lin = SRGBToLinear(tex.rgb);
    vec3 outSRGB = LinearToSRGB(lin);

    gl_FragColor = vec4(outSRGB, tex.a);
  }
`;

function makeAnimatedCropMaterial(texture) {
  const mat = new ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uCenterNDC: { value: 0.0 },
      uHalfWidthNDC: { value: 1.0 },
    },
    vertexShader: cropVertex,
    fragmentShader: cropFragment,
    transparent: true,
    depthWrite: false,
  });

  // Tonemapping aktiv lassen, aber wir linearisieren im Shader → konsistente Helligkeit
  mat.toneMapped = true;

  return mat;
}

// helper: polyline -> LineLoop (XY-Punkte in Screen-like SVG-Einheiten)
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

// Hilfsvektor & lokale Ecken deines Plane
const _tmpV = new Vector3();
const LOCAL_CORNERS = [
  new Vector3(-targetWidth / 2, targetHeight / 2, 0), // TL
  new Vector3(targetWidth / 2, targetHeight / 2, 0), // TR
  new Vector3(-targetWidth / 2, -targetHeight / 2, 0), // BL
  new Vector3(targetWidth / 2, -targetHeight / 2, 0), // BR
];

// NDC.x eines Weltpunkts
function worldToNdcX(world, camera) {
  _tmpV.copy(world).project(camera);
  return _tmpV.x; // -1..+1
}

function captureMeshScreenNdc(mesh, camera) {
  // Breite (für halfStart) aus Ecken
  const ndcXs = LOCAL_CORNERS.map((c) =>
    worldToNdcX(mesh.localToWorld(c.clone()), camera)
  );
  const minX = Math.min(...ndcXs);
  const maxX = Math.max(...ndcXs);
  const halfNow = (maxX - minX) * 0.5;

  // Mitte aus Ursprung (robust & glatt)
  const centerNow = worldToNdcX(
    mesh.localToWorld(new Vector3(0, 0, 0)),
    camera
  );

  return { halfNdc: halfNow, centerNdc: centerNow };
}

/** Crop-Anim State */
let activeCrop = {
  mesh: null,
  originalMaterial: null,
  cropMaterial: null,
  halfStart: 0, // Start-Halbbreite (NDC)
};

/**
 * Maskenmitte = Bildmitte (jeder Frame)
 * → Bild bleibt stets mittig beschnitten.
 * Wir tweenen nur die Halbbreite zur 50vw-Maske.
 */
function updateCropUniformDynamic(mesh, camera, progress) {
  if (!mesh || !activeCrop.cropMaterial) return;

  const L = (a, b, t) => a + (b - a) * t;

  const { centerNdc: imgCenter } = captureMeshScreenNdc(mesh, camera);
  const half = L(activeCrop.halfStart, 0.5, progress);

  const u = activeCrop.cropMaterial.uniforms;
  u.uCenterNDC.value = imgCenter;
  u.uHalfWidthNDC.value = half;
  u.uCenterNDC.needsUpdate = true;
  u.uHalfWidthNDC.needsUpdate = true;
}

/* =========================
   Fade-Helper
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
    m.depthTest = false;
  });
}
function restoreAfterFade(materials) {
  materials.forEach((m) => {
    const st = originalState.get(m);
    if (st) {
      m.transparent = st.transparent;
      m.depthWrite = st.depthWrite;
      m.depthTest = st.depthTest;
      m.opacity = st.opacity;
      m.needsUpdate = true;
      originalState.delete(m);
    } else {
      m.opacity = 1;
      m.needsUpdate = true;
    }
  });
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
  const box = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3());
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

async function loadGridImages(dpr, grid, imgs, renderer) {
  imgs = await loadFront(dpr);
  const promises = imgs.map(
    (url, index) =>
      new Promise((resolve, reject) => {
        const indexDelta = index + grid.children.length;
        const loader = new TextureLoader();
        loader.load(
          "http://localhost:8000" + url,
          (texture) => {
            texture.colorSpace = SRGBColorSpace;
            texture.minFilter = LinearFilter;
            texture.magFilter = NearestFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.needsUpdate = true;

            const material = new MeshBasicMaterial({ map: texture });
            const mesh = new Mesh(geometry, material);

            // Icon
            const iconGroup = buildBookmarkIcon().clone(true);
            iconGroup.position.x = targetWidth / 2 - ICON_MARGIN_X_WU;
            iconGroup.position.y = targetHeight / 2 - ICON_MARGIN_Y_WU;
            iconGroup.traverse((o) => {
              o.userData.isIcon = true;
              o.renderOrder = 10;
            });
            mesh.add(iconGroup);

            mesh.userData.url = "http://localhost:8000" + url;
            mesh.userData.text = "Lorem ipsum ...";
            mesh.userData.type = "image";

            const hit = iconGroup.getObjectByName("bookmark-hit");
            clickableBtn.push(iconGroup, mesh, hit || iconGroup);

            setGridPosition(indexDelta, gridSize, mesh);
            grid.add(mesh);
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
  const distance = camera.position.distanceTo(grid.position.clone());
  const visibleHeight = 2 * distance * Math.tan(halfFovRad);
  const worldToScreenRatio = window.innerHeight / visibleHeight;

  const box = new Box3().setFromObject(grid);
  gridWorldHeight = box.max.y - box.min.y;
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
  if (bookmarkIcon) return bookmarkIcon;
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

  bookmarkIcon = g;
  return bookmarkIcon;
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

        const originalParent = clickedObject.parent;
        const originalPosition = clickedObject.position.clone();
        const originalRotation = clickedObject.rotation.clone();
        const originalScale = clickedObject.scale.clone();

        const originalGridParent = grid.parent;

        scene.attach(clickedObject);

        const dir = new Vector3();
        camera.getWorldDirection(dir);

        const zPos = 1.0;
        const halfFovRad = (camera.fov * Math.PI) / 360;

        let positionX = clickedObject.position.x;
        const baseSide =
          positionX === 0
            ? Math.random() > 0.5
              ? 1
              : -1
            : positionX > 0
            ? -1
            : 1;

        const objBase = new Vector3(0, 0, zPos);
        let objToward = objBase
          .clone()
          .add(dir.clone().multiplyScalar(-DEPTH_OBJ));

        const dist = camera.position.distanceTo(objToward);
        const visibleHeight = 2 * dist * Math.tan(halfFovRad);
        const visibleWidth = visibleHeight * camera.aspect;

        const OVERSCAN = 1.01;
        const scaleImg = (visibleHeight * OVERSCAN) / targetHeight;

        // Objekt so platzieren, dass die 50vw-Box an der Browserkante anliegt
        const centerOffsetWorld = visibleWidth * 0.25 * baseSide;
        positionX = centerOffsetWorld;
        objToward.setX(positionX);

        // ICONS: sofort raus
        const clickedIcon = clickedObject.children[0] || null;
        if (clickedIcon) clickedIcon.visible = false;
        const allGridIcons = collectIconNodes(grid, [clickedObject]);
        allGridIcons.forEach((n) => (n.visible = false));

        // Hinge-Setup
        const gridBox = new Box3().setFromObject(grid);
        const leftEdgeX = gridBox.min.x;
        const rightEdgeX = gridBox.max.x;
        const midY = (gridBox.min.y + gridBox.max.y) * 0.5;
        const midZ = (gridBox.min.z + gridBox.max.z) * 0.5;

        hingeLeft.position.set(leftEdgeX, midY, midZ);
        hingeRight.position.set(rightEdgeX, midY, midZ);

        const activeHinge = baseSide > 0 ? hingeLeft : hingeRight;

        const originalHingePos = activeHinge.position.clone();
        const originalHingeRot = activeHinge.rotation.clone();

        scene.attach(activeHinge);
        activeHinge.attach(grid);

        const hingeAway = activeHinge.position
          .clone()
          .add(dir.clone().multiplyScalar(DEPTH_GRID));

        // Nur Grid-Flächen faden (Icons & geklicktes Objekt ausgeschlossen)
        const gridMats = collectGridFadeMaterials(grid, [clickedObject]);

        const ANGLE = 0.6;
        const sign = baseSide > 0 ? +1 : -1;

        const tl = gsap
          .timeline({
            defaults: { duration: OPEN_DUR, ease: OPEN_EASE },
            onComplete: () => {
              imagesDescription.value = {
                description:
                  "lorem ipsum dolor sit amet consetetur sadipscing elitr sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat sed diam voluptua. at vero eos et accusam et justo duo dolores et ea rebum stet clita kasd gubergren no sea takimata sanctus est lorem ipsum dolor sit amet",
                url: clickedObject.userData.url,
                side: positionX > 0 ? "left" : "right",
                onClick: () => {
                  // Description zuerst ausfaden
                  imagesDescription.value = null;

                  // Crop-Material zurücksetzen
                  if (activeCrop.mesh === clickedObject) {
                    clickedObject.material = activeCrop.originalMaterial;
                    activeCrop.mesh = null;
                    activeCrop.originalMaterial = null;
                    activeCrop.cropMaterial = null;
                  }

                  // Objekt zurückfahren
                  originalParent.attach(clickedObject);
                  gsap.to(clickedObject.rotation, {
                    x: originalRotation.x,
                    y: originalRotation.y,
                    z: originalRotation.z,
                    duration: CLOSE_DUR,
                    ease: CLOSE_EASE,
                  });
                  gsap.to(clickedObject.position, {
                    x: originalPosition.x,
                    y: originalPosition.y,
                    z: originalPosition.z,
                    duration: CLOSE_DUR,
                    ease: CLOSE_EASE,
                  });
                  gsap.to(clickedObject.scale, {
                    x: originalScale.x,
                    y: originalScale.y,
                    z: originalScale.z,
                    duration: CLOSE_DUR,
                    ease: CLOSE_EASE,
                  });

                  const startGridReturn = () => {
                    const tlClose = gsap
                      .timeline({
                        defaults: { duration: CLOSE_DUR, ease: CLOSE_EASE },
                      })
                      .timeScale(ANIM_SPEED); // <<< speed sync

                    tlClose.to(
                      activeHinge.rotation,
                      {
                        x: originalHingeRot.x,
                        y: originalHingeRot.y,
                        z: originalHingeRot.z,
                      },
                      0
                    );
                    tlClose.to(
                      activeHinge.position,
                      {
                        x: originalHingePos.x,
                        y: originalHingePos.y,
                        z: originalHingePos.z,
                        onComplete: () => {
                          if (originalGridParent)
                            originalGridParent.attach(grid);
                          else scene.attach(grid);
                        },
                      },
                      0
                    );

                    prepareForFade(gridMats);
                    tlClose.to(gridMats, { opacity: 1 }, 0);
                    tlClose.add(() => {
                      restoreAfterFade(gridMats);
                      const allIconsNow = collectIconNodes(grid);
                      allIconsNow.forEach((n) => (n.visible = true));
                      if (clickedObject.children[0])
                        clickedObject.children[0].visible = true;
                      openImg = false;
                    });
                  };
                  gsap.delayedCall(DESC_FADE_MS / 1000, startGridReturn);
                },
              };
            },
          })
          .timeScale(ANIM_SPEED); // <<< speed sync für Öffnen

        // Fade vorbereiten
        tl.call(
          () => {
            prepareForFade(gridMats);
          },
          null,
          0
        );

        // >>> VOR der Hinfahrt: Crop-Material setzen
        tl.call(
          () => {
            const tex = clickedObject.material?.map;
            if (tex) {
              activeCrop.originalMaterial = clickedObject.material;
              activeCrop.cropMaterial = makeAnimatedCropMaterial(tex);
              clickedObject.material = activeCrop.cropMaterial;
              activeCrop.mesh = clickedObject;

              // Startbreite (klein im Grid)
              const { halfNdc } = captureMeshScreenNdc(clickedObject, camera);
              activeCrop.halfStart = Math.min(halfNdc, 0.5);

              // initiale Uniforms
              updateCropUniformDynamic(clickedObject, camera, 0);
            }
          },
          null,
          0
        );

        // Dummy-Progress 0→1 für Halbbreiten-Tween (Maske folgt Bildmitte automatisch)
        const cropProg = { t: 0 };
        tl.to(
          cropProg,
          {
            t: 1,
            duration: OPEN_DUR,
            ease: OPEN_EASE,
            onUpdate: () => {
              if (activeCrop.mesh && activeCrop.cropMaterial) {
                updateCropUniformDynamic(activeCrop.mesh, camera, cropProg.t);
              }
            },
          },
          0
        );

        // Hinfahrt (Grid kippt/weg, Objekt nach vorn)
        tl.to(activeHinge.rotation, { y: originalHingeRot.y + sign * ANGLE }, 0)
          .to(
            activeHinge.position,
            { x: hingeAway.x, y: hingeAway.y, z: hingeAway.z },
            0
          )
          .to(
            clickedObject.position,
            { x: objToward.x, y: objToward.y, z: objToward.z },
            0
          )
          .to(clickedObject.scale, { x: scaleImg, y: scaleImg, z: scaleImg }, 0)
          .to(gridMats, { opacity: 0 }, 0);
      } else {
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
        let scale = 0.02;

        gsap.to(target.position, {
          x: frontPosition.x,
          y: frontPosition.y,
          z: frontPosition.z,
          duration: OPEN_DUR,
          ease: OPEN_EASE,
        });
        gsap.to(target.scale, {
          y: scale,
          x: scale,
          z: scale,
          duration: OPEN_DUR + 0.4,
          ease: OPEN_EASE,
          onStart: () => {
            window.dispatchEvent(new CustomEvent("wishlist:bump"));
          },
          onComplete: () => {
            urls.value.push(target.userData.url);
            grid.attach(target);
            target.position.copy(originalPosition);
            target.rotation.copy(originalRotation);
            target.scale.copy(originalScale);
          },
        });
      }
    }
  }

  window.addEventListener("click", onMouseClick);

  return grid;
}

/* =========================
   Bookmark-Icon Bau
   ========================= */

export { initGrid, updateContainerHeight };
