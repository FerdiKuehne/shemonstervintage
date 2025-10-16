<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">CONTACT</div>
    </div>
    <div>
      <div class="container">
        <div class="row">
          <div
            class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3"
          >
            <div class="text-start">
              <!--<h2 class="mt-4 mb-4 bold">{{ $t("nav.kontakt") }}</h2>-->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { contactCameraShift } from "~/composables/screenplay.js";
import { onMounted, nextTick } from "vue";
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
    contactCameraShift($three.camera, $three.passAMat, $three.controls);
  } else {
    $three = useNuxtApp().$three;
    await $three.ready;
    contactCameraShift($three.camera, $three.passAMat, $three.controls);
  }
});
</script>

