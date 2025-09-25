<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">EDITMODE</div>
      <div class="row">
        <div class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3">
          adsdfsdf
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted } from "vue";
import { editmodeCameraShift } from "~/composables/screenplay.js";
definePageMeta({
  layout: "three",
});

let  $three ;

onMounted(async () => {
  
  if (import.meta.dev) {
    const mod = await import("~/composables/threeDev.js"); // path to your function-based file
    const devScene = await mod.init(true, true); // returns { scene, camera, renderer, controls, backgroundSphere, animateObjects }

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

  if ($three.controls) {
    $three.controls.enableRotate = true;
    $three.controls.enableZoom = true;
    $three.controls.enablePan = true;
    $three.controls.dampingFactor = 0.05;
    $three.controls.update();
  }
  

});
</script>

<style scoped>
.links-a {
  padding: 0;
  border: none;
  margin-bottom: 1rem;
}
</style>
