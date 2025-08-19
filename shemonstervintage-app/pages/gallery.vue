<template>
    <div class="container py-4">

      <componentGallery :images="images"/>

      <!-- Spacer to make scrollable area before the trigger -->
      <!-- <div style="height: 200px"></div> -->

      <!-- Sentinel: triggers loading BEFORE scroll reaches end -->
      <!--

      -->

    </div>

</template>
<script setup>

/*
     <div ref="loadTrigger" style="height: 1px"></div>

      <!-- Loading spinner -->
      <div class="text-center my-4" v-if="loading">
        <div
          class="spinner-border"
          role="status"
          aria-label="Lade mehr Bilder..."
        >
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>


*/

import { ref, onMounted, onUnmounted, nextTick } from "vue";

import componentGallery from "~/components/componentGallery.vue";


definePageMeta({
  name: 'gallery',
})


const images = ref([]);

const loading = ref(false);

const loadTrigger = ref(null);

const imgIndex = ref(0);


let fallbackCheckInterval;

function checkIfNearBottom() {
  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.scrollHeight - 800;
  if (scrollPosition >= threshold && !loading.value) {
    loadImages();
  }
}
const indexMaske = "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCFNNNN.jpg";

async function loadImages() {
  for (let i = 129; i < 150; i++) {
    const indexpicture = i.toString().padStart(4, '0');
    const imageUrl = indexMaske.replace("NNNN", indexpicture);
    
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (response.ok) {
        images.value.push(imageUrl);
      }
    } catch (error) {
      console.warn(`Image not found: ${imageUrl}`);
    }
  }

  loading.value = false;
}

async function ensurePageIsScrollable() {
  while (document.body.scrollHeight <= window.innerHeight) {
    loadImages();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await nextTick();
  }
}

let observer;

onMounted(async () => {
  loadImages();
  /*
  await ensurePageIsScrollable();

  fallbackCheckInterval = setInterval(checkIfNearBottom, 500);

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading.value) {
        loadImages(8);
      }
    },
    {
      root: null,
      rootMargin: "1000px",
      threshold: 0,
    }
  );
  if (loadTrigger.value) {
    observer.observe(loadTrigger.value);
  }
    */
});

onUnmounted(() => {
  if (observer && loadTrigger.value) {
    observer.unobserve(loadTrigger.value);
  }
  clearInterval(fallbackCheckInterval);
});
</script>


<style>

  .card { overflow: unset !important; }

</style>
