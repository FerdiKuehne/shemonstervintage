<template>
  <div class="page-layout">
    <!-- Page content sits on top of the persistent Three.js canvas -->
    <div class="page-content">
      <transition name="fade" mode="out-in">
        <NuxtPage />
      </transition>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>

.page-layout {
  position: fixed;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  z-index: 10; /* above the Three.js canvas */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
