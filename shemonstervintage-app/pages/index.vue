<script setup>
import { onMounted, nextTick } from "vue";
import { homeCameraShift } from "~/composables/screenplay.js";
definePageMeta({
  layout: "three",
});

const { $three } = useNuxtApp();

onMounted(async () => {
  await $three.ready;
  await nextTick();
  homeCameraShift($three.camera);
});
</script>

<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">HOME</div>
    </div>
  </div>
</template>
