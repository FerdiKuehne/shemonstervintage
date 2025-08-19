import { ref, onMounted } from 'vue'

export function useProducts() {
  const products = ref([])
  const otherProducts = ref([])
  const cartButtonCoords = ref({ x: 0, y: 0 })

  const setCartButtonCoords = () => {
    const cartButton = document.querySelector('.cart-button')
    if (cartButton) {
      const { x, y } = cartButton.getBoundingClientRect()
      cartButtonCoords.value = { x, y }
    }
  }

  onMounted(() => {
    products.value = [...document.querySelectorAll('.products__item')]
    setCartButtonCoords()
  })

  return {
    products,
    otherProducts,
    cartButtonCoords,
    setCartButtonCoords
  }
}
