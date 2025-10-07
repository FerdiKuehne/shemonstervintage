<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">LOCATION</div>
      <div class="row">
        <div class="col-12">
          <div class="text-start">
            <h2 class="mt-4 mb-4 fw-bold text-center">
              {{ $t("nav.visitUndKontakt") }}
            </h2>
            <AnfahrtUndMap />
            <Openinghours />
            <AnfahrtContact />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import AnfahrtUndMap from "~/components/anfahrt/AnfahrtUndMap.vue";
  import AnfahrtContact from "~/components/anfahrt/AnfahrtContact.vue";
  import Openinghours from "~/components/anfahrt/Openinghours.vue";
  import { onMounted, watchEffect, nextTick } from "vue";
  import { locationCameraShift } from "~/composables/screenplay.js";

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
    locationCameraShift($three.camera, $three.passAMat, $three.controls)

  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
    locationCameraShift($three.camera, $three.passAMat, $three.controls)
  }
  
});

</script>
