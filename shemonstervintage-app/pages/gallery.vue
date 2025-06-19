<template>

    <div class="container py-4">
      <h1 class="mt-5 mb-5 fw-bold text-center">Sabotage</h1>

      <componentGallery :images="images"/>

      <!-- Spacer to make scrollable area before the trigger -->
      <div style="height: 100px"></div>

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
    loadImages(8);
  }
}

function loadImages(count = 8) {
  loading.value = true;
  imgIndex.value = imgIndex.value + count;
  const indexMaske = "http://localhost:3000/_nuxt/public/img/Sabotage_NN_MM.jpg"

  for(let i = imgIndex.value - 8; i < imgIndex.value; i++) {
    const newImges = [];
    for(let j = 1; j < 5; j++){
      newImges.push(indexMaske.replace("NN", i + 1).replace("MM", j));
    }
    images.value.push(newImges);
  }
  console.log(images.value);
  setTimeout(() => {
    loading.value = false;
  }, 400);
}

async function ensurePageIsScrollable() {
  while (document.body.scrollHeight <= window.innerHeight) {
    loadImages(8);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await nextTick();
  }
}

let observer;

onMounted(async () => {
  loadImages(8);
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


