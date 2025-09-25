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

const { $three } = useNuxtApp();

onMounted(async () => {
  // wait until scene is ready

  await $three.ready;


});
</script>

<style scoped>
.links-a {
  padding: 0;
  border: none;
  margin-bottom: 1rem;
}
</style>
