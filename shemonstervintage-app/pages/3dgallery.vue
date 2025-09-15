<template>
  <div id="scroll-container" :style="{ height: containerHeight + 'vh' }">
    <div ref="threeContainer" class="three-container"></div>
    <div
      ref="scrollerModal"
      class="modal-content"
      :class="{ open: isModalOpen }"
    >
      <div class="modal-text-wrapper">
        <div class="modal-text">
          {{ textImage }}
        </div>
      </div>
      <div class="modal-buttons">
        <button>Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { ref, onMounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);
gsap.registerPlugin(ScrollTrigger);

const threeContainer = ref(null);
const containerHeight = ref(250);
const isModalOpen = ref(false);
const textImage = ref(null);
const scrollerModal = ref(null);

let currendGrid;

const itemGapX = 2.4;
const itemGapY = 2.6;

let resizeTimeout;
let loadingMore = false;

let scrollTween, scrollHeight;

const images = Array.from(
  { length: 16 },
  (_, i) => `https://picsum.photos/800/900?random=${i + 1}` // 8:9 format (400x600)
);

let newImages = null;
let loadedCount = 0;
let total = images.length;
let oldTotal = total;

function setGridPosition(index, columns, object, spacingX, spacingY) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * spacingX;
  object.position.y = -(row * spacingY);
}

function disableScroll() {
  document.body.style.overflow = "hidden";
}

function enableScroll() {
  document.body.style.overflow = "";
}

onMounted(() => {
  if (window.innerWidth > 1200) {
    currendGrid = 4;
  } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
    currendGrid = 3;
  } else if (window.innerWidth < 768) {
    currendGrid = 2;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const grid = new THREE.Group();
  threeContainer.value.appendChild(renderer.domElement);

  function updateContainerHeight() {
    if (!scrollHeight) return;
    // Convert scene grid height (world units) to px scroll length
    const worldToScreenRatio =
      window.innerHeight /
      (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z);
    const gridHeightInPx = scrollHeight * worldToScreenRatio;

    containerHeight.value = (gridHeightInPx / window.innerHeight) * 100; // in vh
  }

  const targetHeight = 4.5 * 0.56;
  const targetWidth = 4 * 0.56;
  const geometry = new THREE.PlaneGeometry(targetWidth, targetHeight);

  const geometryModal = new THREE.PlaneGeometry(targetWidth, targetHeight);
  const materialModal = new THREE.MeshBasicMaterial({
    color: "red",
    transparent: false,
  });

  const objectModal = new THREE.Mesh(geometryModal, materialModal);

  function loadMoreImages() {
    return new Promise((resolve) => {
      console.log("Load more images" + images.length);
      const currentCount = images.length;
      oldTotal = currentCount;
      newImages = Array.from(
        { length: 8 },
        (_, i) => `https://picsum.photos/800/900?random=${currentCount + i + 1}`
      );
      total += newImages.length;
      newImages.forEach((url, index) => {
        const indexDelta = index + grid.children.length;
        const loader = new THREE.TextureLoader();

        console.log("Loading image:", indexDelta);

        let gridsize;

        if (window.innerWidth > 1200) {
          gridsize = 4;
        } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
          gridsize = 3;
        } else if (window.innerWidth < 768) {
          gridsize = 2;
        }

        loader.load(
          url,
          (texture) => {
            texture.encoding = THREE.sRGBEncoding;

            // Sharpen when scaling
            texture.minFilter = THREE.LinearFilter; // avoids too soft mipmaps
            texture.magFilter = THREE.NearestFilter; // or THREE.LinearFilter for smoother look
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // huge sharpness boost

            // Force update
            texture.needsUpdate = true;

            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
            });

            const mesh = new THREE.Mesh(geometry, material);

            setGridPosition(indexDelta, gridsize, mesh, itemGapX, itemGapY);
            mesh.userData.text =
              "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";
            grid.add(mesh);
            loadedCount++;

            if (loadedCount === total) {
              const { height } = getGridSize();

              scrollHeight = height; // set scroll height based on grid size
              loadingMore = false;
              updateContainerHeight();
              createScrollAnimation();
              ScrollTrigger.refresh();
              resolve();
            }
          },
          undefined,
          (err) => {
            console.error("Error loading texture:", err);
          }
        );
      });
    });
  }

  function updateGridPosition(gridsize) {
    if (currendGrid !== gridsize) {
      grid.children.forEach((obj, index) => {
        setGridPosition(index, gridsize, obj, itemGapX, itemGapY);
      });
      const { width, height } = getGridSize();
      const { width: objectWidth } = getObjectSize(grid.children[0]);
      grid.position.x = -width / 2 + objectWidth / 2; // center the grid
      scrollHeight = height; // set scroll height based on grid size
      currendGrid = gridsize;
    }
  }

  images.forEach((url, index) => {
    const loader = new THREE.TextureLoader();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    let gridsize;

    if (window.innerWidth > 1200) {
      gridsize = 4;
    } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
      gridsize = 3;
    } else if (window.innerWidth < 768) {
      gridsize = 2;
    }

    loader.load(
      url,
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;

        // Sharpen when scaling
        texture.minFilter = THREE.LinearFilter; // avoids too soft mipmaps
        texture.magFilter = THREE.NearestFilter; // or THREE.LinearFilter for smoother look
        //texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // huge sharpness boost

        // Force update
        texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.text =
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";

        setGridPosition(index, gridsize, mesh, itemGapX, itemGapY);

        grid.add(mesh);
        loadedCount++;

        if (loadedCount === total) {
          const { width, height } = getGridSize();
          const { width: objectWidth } = getObjectSize(grid.children[0]);
          grid.position.x = -width / 2 + objectWidth / 2; // center the grid
          console.log(grid.position.x);
          console.log(width / 2);
          console.log((objectWidth * gridsize) / 2);
          console.log((itemGapX - objectWidth) / 2);

          scrollHeight = height; // set scroll height based on grid size

          console.log("Initial load complete, scrollHeight:", scrollHeight);
          console.log("Grid size:", width, height);

          createScrollAnimation();
          loadingMore = false;
          ScrollTrigger.refresh();
        }
      },
      undefined,
      (err) => {
        console.error("Error loading texture:", err);
      }
    );
  });

  function scrollDown(amount = 100, duration = 0.5) {
    if (!scrollerModal.value) return;
    gsap.to(scrollerModal.value, {
      scrollTop: scrollerModal.value.scrollTop + amount,
      duration: duration,
      ease: "power2.out",
    });
  }

  grid.position.set(0, 0, 0);
  scene.add(objectModal);

  const { width: modalWidth, height: modalHeight } = getObjectSize(objectModal);
  objectModal.material.visible = true;
  objectModal.material.transparent = true;
  objectModal.material.opacity = 1;
  objectModal.raycast = () => {};

  objectModal.position.set(0, 10, -0.01);
  scene.add(grid);

  grid.position.x =
    modalWidth * currendGrid * itemGapX * (currendGrid - 1) - modalWidth / 2; // center the grid
  grid.position.y = modalHeight / 2; // center the grid vertically

  camera.position.z = 6;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getGridSize() {
    const box = new THREE.Box3().setFromObject(grid);
    const size = box.getSize(new THREE.Vector3());
    return {
      width: size.x,
      height: size.y,
    };
  }

  function getObjectSize(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    return {
      width: size.x,
      height: size.y,
    };
  }

  function getObjectPosition(obj) {
    const pos = new THREE.Vector3();
    obj.getWorldPosition(pos);
    return pos;
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (window.innerWidth > 1200) {
      updateGridPosition(4);
    } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
      updateGridPosition(3);
    } else if (window.innerWidth < 768) {
      updateGridPosition(2);
    }

    renderer.setSize(window.innerWidth, window.innerHeight);

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateContainerHeight();
      createScrollAnimation();
      ScrollTrigger.refresh();
    }, 200);
  });

  function createScrollAnimation() {
    if (scrollTween) scrollTween.kill();
    scrollTween = gsap.to(grid.position, {
      y: scrollHeight,
      ease: "none",
      scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          if (self.progress > 0.7 && !loadingMore) {
            loadingMore = true;
            loadMoreImages().then(() => {
              ScrollTrigger.refresh();
            });
          }
        },
      },
    });
  }

  let activObject = false;
  let img = null;

  Observer.create({
    target: renderer.domElement,
    type: "pointer",
    onClick(ev) {
      const e = ev.event || ev;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (activObject && img) {
        // 🔹 CLOSE
        const snap = img.userData.snapshot;
        const targetWorld = snap.grid.localToWorld(snap.position.clone());

        const tl = gsap.timeline({
          onComplete: () => {
            snap.grid.add(img);

            // restore index order
            if (snap.grid.children.length - 1 !== snap.index) {
              snap.grid.children.splice(
                snap.index,
                0,
                snap.grid.children.pop()
              );
            }

            img.position.copy(snap.position);
            img.quaternion.copy(snap.quaternion);
            img.scale.copy(snap.scale);
            img.userData.snapshot = null;

            activObject = false;
            textImage.value = null;
            isModalOpen.value = false;
            enableScroll();
          },
        });

        tl.to(
          objectModal.position,
          {
            x: targetWorld.x,
            y: targetWorld.y,
            z: targetWorld.z,
            duration: 0.3,
            ease: "power2.inOut",
          },
          0
        )
          .to(
            objectModal.scale,
            {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.3,
              ease: "power2.inOut",
            },
            0
          )
          .to(
            img.position,
            {
              x: targetWorld.x,
              y: targetWorld.y,
              z: targetWorld.z,
              duration: 0.3,
              ease: "power2.inOut",
            },
            0
          )
          .to(
            img.scale,
            {
              x: snap.scale.x,
              y: snap.scale.y,
              z: snap.scale.z,
              duration: 0.3,
              ease: "power2.inOut",
            },
            0
          );
      } else {
        // 🔹 OPEN
        disableScroll();
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects([scene], true);
        if (!hits.length) return;

        img = hits[0].object;

        isModalOpen.value = true;
        textImage.value = img.userData.text;

        // snapshot original
        img.userData.snapshot = {
          grid,
          index: grid.children.indexOf(img),
          position: img.position.clone(),
          quaternion: img.quaternion.clone(),
          scale: img.scale.clone(),
        };

        // keep transform when reparenting
        scene.attach(img);

        objectModal.position.copy(getObjectPosition(img));

        // target world position in front of camera
        const d = Math.max(camera.near + 0.5, 1);
        const targetPos = new THREE.Vector3(0, 0, -d).applyMatrix4(
          camera.matrixWorld
        );

        // viewport dimensions at distance d
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const visibleH = 2 * Math.tan(vFOV / 2) * d;
        const visibleW = visibleH * camera.aspect;

        // scale object to ~50% screen
        const box = new THREE.Box3().setFromObject(img);
        const size = new THREE.Vector3();
        box.getSize(size);

        const s =
          Math.min(
            visibleW / Math.max(size.x, 1e-6),
            visibleH / Math.max(size.y, 1e-6)
          ) * 0.999;

        // modal scaling
        const scaleX = (modalWidth / visibleW) * 2;
        const scaleY = modalHeight / visibleH;

        const positionXLeft = -visibleW / 2 + size.x * s * 0.5 * 1.0009;
        const positionXRight = visibleW / 2 - size.x * s * 0.5 * 1.0009;

        const positionX =
          img.position.x === 0
            ? Math.random() > 0.5
              ? positionXLeft
              : positionXRight
            : img.position.x < 0
            ? positionXRight
            : positionXLeft;

        const tl = gsap.timeline();
        tl.to(
          img.position,
          {
            x: positionX,
            y: targetPos.y,
            z: targetPos.z,
            duration: 0.6,
            ease: "power2.inOut",
          },
          0
        )
          .to(
            img.scale,
            {
              x: s,
              y: s,
              z: s,
              duration: 0.6,
              ease: "power2.inOut",
            },
            0
          )
          .to(
            objectModal.position,
            {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
              duration: 0.6,
              ease: "power2.inOut",
            },
            0
          )
          .to(
            objectModal.scale,
            {
              x: scaleX,
              y: scaleY,
              z: 1,
              duration: 0.6,
              ease: "power2.inOut",
            },
            0
          );
        gsap.to(scrollerModal.value, {
          bottom: 50, // or '10%' to your liking
          duration: 1,
          ease: "power2.out",
        });

        activObject = true;
      }
    },
  });

  function animate() {
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
});
</script>

<style scoped>
.three-container {
  position: fixed; /* stays pinned */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-content {
  position: fixed;
  bottom: -100%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  max-height: 60vh; /* limits the height */
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-text-wrapper {
  overflow-y: auto; /* enable scroll */
  flex: 1; /* takes all remaining vertical space */
  padding: 20px;
}
</style>
