<script setup>
import { onMounted, nextTick } from "vue";
import { homeCameraShift } from "~/composables/screenplay.js";

definePageMeta({
  layout: "three",
});

let $three;

onMounted(async () => {

  if (!import.meta.dev) {
    $three = useNuxtApp().$three;
    await $three.ready;
    await nextTick();
    homeCameraShift($three.camera);
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
