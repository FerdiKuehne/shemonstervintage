<template>
    <div class="img-description"     :style="{
      [imageSide]: '0px',
    }">
        <h2 class="img-title">{{ imagesDescription}}</h2>
        <p class="img-text">{{ imagesUrl  }}</p>
        <button class="btn primary close-btn-detail" @click="imagesOnClick">Close</button>
    </div>
</template>

<script setup>
import { ref, watch } from "vue";


defineProps({
  imageSide: {
    type: String,
    default:  'left' // 'left' or 'right'
  },
  imagesDescription: {
    type: String,
    required: true
  },
  imagesOnClick: {
    type: Function,
    required: true
  }
  
});



</script>

<style scoped>

.close-btn-detail {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translate(-50%, 0);
}

.img-description {
  position: absolute;
  top: 0px;
  background-color: rgba(255, 255, 255, 1);
  z-index: 30;
  padding: 4rem 1rem;
  width: 50vw;
  height: 100vh;
  display: flex;
  align-items: flex-end;
}

</style>