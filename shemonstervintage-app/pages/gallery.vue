<template>
  <div class="container-fluid p-0">
    <div class="page-headline">GALLERY</div>
  </div>
</template>

<script setup>
import { onMounted, watchEffect, ref } from "vue";
import { initGrid, updateContainerHeight } from "@/composables/grid.js";
import { galleryCameraShift } from "~/composables/screenplay.js";
import { scrollerRef } from "@/composables/scroller.js";


definePageMeta({
  layout: "three",
});

const containerHeight = ref(100); // vh

let $three;

onMounted(async () => {
  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js"); // path to your function-based file
    const devScene = await mod.init(false, false, false, false, false); // returns { scene, camera, renderer, controls, backgroundSphere, animateObjects }

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

    const grid = await initGrid(
      $three.renderer,
      $three.camera,
      containerHeight,
      scrollerRef
    );

    $three.scene.add(grid);


});
</script>

<style scoped></style>
