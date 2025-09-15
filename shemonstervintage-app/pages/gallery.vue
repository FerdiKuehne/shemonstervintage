<template>
  <div class="container py-4">
    <componentGallery :images="images" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import componentGallery from "~/components/componentGallery.vue";

definePageMeta({
  name: "gallery",
});

const images = ref([]);
const loading = ref(false);
const imgIndex = ref(0);

function checkIfNearBottom() {
  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.scrollHeight - 800;
  if (scrollPosition >= threshold && !loading.value) {
    loadImages();
  }
}

// Load random product-like images (2:3 ratio, white background)
async function loadImages(count = 20) {
  loading.value = true;

  for (let i = 0; i < count; i++) {
    const randomSeed = Date.now() + Math.floor(Math.random() * 10000);
    // 400x600 → 2:3 aspect ratio
    const imageUrl = `https://picsum.photos/seed/${randomSeed}/400/600`;
    images.value.push(imageUrl);
  }

  loading.value = false;
}

async function ensurePageIsScrollable() {
  while (document.body.scrollHeight <= window.innerHeight) {
    await loadImages();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await nextTick();
  }
}

onMounted(async () => {
  await loadImages();
  await ensurePageIsScrollable();
  window.addEventListener("scroll", checkIfNearBottom);
});

onUnmounted(() => {
  window.removeEventListener("scroll", checkIfNearBottom);
});
</script>

<style>
.card {
  overflow: unset !important;
}
</style>
