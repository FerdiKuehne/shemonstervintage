<template>
  <div class="row">
    <div
      v-for="(img, index) in props.images"
      :key="index"
      class="col-12 col-md-6 col-lg-4 col-xl-3 mb-4"
    >
      <div class="card">
        <div
          class="card-body d-flex justify-content-between align-items-center"
        >
          <div class="flip-container">
            <div class="flipper">
              <div class="front">
                <img class="card-img" :src="img[0]" alt="Front Image" />
              </div>
              <div class="back">
                <img class="card-img" :src="img[1]" alt="Back Image" />
              </div>
            </div>
          </div>

          <div class="gallery-btn-wrapper container-fluid">
            <div class="row">
              <div class="col-6">
                <button
                  class="btn btn-sm rounded-circle border border-black text-black d-flex align-items-center justify-content-center"
                  style="width: 40px; height: 40px"
                  @click.stop="openModalshowInfo()"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    class="bi bi-info-lg"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="m9.708 6.075-3.024.379-.108.502.595.108c.387.093.464.232.38.619l-.975 4.577c-.255 1.183.14 1.74 1.067 1.74.72 0 1.554-.332 1.933-.789l.116-.549c-.263.232-.65.325-.905.325-.363 0-.494-.255-.402-.704zm.091-2.755a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0"
                    />
                  </svg>
                </button>
              </div>

              <div class="col-6 d-flex justify-content-end">
                <button
                  class="btn btn-sm rounded-circle border border-black text-black d-flex align-items-center justify-content-center"
                  style="width: 40px; height: 40px"
                  @click.stop="likeImage(img)"
                >
                  <svg
                    v-if="!wishes.includes(img)"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    class="bi bi-suit-heart"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="m8 6.236-.894-1.789c-.222-.443-.607-1.08-1.152-1.595C5.418 2.345 4.776 2 4 2 2.324 2 1 3.326 1 4.92c0 1.211.554 2.066 1.868 3.37.337.334.721.695 1.146 1.093C5.122 10.423 6.5 11.717 8 13.447c1.5-1.73 2.878-3.024 3.986-4.064.425-.398.81-.76 1.146-1.093C14.446 6.986 15 6.131 15 4.92 15 3.326 13.676 2 12 2c-.777 0-1.418.345-1.954.852-.545.515-.93 1.152-1.152 1.595zm.392 8.292a.513.513 0 0 1-.784 0c-1.601-1.902-3.05-3.262-4.243-4.381C1.3 8.208 0 6.989 0 4.92 0 2.755 1.79 1 4 1c1.6 0 2.719 1.05 3.404 2.008.26.365.458.716.596.992a7.6 7.6 0 0 1 .596-.992C9.281 2.049 10.4 1 12 1c2.21 0 4 1.755 4 3.92 0 2.069-1.3 3.288-3.365 5.227-1.193 1.12-2.642 2.48-4.243 4.38z"
                    />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    class="bi bi-heart-fill"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showModal"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    style="background-color: rgba(0, 0, 0, 0.5)"
    @click.self="showModal = false"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-body p-0">
          <img
            v-if="selectedImage"
            :src="selectedImage"
            class="img-fluid"
            style="transition: opacity 0.3s ease-in-out; opacity: 1"
          />
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showInfo"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    style="background-color: rgba(0, 0, 0, 0.5)"
    @click.self="showInfo = false"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content rounded-0">
        <div class="modal-body">
          <h3>Das ist ultra Rare</h3>
          Der Fit ist gut. Das ist Ende. No brainer. Abgesegnet. Aging.
          Stitches.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useWishlist } from "@/composables/useWishlist";

const { wishes, removeWish, addWish } = useWishlist();

const props = defineProps({
  images: {
    type: Array,
    required: false,
    default: () => [],
  },
});

const showModal = ref(false);
const selectedImage = ref(null);
const showInfo = ref(false);

function likeImage(img) {
  if (wishes.value.includes(img)) {
    removeWish(img);
  } else {
    addWish(img);
  }
}

function openModal(img) {
  selectedImage.value = null;
  showModal.value = true;

  // Delay image assignment to avoid flicker
  setTimeout(() => {
    selectedImage.value = img;
  }, 50);
}

function openModalshowInfo() {
  showInfo.value = true;
}
</script>
<style scoped>
.flip-container {
  perspective: 1000px;
  width: 300px;
  height: 200px;
}

.flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 1s;
  transform-style: preserve-3d;
}

.flip-container:hover .flipper {
  transform: rotateY(180deg);
}

.front, .back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.front img, .back img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.back {
  transform: rotateY(180deg);
}

.card {
  overflow: hidden;
  position: relative;
  border-radius: 0;
  border: 0;
  box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
}

.card-body {
  padding: 0;
}

.card-img,
.card-img-top {
  border-radius: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-btn-wrapper {
  padding: 1rem;
  position: absolute;
  top: 0;
  width: 100%;
}

.gallery-btn-wrapper {
  padding: 1rem;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 10;
}

.modal.show {
  z-index: 1050;
}

.carousel-img {
  object-fit: cover;
}
</style>
