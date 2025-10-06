<script setup>
import { onMounted, nextTick } from "vue";
import { homeCameraShift } from "~/composables/screenplay.js";

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
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
  }
  
});
</script>

<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">HOME</div>
    </div>
  </div>
</template>

