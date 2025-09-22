<template>
  <div class="container mt-5">
    <div>gallery lets goooooooooo</div>
  </div>
</template>

<script setup>
import { onMounted, watchEffect, ref } from "vue";
import { initGrid, updateContainerHeight } from "@/composables/grid.js"; 

definePageMeta({
  layout: 'three'
})

const containerHeight = ref(100); // vh 

const { $three } = useNuxtApp();



onMounted(async () => {
  console.log("Gallery page mounted, waiting for Three.js...")

  await $three.ready;

  const grid = await initGrid($three.renderer, $three.camera, containerHeight, $three.scroller);
  $three.scene.add(grid);

  $three.addAnimatedCallback("sphere", (delta) => {
    if ($three.backgroundSphere) {
      $three.backgroundSphere.position.y += delta;
    }
  })
})

</script>

<style scoped></style>
