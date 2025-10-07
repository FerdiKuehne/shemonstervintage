<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">PRIVACY POLICY</div>
      <div class="row">
        <div
          class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3"
        >
          <div class="text-start">
            <h2 class="mt-4 mb-4 bold">{{ $t("privacyPolicy") }}</h2>
            <h3 class="mt-4">{{ $t("headerDs1") }}</h3>
            <p>{{ $t("bodyDs1") }}</p>
            <h3 class="mt-4">{{ $t("headerDs2") }}</h3>
            <p>{{ $t("bodyDs2") }}</p>
            <h3 class="mt-4">{{ $t("headerDs3a") }}</h3>
            <h4 class="mt-3">{{ $t("headerDs3b") }}</h4>
            <p>{{ $t("bodyDs3") }}</p>
            <h3 class="mt-4">{{ $t("headerDs4") }}</h3>
            <p>{{ $t("bodyDs4") }}</p>
            <h3 class="mt-4">{{ $t("headerDs5") }}</h3>
            <p>{{ $t("bodyDs5") }}</p>
            <h3 class="mt-4">{{ $t("headerDs6") }}</h3>
            <p>{{ $t("bodyDs6") }}</p>
            <h3 class="mt-4">{{ $t("headerDs7") }}</h3>
            <p>{{ $t("bodyDs7") }}</p>
            <h3 class="mt-4">{{ $t("headerDs8") }}</h3>
            <p>{{ $t("bodyDs8") }}</p>
            <h3 class="mt-4">{{ $t("headerDs9") }}</h3>
            <p>{{ $t("bodyDs9") }}</p>
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
  if (import.meta.dev) return;
  await $three.ready;

  $three.addAnimatedCallback("sphere", (delta) => {
    if ($three.backgroundSphere) {
      $three.backgroundSphere.position.x += delta;
    }
  });
});
</script>
