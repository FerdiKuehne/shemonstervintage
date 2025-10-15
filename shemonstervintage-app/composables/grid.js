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
  BoxGeometry,
  ShaderMaterial,
  Vector2,
  LineBasicMaterial,
  Line,
  DoubleSide,
  Color,
  EdgesGeometry,
  LineSegments,
  ShapeGeometry,
  ExtrudeGeometry,
  Raycaster,
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextTick } from "vue";
import vertexShader from "./shaders/griditems/vertex.glsl?raw";
import fragmentShader from "./shaders/griditems/fragment.glsl?raw";
import { BasicShader } from "three-stdlib";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { transform, transpileDeclaration } from "typescript";
import { urls, imagesDescription } from "./refsHelper.js";

let gridSize, currendGrid;
let resizeTimeout;
let scrollHeight = 10;
let loadingMore = false;
let scrollTrigger;
let gridWorldHeight = 0;
let gridPosYOffset = 0.1;
let gridHeightInPx = 0;

/* Three js config */
const gapX = 2.05; /* Adjusted gapX to better fit images */
const gapY = 2.2; /* Adjusted gapY to better fit images */
const targetHeight =
  4.5 * 0.46; /* Adjusted targetHeight to maintain 8:9 aspect ratio */
const targetWidth =
  4 * 0.46; /* Adjusted targetWidth to maintain 8:9 aspect ratio */
const grid = new Group();
const geometry = new PlaneGeometry(targetWidth, targetHeight);

gsap.registerPlugin(ScrollTrigger);

let images = [];
let backImage = [];
let batch = 1;
let clickableBtn = [];
let frustumHeight, frustumWidth;

let bookmarkIcon; // store globally

async function loadSVGIcon() {
  if (window.bookmarkIcon) return window.bookmarkIcon;

  const fillMaterial = new MeshBasicMaterial({
    color: "#FFFFFF",
    transparent: true,
    opacity: 0.2,
  });
  const stokeMaterial = new LineBasicMaterial({
    color: "#000000",
  });

  const loader = new SVGLoader();
  const updateMap = [];

  return new Promise((resolve, reject) => {
    loader.load(
      "/icons/bookmark-plus.svg",
      (data) => {
        const paths = data.paths;
        const group = new Group();
        paths.forEach((path) => {
          const shapes = SVGLoader.createShapes(path);

          shapes.forEach((shape) => {
            const meshGeometry = new ExtrudeGeometry(shape, {
              bevelEnabled: false,
            });
            const linesGeometry = new EdgesGeometry(meshGeometry);
            const mesh = new Mesh(meshGeometry, fillMaterial);
            const lines = new LineSegments(linesGeometry, stokeMaterial);

            updateMap.push({ shape, mesh, lines });
            group.add(mesh, lines);
          });
        });

        const scaleFactor = 0.003;

        group.scale.set(scaleFactor, -scaleFactor, scaleFactor);
        group.position.set(0, 0, 0.01);

        bookmarkIcon = group;
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
    const res = await fetch(url);
    const data = await res.json();

    const urls = Object.values(data.data.front);

    if (data.success) {
      batch++; // increment batch for next call
      return urls; // merge front images
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
  const height =
    rows * targetHeight + (rows - 1) * (gapY - targetHeight) + gridPosYOffset;
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

async function loadGridImages(dpr, grid, images, renderer) {
  images = await loadFront(dpr);

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

          /*
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
          */

          const material = new MeshBasicMaterial({ map: texture });

          const mesh = new Mesh(geometry, material);

          const svgIcon = bookmarkIcon.clone(true);
          svgIcon.position.x = targetWidth / 2 - 0.19;
          svgIcon.position.y = targetHeight / 2 - 0.03;
          mesh.add(svgIcon);

          mesh.userData.url = "http://localhost:8000" + url;

          svgIcon.userData.type = "icon";

          clickableBtn.push(svgIcon);
          clickableBtn.push(mesh);

          setGridPosition(indexDelta, gridSize, mesh);
          mesh.userData.text =
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";
          mesh.userData.type = "image";
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
  frustumHeight =
    2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
  frustumWidth = frustumHeight * camera.aspect;

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
        self.progress * (gridWorldHeight - 3 * targetHeight) +
        targetHeight -
        gridPosYOffset;

      // load more images dynamically
      if (grid.children.length < 220 && self.progress > 0.7 && !loadingMore) {
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

async function initGrid(
  scene,
  dpr,
  renderer,
  camera,
  containerHeight,
  scrollContainer
) {
  getCureentGridSize();
  await loadSVGIcon(); // preload icon
  /* Center mid pre init */
  const totalWidth =
    gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);
  grid.position.x = -totalWidth / 2 + targetWidth / 2;
  grid.position.y = targetHeight - gridPosYOffset;

  await loadGridImages(dpr, grid, images, renderer);
  updateContainerHeight(scrollContainer, camera);

  createScrollTrigger(dpr, camera, renderer, scrollContainer);

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

  // Raycaster for detecting clicks
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

      console.log(clickedObject.userData.type);

      if (clickedObject.userData.type === "image") {
        openImg = true;

        // Save original parent and local transforms
        const originalParent = clickedObject.parent;
        const originalPosition = clickedObject.position.clone();
        const originalRotation = clickedObject.rotation.clone();
        const originalScale = clickedObject.scale.clone();

        // Move object to scene while preserving world position
        scene.attach(clickedObject);

        let positionX = clickedObject.position.x;

        const zPos = 1.0;
        const frustumHeightZposImg =
          2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        const frustumWidthZ = frustumHeightZposImg * camera.aspect;

        const scaleImg = (frustumHeightZposImg / targetHeight) * 0.75;
        const positionNeu = targetWidth * scaleImg * 0.5;

        if (positionX > 0.0) {
          positionX = -positionNeu;
        } else if (positionX < 0.0) {
          positionX = positionNeu;
        } else {
          positionX = Math.random() > 0.5 ? positionNeu : -positionNeu;
        }

        clickedObject.children[0].visible = false;

        gsap.to(grid.rotation, {
          x: grid.rotation.x + 1,
          duration: 0.5,    
        }
        )

        gsap.to(clickedObject.position, {
          x: positionX,
          y: 0,
          z: zPos,
          duration: 1,
        });
        gsap.to(clickedObject.scale, {
          y: scaleImg,
          x: scaleImg,
          z: scaleImg,
          duration: 1,
          onComplete: () => {
            console.log(
              "height after scale: " + clickedObject.geometry.parameters.height
            );
          },
        });

        imagesDescription.value = {
          description:
            "lorem ipsum dolor sit amet consetetur sadipscing elitr sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat sed diam voluptua. at vero eos et accusam et justo duo dolores et ea rebum stet clita kasd gubergren no sea takimata sanctus est lorem ipsum dolor sit amet",
          url: clickedObject.userData.url,
          onClick: () => {
            gsap.to(clickedObject.position, originalPosition);
    
            // Restore child visibility
            clickedObject.children[0].visible = true;
            originalParent.attach(clickedObject);

            gsap.to(grid.rotation, {
              x: grid.rotation.x - 1,
              duration: 0.5,    
            } 
            )
            gsap.to(clickedObject.rotation, {
              x: clickedObject.rotation.x + 1,
              duration: 0.5,    
            } 
            )

            gsap.to(clickedObject.position, {
              x: originalPosition.x,
              y: originalPosition.y,
              z: originalPosition.z,
              duration: 0.3,
            });
            gsap.to(clickedObject.scale, {
              y: originalScale.y,
              x: originalScale.x,
              z: originalScale.z,
              duration: 0.3,
              onComplete: () => {
                
          
                openImg = false;
              },
            });
            imagesDescription.value = null;

          },
          side: positionX > 0 ? "left" : "right",
        };
      } else {
        const target = clickedObject.parent.parent; // The grid object

        const originalPosition = target.position.clone();
        const originalRotation = target.rotation.clone();

        // Move to scene root (so it can animate independently of grid)
        scene.attach(target);

        // Optional: move to front for better visibility
        const frontPosition = {
          x: frustumWidth / 2 - 0.2,
          y: frustumHeight / 2 - 0.2,
          z: 0.01,
        };

        let scale = 0.01;

        // Animate to front
        gsap.to(target.position, {
          x: frontPosition.x,
          y: frontPosition.y,
          z: frontPosition.z,
          duration: 0.5,
        });
        gsap.to(target.scale, {
          y: scale,
          x: scale,
          z: scale,
          duration: 1,
          onComplete: () => {
            // After animation, return to original grid position
            const element = document.getElementsByClassName("btn-wishlist")[0];

            urls.value.push(target.userData.url);

            gsap.to(element, {
              backgroundColor: "#000",
              duration: 0.5,
              delay: 0.1,
              yoyo: true,
              repeat: 1,
            });

            grid.attach(target);
            target.position.copy(originalPosition);
            target.rotation.copy(originalRotation);
            target.scale.set(1, 1, 1);
          },
        });
      }
    }
  }

  window.addEventListener("click", onMouseClick);

  return grid;
}

export { initGrid, updateContainerHeight };
