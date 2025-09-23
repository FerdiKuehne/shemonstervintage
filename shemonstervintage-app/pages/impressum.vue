<template>
  <div>
    <div class="container-fluid p-0">
      <div class="page-headline">IMPRINT</div>
      <div class="row">
        <div
          class="col-12 col-sm-12 col-md-10 col-lg-6 offset-0 offset-sm-0 offset-md-1 offset-lg-3"
        >
          <div class="text-start">
            <h2 class="mt-4 mb-4 bold">{{ $t("nav.impressum") }}</h2>
            <p>Bernhard Glimm</p>
            <p>Georg-Lechleiter-Platz 2</p>
            <p>68165 Mannheim</p>
            <p>{{ $t("germany") }}</p>
            <hr />
            <a
              class="links-a"
              href="tel:+491738216011"
              style="color: black; text-decoration: none"
              onmouseover="this.style.textDecoration='underline'"
              onmouseout="this.style.textDecoration='none'"
              >+49 1738216011</a
            >
            <a
              class="links-a"
              href="mailto:shemonstervintage@googlemail.com"
              style="color: black; text-decoration: none"
              onmouseover="this.style.textDecoration='underline'"
              onmouseout="this.style.textDecoration='none'"
              >shemonstervintage@googlemail.com</a
            >
            <p>Ust. ID: DE 814 502 433</p>
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

  await $three.ready;

  $three.addAnimatedCallback("sphere", (delta) => {
    if ($three.backgroundSphere) {
      $three.backgroundSphere.position.y += delta;
    }
  });
});
</script>

<style scoped>
.links-a {
  padding: 0;
  border: none;
  margin-bottom: 1rem;
}
</style>
