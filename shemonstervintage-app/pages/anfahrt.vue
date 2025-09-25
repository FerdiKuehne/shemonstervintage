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

const { $three } = useNuxtApp();

onMounted(async () => {
if (import.meta.dev) return;
  await $three.ready;
  await nextTick();
  locationCameraShift($three.camera);

});
</script>
