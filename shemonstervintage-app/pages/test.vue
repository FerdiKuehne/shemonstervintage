<template>
  <div class="container-fluid p-0">
    <div class="page-headline">TEST</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";

definePageMeta({
  layout: "three",
});

const { $three } = useNuxtApp();

onMounted(async () => {
  // wait until scene is ready

  await $three.ready;
  $three.backgroundSphere.position.set(0, 0, 0);
  $three.removeAllAnimatedCallbacks();

  clearInterval(interval);
});

onMounted(async () => {
  console.log("Gallery page mounted, waiting for Three.js...");
  if (!import.meta.dev) {
    await $three.ready;

    const grid = await initGrid(
      $three.renderer,
      $three.camera,
      containerHeight,
      $three.scroller
    );
    $three.scene.add(grid);

    $three.addAnimatedCallback("sphere", (delta) => {
      if ($three.backgroundSphere) {
        $three.backgroundSphere.position.y += delta;
      }
    });
  }
});
</script>
