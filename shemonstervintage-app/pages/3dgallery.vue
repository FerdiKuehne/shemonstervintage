<template>

  <div id="ui">
    <label class="btn" for="picker">Panorama wählen</label>
    <input id="picker" type="file" accept="image/*" />
  </div>

  <div id="scroll-container" :style="{ height: containerHeight + 'vh' }">
    <div ref="threeContainer" class="three-container"></div>
    <div
      ref="scrollerModal"
      class="modal-wrapper"
      :class="{ open: isModalOpen }"
    >
      <button class="close-modal" @click="closeObject">x</button>
      <div class="modal-content">
        <div>
          <div class="modal-text">
            {{ textImage }}
          </div>
        </div>
        <div class="modal-buttons">
          <button>add to wishlist</button>
        </div>
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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

gsap.registerPlugin(Observer);
gsap.registerPlugin(ScrollTrigger);

const threeContainer = ref(null);
const containerHeight = ref(250);
const isModalOpen = ref(false);
const textImage = ref(null);
const scrollerModal = ref(null);

let currendGrid;
let img = null;
let objectModal;

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
let grid;
let loadedCount = 0;
let total = images.length;

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

function closeObject() {
  // 🔹 CLOSE
  const snap = img.userData.snapshot;
  const targetWorld = snap.grid.localToWorld(snap.position.clone());

  const tl = gsap.timeline({
    onComplete: () => {
      snap.grid.add(img);

      // restore index order
      if (snap.grid.children.length - 1 !== snap.index) {
        snap.grid.children.splice(snap.index, 0, snap.grid.children.pop());
      }

      img.position.copy(snap.position);
      img.quaternion.copy(snap.quaternion);
      img.scale.copy(snap.scale);
      img.userData.snapshot = null;

      textImage.value = null;
      isModalOpen.value = false;
      objectModal.rotation.x = 0;
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
}


let currentObjectURL;

onMounted(() => {

  // Upload Handling
  document.getElementById('picker').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (file) loadPanoramaFromFile(file);
  });

  function loadPanoramaFromFile(file) {
    if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = URL.createObjectURL(file);

    const img = new Image();
    img.onload = () => applyTexture(img);
    img.onerror = () => alert('Konnte Bild nicht laden.');
    img.src = currentObjectURL;
  }




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

  const geom = new THREE.SphereGeometry(500, 60, 40);
  geom.scale(-1, 1, 1);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const sphere = new THREE.Mesh(geom, mat);
  scene.add(sphere);


  function applyTexture(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img,0,0);
    const tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    sphere.material.map = tex;
    sphere.material.needsUpdate = true;
    console.log('Texture applied:', canvas.width + 'x' + canvas.height);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  grid = new THREE.Group();
  threeContainer.value.appendChild(renderer.domElement);

  function updateContainerHeight() {
    if (!scrollHeight) return;
    // Convert scene grid height (world units) to px scroll length
    console.log("Update container height", scrollHeight);
    const worldToScreenRatio =
      window.innerHeight /
      (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z);
    const gridHeightInPx = scrollHeight * worldToScreenRatio;
    containerHeight.value = (gridHeightInPx / window.innerHeight) * 100 + 20; // in vh
  }


  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom    = false;
  controls.update();

  const targetHeight = 4.5 * 0.56;
  const targetWidth = 4 * 0.56;
  const geometry = new THREE.PlaneGeometry(targetWidth, targetHeight);

  const geometryModal = new THREE.PlaneGeometry(targetWidth, targetHeight);
  const materialModal = new THREE.MeshBasicMaterial({
    color: "red",
    transparent: false,
  });

  objectModal = new THREE.Mesh(geometryModal, materialModal);

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




            //SHADER
            const material = new THREE.ShaderMaterial({
              uniforms: {
                uTexture: { value: texture },
                uShiftAmount: { value: 0.05 }, // max shift
                uVelocity: { value: new THREE.Vector3() }, // movement vector
              },
              vertexShader: `
    varying vec2 vUv;
    varying vec3 vVelocity;
    uniform vec3 uVelocity;

    void main() {
      vUv = uv;
      vVelocity = uVelocity; // pass velocity to fragment shader
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
              fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uShiftAmount;
    varying vec2 vUv;
    varying vec3 vVelocity;

    void main() {
      // compute shift based on velocity magnitude
      float shift = clamp(length(vVelocity.xy) * uShiftAmount, 0.0, uShiftAmount);

      vec2 uvR = vUv + vec2( shift, 0.0);
      vec2 uvG = vUv;
      vec2 uvB = vUv - vec2( shift, 0.0);

      vec4 colorR = texture2D(uTexture, uvR);
      vec4 colorG = texture2D(uTexture, uvG);
      vec4 colorB = texture2D(uTexture, uvB);

      gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, colorG.a);
    }
  `,
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
              console.log("All new images loaded", height);
              loadingMore = false;

              updateContainerHeight();

              ScrollTrigger.refresh();
              createScrollAnimation();
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

            // Three.js: ShaderMaterial für Vortex-Maske
            const material = new THREE.ShaderMaterial({
              uniforms: {
                uTexture: { value: texture },   // THREE.Texture
                uShiftAmount: { value: 1.05 }, // max shift
                uCenter:    { value: new THREE.Vector2(0.5, 0.5) }, // Zentrum in UV (0..1)
                uVelocity: { value: new THREE.Vector3() }, // movement vector
                uRadius:    { value: 0.35 },                   // Maskenradius in UV
                uFeather:   { value: 0.02 },                   // weiche Kante
                uStrength:  { value: 2.5 },                    // Wirbelstärke (Radians max)
              },
              vertexShader: `
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                precision highp float;

                uniform sampler2D uTexture;
                uniform vec2  uCenter;
                uniform float uRadius;
                uniform float uFeather;
                uniform float uStrength;

                varying vec2 vUv;

                // rotiert "p" um "angle" um den Ursprung
                vec2 rotate(vec2 p, float angle) {
                  float s = sin(angle), c = cos(angle);
                  return mat2(c, -s, s, c) * p;
                }

                void main() {
                  // Abstand vom Zentrum in UV
                  float d = distance(vUv, uCenter);

                  // --- Maske ---
                  // weicher Maskenwert: 1 innen, 0 außen
                  float mask = 1.0 - smoothstep(uRadius - uFeather, uRadius, d);

                  // Optional harte Kante: wenn du wirklich *nichts* außerhalb zeichnen willst,
                  // nutze discard (spart Fill, aber bricht Transparenz/Blending an der Kante hart ab):
                  // if (d > uRadius) discard;

                  // --- Vortex / Swirl ---
                  // Winkel-Offset nimmt zur Kante hin ab (0 am Rand, max in der Mitte)
                  float t = clamp(1.0 - d / uRadius, 0.0, 1.0);
                  float angle = uStrength * t * t; // easing (quadratisch) für glatteren Verlauf

                  // wirbeln um uCenter
                  vec2 offset = vUv - uCenter;
                  vec2 uvSwirled = uCenter + rotate(offset, angle);

                  // außerhalb des Radius bleiben die UV unverändert (optional):
                  uvSwirled = mix(vUv, uvSwirled, step(d, uRadius));

                  vec4 tex = texture2D(uTexture, uvSwirled);

                  // weiche Maskierung über Alpha
                  gl_FragColor = vec4(tex.rgb, tex.a * mask);
                }
              `,
              transparent: true,           // wichtig für Alpha-Maskierung
              depthWrite: false,           // oft sinnvoll bei halbtransparenter Kante
              // alphaTest: 0.5,           // optional: wenn du harte Kante via Alpha willst (keine Blending-Halbkanten)
            });



        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.text =
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";

        setGridPosition(index, gridsize, mesh, itemGapX, itemGapY);

        grid.add(mesh);
        loadedCount++;

        if (loadedCount === total) {
          scene.updateMatrixWorld(true);
          grid.updateWorldMatrix(true, true);

          const { width, height } = getGridSize();
          const { width: objectWidth } = getObjectSize(grid.children[0]);
          grid.position.x = -width / 2 + objectWidth / 2; // center the grid

          scrollHeight = height * 1.3; // set scroll height based on grid size

          updateContainerHeight();
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
      ScrollTrigger.refresh();
    }, 200);
  });

  function createScrollAnimation() {
    if (scrollTween) {
      scrollTween.scrollTrigger.kill();
      scrollTween.kill();
    }

    updateContainerHeight();

    // Convert world grid height → px scroll length
    const worldToScreenRatio =
      window.innerHeight /
      (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z);
    const gridHeightInPx = scrollHeight * worldToScreenRatio;

    console.log("Create scroll animation with gridHeightInPx:", gridHeightInPx);

    scrollTween = gsap.to(grid.position, {
      y: scrollHeight,
      ease: "none",
      scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "+=" + gridHeightInPx,
        scrub: true,
        onUpdate: (self) => {
          console.log("Scroll progress:", self.progress);
          if (self.progress > 0.4 && !loadingMore) {
            loadingMore = true;
            loadMoreImages().then(() => {
              ScrollTrigger.refresh();
            });
          }
        },
      },
    });
  }

  Observer.create({
    target: renderer.domElement,
    type: "pointer",
    onClick(ev) {
      const e = ev.event || ev;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      console.log("click");

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

          img.material.depthTest = false;
          img.material.depthWrite = false;
          img.renderOrder = 1; // höher als objectModal

      const tl = gsap.timeline();
      tl.to(
        img.position,
        {
          x: positionX,
          y: targetPos.y,
          z: targetPos.z,
          duration: 2.6,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        img.rotation,
        {
          x: 2 * Math.PI,
          duration: 2.6,
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
            duration: 2.6,
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
            duration: 2.6,
            ease: "power2.inOut",
          },
          0
        )
        .to(
          objectModal.rotation,
          {
            x: 2 * Math.PI,
            duration: 2.6,
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
            duration: 2.6,
            ease: "power2.inOut",
          },
          0
        );
    },
  });

  let prevPosition = new THREE.Vector3();

  function animate() {
    if (img) {
      const velocity = new THREE.Vector3().subVectors(
        img.position,
        prevPosition
      );
      img.material.uniforms.uVelocity.value.copy(velocity);
      prevPosition.copy(img.position);
    }

    controls.update();
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

.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  padding: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  display: none;
  opacity: 0;
  pointer-events: none;
}
@media screen and (max-width: 768px) {
  .modal-wrapper {
    padding: 100vh 0 0 0;
  }
}

.modal-wrapper.open {
  pointer-events: all;
  display: block;
  animation: fade-in 0.3s forwards;
  animation-delay: 0.5s;
}
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.modal-content {
  width: 50%;
  height: 100vh;
  padding: 20px;
  background-color: #fff;
}
@media screen and (max-width: 768px) {
  .modal-content {
    width: 100%;
  }
}

.close-modal {
  width: 48px;
  height: 48px;
  position: absolute;
  bottom: 1rem;
  left: 50%;
  z-index: 1;
  transform: translate(-50%, 0);
}



#ui  { position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:10;
       background:rgba(12,16,22,.7); border:1px solid rgba(255,255,255,.12);
       border-radius:10px; padding:8px 10px; display:flex; gap:10px; align-items:center; }
.btn { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.25);
       color:#fff; padding:7px 12px; border-radius:8px; cursor:pointer; font-weight:600; }
input[type="file"] { display:none; }
</style>
