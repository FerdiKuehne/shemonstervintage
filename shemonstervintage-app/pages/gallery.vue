<template>
  <div class="container-fluid p-0">
    <div class="page-headline">GALLERY</div>
  </div>
</template>

<script setup>
import { onMounted, watchEffect, ref } from "vue";
import { initGrid, updateContainerHeight } from "@/composables/grid.js";
import { galleryCameraShift } from "~/composables/screenplay.js";

definePageMeta({
  layout: "three",
});

const containerHeight = ref(100); // vh

const { $three } = useNuxtApp();

onMounted(async () => {
  await $three.ready;

  const grid = await initGrid(
    $three.renderer,
    $three.camera,
    containerHeight,
    $three.scroller
  );
  $three.scene.add(grid);

  galleryCameraShift($three.camera);
});
</script>

<style scoped></style>
