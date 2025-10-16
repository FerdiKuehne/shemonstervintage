<template>
  <div>
    <h2>Profile Page</h2>
    <p>This is a placeholder for the profile page.</p>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from "vue";

definePageMeta({
  layout: "three",
});

onMounted(async () => {
  console.log("mounted");
});
</script>
