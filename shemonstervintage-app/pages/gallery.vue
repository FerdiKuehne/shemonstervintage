<template>
  <div class="container-fluid p-0">
    <div class="page-headline">GALLERY</div>
    <transition name="fade-img">
      <ImgDescription
        v-if="imagesDescription"
        :image-side="imagesDescription.side"
        :images-description="imagesDescription.description"
        :images-url="imagesDescription.url"
        :images-on-click="imagesDescription.onClick"
      />
    </transition>
  </div>
</template>

<script setup>
import { onMounted, watchEffect, ref } from "vue";
import { initGrid, updateContainerHeight } from "@/composables/grid.js";
import { galleryCameraShift } from "~/composables/screenplay.js";
import { scrollerRef } from "@/composables/scroller.js";
import ImgDescription from "~/components/imgDescription.vue";
import { imagesDescription } from "~/composables/refsHelper.js";

definePageMeta({
  layout: "three",
});

const containerHeight = ref(100); // vh

let $three, grid;

onMounted(async () => {
  const dpr = Math.round(window.devicePixelRatio || 1);
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

  grid = await initGrid(
    $three.scene,
    dpr,
    $three.renderer,
    $three.camera,
    containerHeight,
    scrollerRef
  );

  $three.camera.position.set(0, 0, 4);

  $three.scene.add(grid);
});

onBeforeUnmount(() => {
  if (grid) {
    $three.scene.remove(grid);
    if (Array.isArray(grid.material)) {
      grid.material.forEach((mat) => mat.dispose());
    }
  }
  // Clean up if necessary
});
</script>

<style scoped>
/* Wishlist (wie gehabt) */
.fade-img-enter-active,
.fade-img-leave-active {
  transition: opacity 0.5s ease;
  will-change: opacity;
}

.fade-img-enter-from,
.fade-img-leave-to {

  opacity: 0;
}

.fade-img-enter-to,
.fade-img-leave-from {

  opacity: 1;
}
</style>
