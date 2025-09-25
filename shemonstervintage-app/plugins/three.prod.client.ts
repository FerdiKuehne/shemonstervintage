// plugins/three.ts
import { defineNuxtPlugin } from '#app'
import { Scene, PerspectiveCamera, WebGLRenderer, Color } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createBackgroundSphereFromAPI } from '@/composables/backgroundsphere.js'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev) {
    // 🚫 Skip providing $three in dev mode
    return
  }
  
  if (!import.meta.client) return

  const state = {
    initialized: false,
    scene: null as Scene | null,
    camera: null as PerspectiveCamera | null,
    renderer: null as WebGLRenderer | null,
    controls: null as OrbitControls | null,
    animatedCallbacks: new Map<string, (delta: number) => void>(),
    backgroundSphere: null as any,
    scroller: null as HTMLElement | null,
  }

  // --- Ready promise handling ---
  let resolveReady: (() => void) | null = null
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve
  })

  const backgroundSpherePromise = createBackgroundSphereFromAPI(window.devicePixelRatio || 1)
    .then(mesh => { state.backgroundSphere = mesh })

  async function init() {
    await backgroundSpherePromise
    if (state.initialized) return

    const container = document.getElementById('three-root')
    if (!container) return

    console.log('Initializing Three.js renderer & scene')

    // Scene
    state.scene = new Scene()
    state.scene.background = new Color(0x000000)

    // Camera
    state.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    state.camera.position.set(0, 0, 50)

    // Renderer
    state.renderer = new WebGLRenderer({ antialias: true })
    state.renderer.setSize(window.innerWidth, window.innerHeight)
    state.renderer.setPixelRatio(window.devicePixelRatio || 1)
    container.appendChild(state.renderer.domElement)

    // OrbitControls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement)
    state.controls.enableDamping = true
    state.controls.dampingFactor = 0.05
    state.controls.enableZoom = true
    state.controls.target.set(0, 0, 0)
    state.controls.update()

    
    // Add background sphere
    if (state.backgroundSphere) state.scene.add(state.backgroundSphere)

    // Resize handler
    window.addEventListener('resize', () => {
      if (!state.camera || !state.renderer) return
      state.camera.aspect = window.innerWidth / window.innerHeight
      state.camera.updateProjectionMatrix()
      state.renderer.setSize(window.innerWidth, window.innerHeight)
    }, { passive: true })

    // Animation loop
    let lastTime = performance.now()
    function animate(time?: number) {
      requestAnimationFrame(animate)
      const now = time ?? performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now

      state.animatedCallbacks.forEach((cb, name) => {
        if (typeof cb === 'function') {
          cb(delta)
        } else {
          console.warn(`[three] Callback "${name}" is not a function`, cb)
        }
      })

      state.controls?.update()
      state.renderer?.render(state.scene!, state.camera!)
    }
    animate()

    state.initialized = true
    resolveReady?.() // ✅ resolve promise once initialized
  }

  // Provide $three globally
  nuxtApp.provide('three', {
    init,
    ready: readyPromise, // 👈 expose here
    get scene() { return state.scene },
    get camera() { return state.camera },
    get renderer() { return state.renderer },
    get controls() { return state.controls },
    get backgroundSphere() { return state.backgroundSphere },
    get initialized() { return state.initialized },

    addAnimatedCallback(name: string, cb: (delta: number) => void) {
      state.animatedCallbacks.set(name, cb)
    },
    removeAnimatedCallback(name: string) {
      state.animatedCallbacks.delete(name)
    },
    getAnimatedCallback(name: string) {
      return state.animatedCallbacks.get(name)
    },
    removeAllAnimatedCallbacks() {
      state.animatedCallbacks.clear()
    },
    setScroller(ref: HTMLElement) {
      state.scroller = ref
    },
    get scroller() {
      return state.scroller
    },
    cleanup() {
      state.renderer?.dispose()
      state.controls?.dispose()
      state.scene = null
      state.camera = null
      state.backgroundSphere = null
      state.initialized = false
      state.animatedCallbacks.clear()
      state.scroller = null
    }
  })
})
