<template>
  
  <!--
   <div class="logo">SHEMONSTER</div>
    <header>
    <ul class="main-nav">
      <li @click="moveCamera"><span class="num">01</span> Home</li>
      <li>
        <NuxtLink to="/"><span class="num">02</span> About</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/gallery"><span class="num">03</span> Gallery</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/anfahrt"><span class="num">04</span> Location</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/kontakt"><span class="num">05</span> Contact</NuxtLink>
      </li>
    </ul>
  </header>
  -->
 
  


  <div id="app">
    <div id="scroller" ref="scroller" class="scroller">
      <div id="three-root" class="three-container"></div>
    </div>
  <!--
      <button class="enter-btn" @click="moveCamera">{{ buttonText }}</button>
    <NuxtLayout />
  
  -->  
    <NuxtLayout />
  </div>

  <footer>
    <ul class="footer-nav">
      <li><NuxtLink to="/Datenschutz">Privacy Policy</NuxtLink></li>
      <li><NuxtLink to="/impressum">Imprint </NuxtLink></li>
      <li><NuxtLink to="/test">test reset</NuxtLink></li>
    </ul>
  </footer>
</template>

<script setup>
import gsap from "gsap";
import { onMounted, ref } from "vue";
const scroller = ref(null);

const buttonText = ref("Enter");
let cameraTween = null;

let $three = null;

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
  if (!import.meta.dev) {
    $three = useNuxtApp().$three;

    console.log("App mounted, initializing Three.js scene...");

    console.log("Dev mode:", import.meta.dev);

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
      $three.setScroller(scroller.value);
    }
  }
});
</script>

<style scoped>
*,
*:after,
*:before {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.logo {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  font-size: 1.5rem;
  font-weight: bolder;
  color: #000;
  letter-spacing: -1.5px;
}

header {
  position: fixed;
  top: 50%;
  left: 1rem;
  z-index: 20;
  transform: translate(0, -50%);
}

ul.main-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}

ul.main-nav li {
  cursor: pointer;
  min-width: 300px;
  display: block;
  text-transform: uppercase;
  font-size: 1rem;
  font-weight: bolder;
  color: #000;
  line-height: 2rem;
  transition: font-size 0.3s, line-height 0.3s;
}

ul.main-nav li:hover {
  font-size: 5rem;
  line-height: 5rem;
  transition: font-size 0.3s, line-height 0.3s;
}

ul.main-nav li .num {
  display: inline-block;
  font-size: 1rem;
  transform: translate(0, 0);
  transition: font-size 0.3s, transform 0.3s;
}

ul.main-nav li:hover .num {
  font-size: 2rem;
  transform: translate(0, -33px);
  transition: font-size 0.3s, transform 0.3s;
}

ul.main-nav li a {
  color: #000;
  text-decoration: none;
}

ul.main-nav li:hover:after {
  content: "_";
  animation: blink 0.3s infinite;
}
@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}


.scroller {
  height: 200vh;        /* enough content to scroll */
  overflow-y: auto;     /* enable scrolling */
  overflow-x: hidden;
  position: relative;   /* relative positioning */
  z-index: 0;           /* above the canvas */
}

.three-container {
  pointer-events: auto;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;  
  height: 100%;
  z-index: 0;
  background: transparent;
}

footer {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
}

ul.footer-nav {
  display: flex;
  list-style: none;
}

ul.footer-nav li {
  margin: 0 0.5rem;
}

ul.footer-nav li:first-child {
  margin: 0 0.5rem 0 0;
}

ul.footer-nav li a {
  font-size: 0.8rem;
  text-decoration: none;
  color: #000;
  display: block;
}



.enter-btn {
  position: absolute;
  left: 50%;
  bottom: 2rem;
  transform: translate(-50%, 0);
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

<style>
.page-headline {
  position: fixed;
  color: #000;
  padding: 1.25rem 1rem 0 170px;
}
</style>
