<script setup>
import { onMounted } from "vue";
import { run } from "~/composables/main.js";



const threeContainer = ref(null);
const containerHeight = ref(null);


onMounted(async () => {
  await nextTick();
  if (threeContainer.value) {
    run(threeContainer.value,containerHeight);
  }
});
</script>

<template>
  <div id="scroll-container" :style="{ height: containerHeight + 'vh' }">
    <div ref="threeContainer" class="three-container"></div>
  </div>
</template>

<style scoped>
.three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  padding: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  display: none;
  opacity: 0;
  pointer-events: none;
}
@media screen and (max-width: 768px) {
  .modal-wrapper {
    padding: 100vh 0 0 0;
  }
}

.modal-wrapper.open {
  pointer-events: all;
  display: block;
  animation: fade-in 0.3s forwards;
  animation-delay: 0.5s;
}
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.modal-content {
  width: 50%;
  height: 100vh;
  padding: 20px;
  background-color: #fff;
}
@media screen and (max-width: 768px) {
  .modal-content {
    width: 100%;
  }
}

.close-modal {
  width: 48px;
  height: 48px;
  position: absolute;
  bottom: 1rem;
  left: 50%;
  z-index: 1;
  transform: translate(-50%, 0);
}

#ui {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(12, 16, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
input[type="file"] {
  display: none;
}
</style>
