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
  ShaderMaterial,
  Vector2,
  LineBasicMaterial,
  EdgesGeometry,
  LineSegments,
  ExtrudeGeometry,
  Raycaster
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
// import vertexShader from "./shaders/griditems/vertex.glsl?raw";
// import fragmentShader from "./shaders/griditems/fragment.glsl?raw";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { urls } from "./refsHelper.js";

let gridSize, currendGrid;
let resizeTimeout;
let loadingMore = false;
let scrollTrigger;
let gridWorldHeight = 0;
let gridPosYOffset = 0.1;
let gridHeightInPx = 0;

/* Three js config */
const gapX = 2.05; // spacing
const gapY = 2.2;  // spacing
const targetHeight = 4.5 * 0.46; // ~8:9
const targetWidth  = 4   * 0.46;
const grid = new Group();
const geometry = new PlaneGeometry(targetWidth, targetHeight);

gsap.registerPlugin(ScrollTrigger);

let images = [];
let batch = 1;
let clickableBtn = [];
let frustumHeight, frustumWidth;

let bookmarkIcon; // preloaded SVG group

async function loadSVGIcon() {
  if (window.bookmarkIcon) return window.bookmarkIcon;

  const fillMaterial  = new MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.2 });
  const strokeMaterial = new LineBasicMaterial({ color: "#000000" });

  const loader = new SVGLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      "/icons/bookmark-plus.svg",
      (data) => {
        const group = new Group();

        data.paths.forEach((path) => {
          const shapes = SVGLoader.createShapes(path);
          shapes.forEach((shape) => {
            const meshGeo  = new ExtrudeGeometry(shape, { bevelEnabled: false });
            const mesh     = new Mesh(meshGeo, fillMaterial);
            const edgesGeo = new EdgesGeometry(meshGeo);
            const lines    = new LineSegments(edgesGeo, strokeMaterial);
            group.add(mesh, lines);
          });
        });

        const scaleFactor = 0.003;
        group.scale.set(scaleFactor, -scaleFactor, scaleFactor);
        group.position.set(0, 0, 0.01);

        bookmarkIcon = group;
        window.bookmarkIcon = group;
        resolve(group);
      },
      undefined,
      reject
    );
  });
}

const loadFront = async (dpr) => {
  const url = `http://localhost:8000/stokes/gallery?type=front&batch=${batch}&dpr=${dpr}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    const arr  = Object.values(data?.data?.front ?? {});
    if (data.success) {
      batch++;
      return arr;
    } else {
      console.error("API error:", data.message);
      return [];
    }
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
};

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
    grid.position.x = -width / 2 + objectWidth / 2; // center the grid
    currendGrid = nextGridSize;
  }
}

function getCureentGridSize() {
  if (window.innerWidth > 1200) {
    gridSize = 4;
  } else if (window.innerWidth > 768) {
    gridSize = 3;
  } else {
    gridSize = 2;
  }
}

function setGridPosition(index, columns, object) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * gapX;
  object.position.y = -(row * gapY);
}

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

          // Falls du die Shader willst, hier wieder aktivieren:
          // const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms: {...}, transparent: true });
          const material = new MeshBasicMaterial({ map: texture });
          const mesh = new Mesh(geometry, material);

          // SVG-Icon klonen & in die Ecke setzen
          const svgIcon = bookmarkIcon.clone(true);
          svgIcon.position.x = targetWidth  / 2 - 0.19;
          svgIcon.position.y = targetHeight / 2 - 0.03;
          mesh.add(svgIcon);

          // nützlich fürs Wishlist-Panel
          mesh.userData.url = "http://localhost:8000" + url;

          // Klick-Ziel registrieren
          clickableBtn.push(svgIcon);

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

function getGridHeightInPx(camera) {
  const halfFovRad = (camera.fov * Math.PI) / 360;
  const distance = camera.position.distanceTo(grid.position.clone());
  const visibleHeight = 2 * distance * Math.tan(halfFovRad);
  const worldToScreenRatio = window.innerHeight / visibleHeight;

  const box = new Box3().setFromObject(grid);
  gridWorldHeight = box.max.y - box.min.y;
  gridHeightInPx = gridWorldHeight * worldToScreenRatio;
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

      // Lazy-Load
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

async function initGrid(scene, dpr, renderer, camera, containerHeight, scrollContainer) {
  getCureentGridSize();
  await loadSVGIcon(); // Icon einmal vorladen

  // initial zentrieren
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
  gridWorldHeight = getGridSize().height;

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => updateContainerHeight(scrollContainer, camera), 200);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    getCureentGridSize();
    updateGridPosition(gridSize);

    renderer.setSize(window.innerWidth, window.innerHeight);
    gridWorldHeight = getGridSize().height;

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => updateContainerHeight(scrollContainer, camera), 200);
  });

  /** ===========================
   *  Klick auf das Icon (Raycaster)
   *  =========================== */
  const raycaster = new Raycaster();
  const mouse = new Vector2();

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(clickableBtn, true);
    if (!intersects.length) return;

    const clickedObject = intersects[0].object;
    // IconGroup -> parent; Bild-Mesh -> parent.parent
    const target = clickedObject.parent.parent;

    const originalPosition = target.position.clone();
    const originalRotation = target.rotation.clone();
    const originalScale    = target.scale.clone();

    // aus dem Grid lösen, um unabhängig animieren zu können
    scene.attach(target);

    // nach vorne an die rechte obere Ecke bewegen
    const frontPosition = {
      x: frustumWidth / 2 - 0.2,
      y: frustumHeight / 2 - 0.2,
      z: 0.01
    };
    const scale = 0.01;

    // Position animieren
    gsap.to(target.position, {
      x: frontPosition.x,
      y: frontPosition.y,
      z: frontPosition.z,
      duration: 0.5,
      ease: "power2.out"
    });

    // Scale animieren und dann zurückhängen
    gsap.to(target.scale, {
      x: scale,
      y: scale,
      z: scale,
      duration: 1,
      ease: "power2.out",
      onComplete: () => {
        // URL ins Wishlist-Array
        urls.value.push(target.userData.url);

        // >>> Header-Button soll bouncen + Icon invertieren:
        window.dispatchEvent(new CustomEvent("wishlist:bump"));

        // zurück in das Grid
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
