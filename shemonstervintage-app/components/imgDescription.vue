<template>
    <div class="img-description"     :style="{
      [imageSide]: '0px',
    }">
        <h2 class="img-title">{{ imagesDescription}}</h2>
        <p class="img-text">{{ imagesUrl  }}</p>
        <button class="btn close-btn-detail" @click="imagesOnClick">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            class=""
            viewBox="0 0 32 32"
            stroke="#000000"
            stroke-miterlimit="10"
          >

          <line x1="1.672" y1="1.672" x2="31.164" y2="31.164"/>
          <line x1="31.164" y1="1.672" x2="1.672" y2="31.164"/>
        </svg>
      </button>
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
  z-index: 30;
  padding: 4rem 1rem 10rem 1rem;
  width: 50vw;
  height: 100vh;
  display: flex;
  align-items: flex-end;
}

</style>