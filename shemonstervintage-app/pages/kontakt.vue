<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">CONTACT</div>
      <div class="row">
        <div
          class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3"
        >
          <div class="text-start">
            <h2 class="mt-4 mb-4 bold">{{ $t("nav.kontakt") }}</h2>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
definePageMeta({
  layout: "three",
});
const { $three } = useNuxtApp();

onMounted(async () => {
  // wait until scene is ready

  console.log(
    "Gallery page mounted, waiting for Three.js scene to initialize...",
    $three.initialized
  );
  await $three.ready;

  $three.addAnimatedCallback("sphere", (delta) => {
    if ($three.backgroundSphere) {
      $three.backgroundSphere.position.y -= delta;
    }
  });
});
</script>
