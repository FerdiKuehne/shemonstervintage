<template>
  <div>
    <div class="container mt-5">
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
import { contactCameraShift } from "~/composables/screenplay.js";
import { onMounted,nextTick } from "vue";
definePageMeta({
  layout: "three",
});
const { $three } = useNuxtApp();

onMounted(async () => {
  await $three.ready;
  await nextTick();
  contactCameraShift($three.camera);
});
</script>
