import { ref } from 'vue'

const wishes = ref([])

export function useWishlist() {
  function addWish(item) {
    if (!wishes.value.includes(item)) {
      wishes.value.push(item)
    }
  }

  function removeWish(img) {
    wishes.value = wishes.value.filter(item => item !== img)
  }

  return { wishes, addWish, removeWish }
}
