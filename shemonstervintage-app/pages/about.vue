<template>
  <div class="about-page">
    <h2>ABOUT</h2>
    <div>About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text About Text Text</div>
  </div>
</template>

<script setup>
import {aboutCameraShift} from "@/composables/screenplay"
definePageMeta({
  layout: "three",
});

let $three;

onMounted(async () => {

  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js"); // path to your function-based file
    const devScene = await mod.init(true, true, false, false, false); // returns { scene, camera, renderer, controls, backgroundSphere, animateObjects }

    // wrap devScene into plugin-like API
    $three = {
      ...devScene,
      init: async () => devScene, // mimic plugin init
      setScroller: (el) => {
        devScene.scroller = el;
      }, // mimic plugin scroller setter
    };
    aboutCameraShift($three.camera, $three.passAMat, $three.controls);
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
    aboutCameraShift($three.camera, $three.passAMat, $three.controls);
  }
  
});
</script>


<style scoped>

.about-page {
  position: fixed;
  top: 50%;
  left: 50%;
  width: calc(50% - 1rem);
}


</style>
