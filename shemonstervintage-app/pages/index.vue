<script setup>
import { onMounted } from "vue";
definePageMeta({
  layout: "three",
});

const { $three } = useNuxtApp();

onMounted(async () => {
  // wait until scene is ready


  await $three.ready;

  $three.addAnimatedCallback("sphere", (delta) => {
    if ($three.backgroundSphere) {
      $three.backgroundSphere.rotation.y += delta;
    }
  });
});
</script>

<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">HOME</div>
    </div>
  </div>
</template>
