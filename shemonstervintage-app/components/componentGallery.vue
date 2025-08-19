<template>
  <h1 class="mt-5 mb-5 fw-bold text-center">Sabotage</h1>
  <div v-if="fullscreenImg" id="fullscreenImg" class="fullscreenImg">
    <div v-for="i in 10" :key="i" class="stackedImg">
      <img :id="i" ref="refFullscreenImg" :src="fullscreenImg" />
    </div>

    <button class="closeBtn" @click="closeFullscreenImg()">Close</button>
  </div>
  <div class="gallery row">
    <div
      v-for="(image, index) in props.images"
      :key="index"
      :ref="index + refGalleryImg"
      class="container col-6 col-md-4 col-lg-3"
    >
      <div class="img-wrapper">
        <img :src="image" class="img" @click="openFullscreenImg(index)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { gsap } from "gsap";

const fullscreenImg = ref(null);
const refFullscreenImg = ref(null);
const refGalleryImg = ref({});
const tlScreen = gsap.timeline();
const tlWishlist = gsap.timeline();
const currentGallery = ref(null);
let body = null;

const props = defineProps({
  images: {
    type: Array,
    required: false,
    default: () => [],
  },
});

onMounted(() => {
  body = document.querySelector("body");
});

const openFullscreenImg = async (index) => {
  fullscreenImg.value = props.images[index];

  currentGallery.value = [...document.querySelectorAll(".img-wrapper")];

  await nextTick();

  tlWishlist.clear(true);

  tlWishlist.to(currentGallery.value, {
    scale: 0.5,
    alpha: 0.0,
    duration: 1,
    ease: "power2.out",
    onComplete: () => {
      nextTick(() => {
        body.style.overflow = "hidden";
        body.style.maxHeight = "100vh";
      });
    },
  });

  gsap.set(".stackedImg", { x: -200, y: window.innerHeight * 0.8, alpha: 0.0 });

  tlWishlist.to(
    ".stackedImg",
    { scale: window.innerHeight * 0.8 / 300,
      x: window.innerWidth/2,
      alpha: 1,
      duration: 10,
      physics2D: {
              angle: 2 * (180 / Math.PI),
              velocity: 1,
              gravity: 3000
            },
      y: window.innerHeight,
      stagger: {
        each: 0.5 ,
       from: "end" // ensures first element starts first
      }
    },
    "+=0.5"
  );

  tlWishlist.play();
};

const closeFullscreenImg = () => {
  fullscreenImg.value = null;

  tlWishlist.to(currentGallery.value, {
    scale: 1.0,
    alpha: 1.0,
    duration: 1,
    ease: "power2.out",
    onComplete: () => {
      nextTick(() => {
        body.style.overflow = "auto";
        body.style.maxHeight = "none";
      });
    },
  });
  tlWishlist.play();
};
</script>

<style scoped>
.gallery .container {
  position: relative;
  padding-bottom: 10%;
}

.container img {
  width: 200px;
  height: 300px;
  transform: scale(1);
  transition: transform 0.3s ease;
}

.img:hover {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

.container .btn {
  position: absolute;
  z-index: 2;
  top: 10%;
  left: 25%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  background-color: #555;
  color: white;
  font-size: 16px;
  padding: 12px 24px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.fullscreenImg {
  position: fixed;
  background-color: white;
  z-index: 4;
}

.fullscreenImg img {
  position: fixed;
  bottom: 10vh;
  left: 0;
  width: auto;
}

.closeBtn {
  border: none;
  background: transparent;
  position: fixed;
  z-index: 2;
  right: 10vh;
  bottom: 10vh;
}

.closeBtn:hover {
  border-bottom: solid 1px black;
}
</style>
