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
  Raycaster
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
import { urls } from "./refsHelper.js";

gsap.registerPlugin(ScrollTrigger);

/* =========================
   Config – deine Stellschrauben
   ========================= */
// Linienstärken
const OUTLINE_THICKNESS_PX = 0.5; // Rahmen (Quad-Stroke) in px  ← dein Wert
const PLUS_THICKNESS_PX    = 1.0; // Plus in px                  ← dein Wert

// Icon-Skalierung/Koordinaten
const ICON_SCALE = 0.003;   // SVG->Three Skalierung
const SVG_UNITS_PER_PX = 2; // 64 Units ~ 32px → ca. 2 Units/px
const VIEWBOX_SIZE = 64;    // 64×64

// Abstand des Icons von oben/rechts innerhalb der Karte (in World-Units)
const ICON_MARGIN_X_WU = 0.265; // ~1rem nach innen (rechts)
const ICON_MARGIN_Y_WU = 0.095; // ~1rem nach innen (oben)

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
const targetWidth  = 4   * 0.46;

const grid = new Group();
const geometry = new PlaneGeometry(targetWidth, targetHeight);

let images = [];
let batch = 1;
let clickableBtn = [];
let frustumHeight, frustumWidth;

let bookmarkIcon;

/* =========================
   Helpers
   ========================= */
function rectShape(x, y, w, h) {
  const s = new Shape();
  s.moveTo(x, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h);
  s.lineTo(x, y + h);
  s.lineTo(x, y);
  return s;
}

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

/** Bookmark-Icon mit Quad-Stroke-Outline + einstellbarer Plus-Dicke */
function buildBookmarkIcon() {
  if (bookmarkIcon) return bookmarkIcon;

  const g = new Group();

  // 1) OUTLINE als Polygonpunkte (wie dein Header-Icon)
  const outlinePtsXY = [
    52, 60,
    32, 48,
    12, 60,
    12,  4,
    52,  4,
    52, 60
  ];

  // Material: echtes Schwarz
  const outlineMat = new LineBasicMaterial({ color: 0x000000 });

  // Offsets in SVG-Units für gewünschte Pixel-Dicke
  const off = (OUTLINE_THICKNESS_PX * SVG_UNITS_PER_PX) / 2;

  // Quad-Stroke (8 Offsets + Mitte)
  [
    [ 0,  0],
    [ off, 0], [ -off, 0],
    [ 0,  off], [ 0, -off],
    [ off,  off], [ -off,  off],
    [ off, -off], [ -off, -off]
  ].forEach(([dx, dy]) => {
    g.add(makeLineLoopFromXY(outlinePtsXY, outlineMat, dx, dy));
  });

  // 2) PLUS – zwei Rechtecke, Dicke in px → SVG-Units
  const t = PLUS_THICKNESS_PX * SVG_UNITS_PER_PX;
  const plusMat = new MeshBasicMaterial({ color: 0x000000 });

  // Vertikal exakt zentriert: x=32, y: 15..33 (H=18)
  const vShape = rectShape(32 - t / 2, 15.0, t, 18.0);
  const vGeo   = new ShapeGeometry(vShape);
  const vMesh  = new Mesh(vGeo, plusMat);
  vMesh.position.z = 0.01;
  g.add(vMesh);

  // Horizontal exakt zentriert: y=24, x: 24..42 (W=18)
  const hShape = rectShape(24.0, 24 - t / 2, 18.0, t);
  const hGeo   = new ShapeGeometry(hShape);
  const hMesh  = new Mesh(hGeo, plusMat);
  hMesh.position.z = 0.01;
  g.add(hMesh);

  // 3) Unsichtbare Hitbox (für komfortables Klicken)
  const hitSize = 24;
  const hitGeom = new PlaneGeometry(hitSize, hitSize);
  const hitMat  = new MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
  const hitMesh = new Mesh(hitGeom, hitMat);
  hitMesh.name = "bookmark-hit";
  hitMesh.position.set(32, 32, 0.02);
  g.add(hitMesh);

  // 4) Pivot ins Zentrum setzen und dann skalieren
  g.position.set(-VIEWBOX_SIZE / 2, -VIEWBOX_SIZE / 2, 0.01);
  g.scale.set(ICON_SCALE, -ICON_SCALE, ICON_SCALE);

  bookmarkIcon = g;
  return bookmarkIcon;
}

/* =========================
   Data loading
   ========================= */
const loadFront = async (dpr) => {
  const url = `http://localhost:8000/stokes/gallery?type=front&batch=${batch}&dpr=${dpr}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    const arr  = Object.values(data?.data?.front ?? {});
    if (data.success) { batch++; return arr; }
    console.error("API error:", data.message);
    return [];
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
};

/* =========================
   Grid helpers
   ========================= */
function getGridSize() {
  const rows   = Math.ceil(grid.children.length / gridSize);
  const width  = gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  const height = rows * targetHeight + (rows - 1) * (gapY - targetHeight) + gridPosYOffset;
  return { width, height };
}
function getObjectSize(obj) {
  const box  = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3());
  return { width: size.x, height: size.y };
}
function updateGridPosition(nextGridSize) {
  if (currendGrid !== nextGridSize) {
    grid.children.forEach((obj, index) => setGridPosition(index, nextGridSize, obj));
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

/* =========================
   Load images into grid
   ========================= */
async function loadGridImages(dpr, gridRef, imgs, renderer) {
  imgs = await loadFront(dpr);

  const promises = imgs.map((url, index) =>
    new Promise((resolve, reject) => {
      const indexDelta = index + gridRef.children.length;
      const loader = new TextureLoader();

      loader.load(
        "http://localhost:8000" + url,
        (texture) => {
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter  = LinearFilter;
          texture.magFilter  = NearestFilter;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.needsUpdate = true;

          const material = new MeshBasicMaterial({ map: texture });
          const mesh = new Mesh(geometry, material);

          // Icon klonen & sauber IN die Ecke schieben (1rem inside → subtract)
          const iconGroup = buildBookmarkIcon().clone(true);
          iconGroup.position.x =  targetWidth  / 2 - ICON_MARGIN_X_WU; // rechts nach innen
          iconGroup.position.y =  targetHeight / 2 - ICON_MARGIN_Y_WU; // oben  nach innen
          mesh.add(iconGroup);

          // Nur die Hitbox in die Klickliste
          const hit = iconGroup.getObjectByName("bookmark-hit");
          clickableBtn.push(hit || iconGroup);

          mesh.userData.url = "http://localhost:8000" + url;

          setGridPosition(indexDelta, gridSize, mesh);
          gridRef.add(mesh);
          resolve();
        },
        undefined,
        (err) => { console.error("Error loading texture:", err); reject(err); }
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
  frustumHeight = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
  frustumWidth  = frustumHeight * camera.aspect;
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
        self.progress * (gridWorldHeight - 3 * targetHeight) + targetHeight - gridPosYOffset;

      if (grid.children.length < 220 && self.progress > 0.7 && !loadingMore) {
        loadingMore = true;
        await loadGridImages(dpr, grid, images, renderer);
        updateContainerHeight(scrollContainer, camera);
        await nextTick();
        ScrollTrigger.refresh();
        grid.position.y = self.progress * gridWorldHeight;
        loadingMore = false;
      }
    }
  });
}

/* =========================
   Init
   ========================= */
async function initGrid(scene, dpr, renderer, camera, containerHeight, scrollContainer) {
  getCureentGridSize();
  buildBookmarkIcon();

  const totalWidth = gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  grid.position.x = -totalWidth / 2 + targetWidth / 2;
  grid.position.y = targetHeight - gridPosYOffset;

  await loadGridImages(dpr, grid, images, renderer);
  updateContainerHeight(scrollContainer, camera);
  createScrollTrigger(dpr, camera, renderer, scrollContainer);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  getCureentGridSize();
  updateGridPosition(gridSize);
  renderer.setSize(window.innerWidth, window.innerHeight);

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => updateContainerHeight(scrollContainer, camera), 200);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    getCureentGridSize();
    updateGridPosition(gridSize);
    renderer.setSize(window.innerWidth, window.innerHeight);
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => updateContainerHeight(scrollContainer, camera), 200);
  });

  // Raycaster & Interactions (einmal)
  const raycaster = new Raycaster();
  const mouse = new Vector2();

  // Hover → Cursor pointer
  let isHoveringIcon = false;
  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableBtn, true);
    const hovering = intersects.length > 0;
    if (hovering !== isHoveringIcon) {
      isHoveringIcon = hovering;
      document.body.style.cursor = hovering ? "pointer" : "";
    }
  }
  window.addEventListener("mousemove", onMouseMove);

  // Klick auf das Icon
  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableBtn, true);
    if (!intersects.length) return;

    const hitObject = intersects[0].object;  // Hitbox
    const target = hitObject.parent.parent;   // Bild-Mesh

    const originalPosition = target.position.clone();
    const originalRotation = target.rotation.clone();
    const originalScale    = target.scale.clone();

    scene.attach(target);

    const frontPosition = {
      x: frustumWidth / 2 - 0.2,
      y: frustumHeight / 2 - 0.2,
      z: 0.01
    };
    const scale = 0.02;

    gsap.to(target.position, {
      x: frontPosition.x,
      y: frontPosition.y,
      z: frontPosition.z,
      duration: 0.5,
      ease: "power2.out"
    });

    gsap.to(target.scale, {
      x: scale,
      y: scale,
      z: scale,
      duration: 1,
      ease: "power2.out",
      onStart: () => {
        window.dispatchEvent(new CustomEvent("wishlist:bump"));
      },
      onComplete: () => {
        urls.value.push(target.userData.url);
        grid.attach(target);
        target.position.copy(originalPosition);
        target.rotation.copy(originalRotation);
        target.scale.copy(originalScale);
      }
    });
  }
  window.addEventListener("click", onMouseClick);

  return grid;
}

export { initGrid, updateContainerHeight };
