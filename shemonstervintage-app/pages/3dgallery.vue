<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">GALLERY</div>
    </div>
    <div ref="threeContainer" class="three-container"></div>
    <button class="enter-btn" @click="moveCamera">{{ buttonText }}</button>
  </div>
</template>

<script setup>

import { onMounted, ref } from "vue";
import { Scene, PerspectiveCamera, WebGLRenderer } from "three";
import { createBackgroundSphereFromAPI } from "@/composables/backgroundsphere.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from "gsap";


const threeContainer = ref(null);
const buttonText = ref("Enter");
let camera, controls, cameraTween, sphere;

function moveCamera() {
  if (!camera || !controls) return;
  if (cameraTween) cameraTween.kill();

  const goingIn = buttonText.value === "Enter"; // true when zooming in
  const targetZ = goingIn ? 5 : 50;
  buttonText.value = goingIn ? "Back" : "Enter";

  const startTime = performance.now();

  // Camera tween
  cameraTween = gsap.to(camera.position, {
    duration: 1,
    z: targetZ,
    x: 0,
    y: 0,
    ease: "power2.inOut",
    onUpdate: () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      sphere.material.uniforms.uTime.value = elapsed;
      controls.update();
    },
    onStart: () => {
      // Warp up when entering
      gsap.to(sphere.material.uniforms.uAmplitude, {
        value: 1.0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    },
    onComplete: () => {
      // Warp fade + reset uTime
      gsap.to(sphere.material.uniforms.uAmplitude, {
        value: 0.0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          sphere.material.uniforms.uTime.value = 0.0; // reset warp phase
        },
      });
      camera.position.x = 0;
      camera.position.y = 0;
    },
  });
}

onMounted(async () => {
  if (!threeContainer.value) return;

  const scene = new Scene();
  sphere = await createBackgroundSphereFromAPI(window.devicePixelRatio || 1);

  const renderer = new WebGLRenderer({ antialias: true });
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  camera.position.z = 50;

  renderer.setSize(window.innerWidth, window.innerHeight);
  threeContainer.value.appendChild(renderer.domElement);

  scene.add(sphere);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
});
</script>

<style scoped>


</style>
