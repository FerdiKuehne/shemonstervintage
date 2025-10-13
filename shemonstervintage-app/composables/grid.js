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
  ShaderMaterial,
  Vector2,
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
import vertexShader from "./shaders/griditems/vertex.glsl?raw";
import fragmentShader from "./shaders/griditems/fragment.glsl?raw";

let gridSize, currendGrid;
let resizeTimeout;
let scrollHeight = 10;
let loadingMore = false;
let scrollTrigger;
let gridWorldHeight = 0;
let gridHeightInPx = 0;

/* Three js config */
const gapX = 2.5; /* Adjusted gapX to better fit images */
const gapY = 2.7; /* Adjusted gapY to better fit images */
const targetHeight =
  4.5 * 0.56; /* Adjusted targetHeight to maintain 8:9 aspect ratio */
const targetWidth =
  4 * 0.56; /* Adjusted targetWidth to maintain 8:9 aspect ratio */
const grid = new Group();
const geometry = new PlaneGeometry(targetWidth, targetHeight);

gsap.registerPlugin(ScrollTrigger);




let images = []; 
let backImage = [];
let batch = 1;


const loadFront = async (dpr) => {
  console.log("Loading front images for batch:", batch, "with DPR:", dpr);
  const url = `http://localhost:8000/stokes/gallery?type=front&batch=${batch}&dpr=${dpr}`;
  console.log(url);

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log("Parsed data:", data.data.front);
    console.log("Data success status:", data.success);
    const urls = Object.values(data.data.front);

    console.log("Current images before merge:", urls);

    if (data.success) {
      batch++; // increment batch for next call
      return [...images, ...urls]; // merge front images
    } else {
      console.error("API error:", data.message);
    }

  } catch (err) {
    console.error("Fetch error:", err);
  }
};



function getGridSize() {
  const rows = Math.ceil(grid.children.length / gridSize);
  const width = gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  const height = rows * targetHeight + (rows - 1) * (gapY - targetHeight);
  return { width, height };
}

function getObjectSize(obj) {
  const box = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3());
  return {
    width: size.x,
    height: size.y,
  };
}

function updateGridPosition(gridSize) {
  if (currendGrid !== gridSize) {
    grid.children.forEach((obj, index) => {
      setGridPosition(index, gridSize, obj);
    });
    const { width } = getGridSize();

    const { width: objectWidth } = getObjectSize(grid.children[0]);
    grid.position.x = -width / 2 + objectWidth / 2; // center the grid
    currendGrid = gridSize;
  }
}

function getCureentGridSize() {
  if (window.innerWidth > 1200) {
    gridSize = 4;
  } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
    gridSize = 3;
  } else if (window.innerWidth < 768) {
    gridSize = 2;
  }
}

function setGridPosition(index, columns, object) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * gapX;
  object.position.y = -(row * gapY);
}

async function loadGridImages(dpr,grid, images, renderer) {
  images = await loadFront(dpr);
  console.log("Loading batch:", batch);
  console.log("Total images to load:", images.length);
  console.log(images);
  const promises = images.map((url, index) => {
    return new Promise((resolve, reject) => {
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

          /* Tonek´s Area */

          const material = new ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
              uTexture: { value: texture },
              uCenter: { value: new Vector2(0.5, 0.5) },
              uRadius: { value: 0.5 },
              uFeather: { value: 0.2 },
              uStrength: { value: 0.2 },
            },
            transparent: true,
          });
          const mesh = new Mesh(geometry, material);

          setGridPosition(indexDelta, gridSize, mesh);
          mesh.userData.text =
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";

          grid.add(mesh);

          resolve(); // Resolve this promise when this texture is loaded
        },
        undefined,
        (err) => {
          console.error("Error loading texture:", err);
          reject(err);
        }
      );
    });
  });

  // Return a promise that resolves when all textures are loaded
  await Promise.all(promises);
  const size = getGridSize();
  currendGrid = gridSize;
  gridWorldHeight = size.height;
  console.log("Final grid size:", size.height);
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
  gridWorldHeight = getGridSize().height; // total height of the grid in world units

  // Compute visible height of camera in world units
  const frustumHeight =
    2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);

  // Convert world units to vh:
  // The visible part (frustumHeight) corresponds to 100vh
  const vhPerUnit = 100 / frustumHeight;
  const gridHeightInVh = gridWorldHeight * vhPerUnit + 5; // small padding to avoid cutting off

  scrollerRef.value.style.height = gridHeightInVh + "vh";
  ScrollTrigger.refresh();
}

function createScrollTrigger(dpr, camera, renderer, scrollContainer) {
  getGridHeightInPx(camera);

  // create scrollTrigger without tweening grid.position internally
  scrollTrigger = ScrollTrigger.create({
    trigger: scrollContainer.value,
    start: "top top",
    end: () => scrollContainer.value.scrollHeight - window.innerHeight,
    scrub: true,
    onUpdate: async (self) => {
      // directly control grid y based on progress
      grid.position.y =
        self.progress * (gridWorldHeight - 3 * targetHeight) + targetHeight;

      // load more images dynamically
      if (grid.children.length < 200 && self.progress > 0.7 && !loadingMore) {
        loadingMore = true;

        await loadGridImages(dpr, grid, images, renderer);

        // update container height based on camera frustum
        updateContainerHeight(scrollContainer, camera);

        await nextTick(); // wait for Vue to re-render

        // recalc ScrollTrigger end
        ScrollTrigger.refresh();

        // ensure grid y is correct after refresh
        grid.position.y = self.progress * gridWorldHeight;
        loadingMore = false;
      }
    },
  });
}

async function initGrid(dpr, renderer, camera, containerHeight, scrollContainer) {
  getCureentGridSize();
  /* Center mid pre init */
  const totalWidth =
    gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  grid.position.x = -totalWidth / 2 + targetWidth / 2;
  grid.position.y = targetHeight;

  await loadGridImages(dpr,grid, images, renderer);
  updateContainerHeight(scrollContainer, camera);

  createScrollTrigger(dpr, camera, renderer, scrollContainer);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    /* update grid pos and grid size */
    getCureentGridSize();
    updateGridPosition(gridSize);

    renderer.setSize(window.innerWidth, window.innerHeight);
    gridWorldHeight = getGridSize().height;

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateContainerHeight(scrollContainer, camera);
    }, 200);
  });

  return grid;
}

export { initGrid, updateContainerHeight };
