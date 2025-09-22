<template>
  <header>
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/impressum">impressu ↑ </NuxtLink>
    <NuxtLink to="/kontakt">kontakt ↓ </NuxtLink>
    <NuxtLink to="/anfahrt">anfahrt ← </NuxtLink>
    <NuxtLink to="/Datenschutz">Datenschutz → </NuxtLink>
    <NuxtLink to="/gallery">gallery</NuxtLink>
    <NuxtLink to="/test">test reset</NuxtLink>
  </header>

  <div id="app">
    <div ref="scroller" class="scroller" id="scroller">
      <div id="three-root" class="three-container"></div>
    </div>
    <button class="enter-btn" @click="moveCamera">{{ buttonText }}</button>
    <NuxtLayout />
  </div>
</template>

<script setup>
import gsap from "gsap";
import { onMounted, ref } from "vue";
const scroller = ref(null);
const { $three } = useNuxtApp();
const buttonText = ref("Enter");
let cameraTween = null;

// Helper to safely get Three.js objects
function getThreeObjects() {
  const camera = $three.camera;
  const controls = $three.controls;
  const sphere = $three.backgroundSphere;
  return { camera, controls, sphere };
}

function moveCamera() {
  const { camera, controls, sphere } = getThreeObjects();
  if (!camera || !controls || !sphere) return;
  if (cameraTween) cameraTween.kill();

  const goingIn = buttonText.value === "Enter"; // true when zooming in
  const targetZ = goingIn ? 5 : 50;
  buttonText.value = goingIn ? "Back" : "Enter";

  const startTime = performance.now();

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
      gsap.to(sphere.material.uniforms.uAmplitude, {
        value: 1.0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    },
    onComplete: () => {
      gsap.to(sphere.material.uniforms.uAmplitude, {
        value: 0.0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          sphere.material.uniforms.uTime.value = 0.0;
        },
      });
      camera.position.x = 0;
      camera.position.y = 0;
    },
  });
}

onMounted(async () => {
  console.log('App mounted, initializing Three.js scene...');

  await $three.init();

  if ($three.controls) {
    $three.controls.enableRotate = true;
    $three.controls.enableZoom = true;
    $three.controls.enablePan = true;
    $three.controls.enableDamping = true;
    $three.controls.dampingFactor = 0.05;
    $three.controls.update();
  }
  if (scroller.value) {
    $three.setScroller(scroller.value)
  }

});
</script>

<style scoped>
header {
  position: relative;
  z-index: 10;
  padding: 1rem;
  color: white;
  background: rgba(0,0,0,0.5);
}

.three-container {
  pointer-events: auto; 
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: black;
}

.enter-btn {
  position: absolute;
  left: 50%;
  top: 70%;
  transform: translate(-50%, 30px);
  z-index: 10;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: background 0.2s;
}

.enter-btn:hover {
  background-color: rgba(255, 255, 255, 1);
}
</style>
