<template>
  <div class="logo">SHEMONSTER</div>

  <ul class="header-nav">
    <!-- Mobile Toggle -->
<li class="only-mobile">
  <button
    class="btn-menu"
    @click="isMenuOpen = !isMenuOpen"
    aria-controls="mobile-menu"
    :aria-expanded="isMenuOpen ? 'true' : 'false'"
    :aria-label="isMenuOpen ? 'Menü schließen' : 'Menü öffnen'"
  >
    <!-- Icon wechselt zwischen Hamburger und X -->
    <svg v-if="!isMenuOpen" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="5" x2="19" y2="19"/>
      <line x1="19" y1="5" x2="5" y2="19"/>
    </svg>
  </button>
</li>

    <li><NuxtLink to="/login">Login</NuxtLink></li>
    <li><NuxtLink to="/register">Register </NuxtLink></li>
    <li>
      <button @click="isWishlistOpen = true" class="btn-wishlist">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 64 64"
          fill="none"
          stroke="#000000"
          stroke-width="2"
          stroke-miterlimit="10"
        >
          <polygon points="51.081 59.656 32.276 47.43 13.463 59.656 13.463 3.737 51.081 3.737 51.081 59.656"/>
          <line x1="32.264" y1="15.364" x2="32.264" y2="34.292"/>
          <line x1="41.729" y1="24.828" x2="22.8" y2="24.828"/>
        </svg>
      </button>
    </li>
  </ul>

  <!-- Header wird zum Off-Canvas Panel -->
  <header id="mobile-menu" class="site-header" :class="{ open: isMenuOpen }">
    <ul class="main-nav">
      <li><NuxtLink to="/"        @click="isMenuOpen = false"><span class="num">01</span> Home</NuxtLink></li>
      <li><NuxtLink to="/about"   @click="isMenuOpen = false"><span class="num">02</span> About</NuxtLink></li>
      <li><NuxtLink to="/gallery" @click="isMenuOpen = false"><span class="num">03</span> Gallery</NuxtLink></li>
      <li><NuxtLink to="/anfahrt" @click="isMenuOpen = false"><span class="num">04</span> Location</NuxtLink></li>
      <li><NuxtLink to="/kontakt" @click="isMenuOpen = false"><span class="num">05</span> Contact</NuxtLink></li>
    </ul>
  </header>

  <!-- Overlay klickbar zum Schließen -->
  <div
    v-if="isMenuOpen"
    class="overlay"
    @click="isMenuOpen = false"
    aria-hidden="true"
  />

  <!-- Wishlist rechts -->
  <transition name="wishlist-fade">
    <Wishlist
      v-if="isWishlistOpen"
      :isOpen="isWishlistOpen"
      @close="isWishlistOpen = false"
    />
  </transition>

  <div id="app">
    <div id="scroller" ref="scroller" class="scroller">
      <div id="three-root" class="three-container"></div>
    </div>
    <NuxtLayout />
  </div>



  <canvas v-if="showCanvas" id="minimap" width="440" height="440"></canvas>

  <footer>
    <ul class="footer-nav">
      <li><NuxtLink to="/Datenschutz">Privacy Policy</NuxtLink></li>
      <li><NuxtLink to="/impressum">Imprint </NuxtLink></li>
      <li><NuxtLink to="/editmode">Edit-Mode</NuxtLink></li>
    </ul>
  </footer>
</template>

<script setup>
import gsap from "gsap";
import { scrollerRef } from "@/composables/scroller.js";
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { useRoute, useNuxtApp } from "#imports";
import Wishlist from "@/components/wishlist.vue";

const isWishlistOpen = ref(false);
const isMenuOpen = ref(false); // <-- Toggle-State fürs mobile Menü

const scroller = scrollerRef;
const route = useRoute();

const showCanvas = computed(() => route.path.endsWith("/editmode"));

let $three = null;

const onKey = (e) => {
  if (e.key === "Escape") {
    isMenuOpen.value = false;
    isWishlistOpen.value = false;
  }
};

onMounted(async () => {
  window.addEventListener("keydown", onKey);

  if (!import.meta.dev) {
    $three = useNuxtApp().$three;
    console.log("App mounted, initializing Three.js scene...");
    console.log("Dev mode:", import.meta.dev);
    await $three.init();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
});

/* Body-Scroll sperren, wenn Menü offen */
watch(isMenuOpen, (open) => {
  document.documentElement.style.overflow = open ? "hidden" : "";
});
</script>

<style>
:root {
  --main-color: #f7a700;
  --white: #fff;
  --black: #000;

  /* Inputs */
  --input-bg: #fff;
  --input-fg: #111;
}

*,
*:after,
*:before { margin: 0; padding: 0; box-sizing: border-box; }

body { color: var(--black); }
body::-webkit-scrollbar { display: none; }

h1 { 
  font-size: 1.5rem; font-weight: 600; color: var(--black);
  letter-spacing: 0; text-transform: uppercase; margin: 0 0 1rem 0;
}

.page-content {
  position: absolute;
  width: 100%;
}

.page-headline {
  position: fixed; font-weight: 300; color: var(--main-color);
  padding: 1rem 1rem 0 170px; mix-blend-mode: difference;
}
@media (max-width: 991px) {
  .page-headline {
    font-size: 1.2rem;
    padding:1.1rem 1rem 0 176px;
  }
}

/* Overlay hinter dem Menü */
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  backdrop-filter: blur(2px);
  z-index: 19; /* unter dem Header-Panel (20) */
}

/* Wishlist (wie gehabt) */
.wishlist-fade-enter-active,
.wishlist-fade-leave-active { transition: transform .3s ease; will-change: transform; }
.wishlist-fade-enter-from,
.wishlist-fade-leave-to     { transform: translateX(100%); }
.wishlist-fade-enter-to,
.wishlist-fade-leave-from   { transform: translateX(0); }

/* Inputs – Autofill fix */
input:-webkit-autofill,
textarea:-webkit-autofill,
select:-webkit-autofill {
  -webkit-text-fill-color: var(--input-fg);
  caret-color: var(--input-fg);
  box-shadow: 0 0 0 1000px var(--input-bg) inset;
  border: 0 solid rgba(0,0,0,0);
  border-bottom: 1px solid rgba(0,0,0,1);
}
input:-webkit-autofill:focus {
  box-shadow: 0 0 0 1000px var(--input-bg) inset, 0 0 0 0 rgba(0,0,0,0);
}

.form-header { margin: 0 0 3rem 0; position: relative; }

.button-wrapper {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
}

/* === Input underline animation === */
.cofirmation-input-group { position: relative; margin-bottom: 2.5rem; }
.cofirmation-input {
  font-size: 16px; padding: 10px 0; display: block; width: 100%;
  outline: none; border: none; border-bottom: 1px solid var(--black); background: transparent;
}
.cofirmation-input-group::after {
  content: ""; position: absolute; left: 50%; bottom: 0; width: 100%; height: 1px;
  background: var(--black); transform: translateX(-50%) scaleX(0);
  transform-origin: center; transition: transform .3s ease, height .3s ease; pointer-events: none;
}
.cofirmation-input-group:focus-within::after { transform: translateX(-50%) scaleX(1); height: 2px; }
.cofirmation-label {
  position: absolute; pointer-events: none; top: 10px; left: 0;
  transition: top .2s ease, font-size .2s ease, color .2s ease;
}
.cofirmation-input:focus ~ .cofirmation-label,
.cofirmation-input:not(:placeholder-shown) ~ .cofirmation-label {
  top: -10px; font-size: 14px; color: var(--black);
}
@media (prefers-reduced-motion: reduce) {
  .cofirmation-input-group::after { transition: none; }
}

/* Buttons */
.btn { border-radius: 0; outline: 0 !important; box-shadow: 0 0 0 0 rgba(0,0,0,0) !important; border: 0 }
.btn.link { background: transparent; color: var(--black); margin: 0 .5rem 0 0; padding: 0; }
.btn.small { font-size: .8rem; opacity: .8; }
.btn.primary { background: var(--black); color: var(--white); border: 1px solid var(--black); }

/* Header-Nav: Mobile Toggle sichtbar machen */
.only-mobile { display: none; }
.btn-wishlist,
.btn-menu {
  width: 32px; height: 32px;
  border: none; background-color: transparent; cursor: pointer; line-height: 0;
  color: var(--black);
}
@media (max-width: 991px) {
  .only-mobile { display: block; position: fixed; left: .25rem;}
}
</style>

<style scoped>
.logo {
  position: fixed;
  top: .8rem;
  left: 1rem;
  z-index: 21;
  font-size: 1.5rem;
  font-weight: 600; 
  color: var(--black); 
  letter-spacing: -1.5px;
}
@media (max-width:991px) {
  .logo {
    font-size: 1.2rem;
    top: 1.1rem;
    left: 3.4rem;
  }
}

/* Desktop: Header links mittig (wie vorher) */
.site-header {
  position: fixed;
  top: 50%; left: 1rem; z-index: 20;
  transform: translate(0, -50%);
  transition: transform .3s ease;
}

/* Mobil: Header als Off-Canvas-Panel von links */
@media (max-width: 991px) {
  .site-header {
    position: fixed;
    top: 0; left: 0; z-index: 20;
    transform: translateX(-100%);     /* Start: aus dem Viewport links */
    background-color: var(--white);
    height: 100vh; width: 100%;
    padding: 200px 1rem 1rem 1rem;
    transition: transform .3s ease;
  }
  .site-header.open {
    transform: translateX(0);         /* offen: sichtbar */
  }
}

ul.header-nav {
  position: fixed; 
  top: 1rem; 
  right: .25rem; 
  z-index: 21;
  display: flex; 
  align-items: center; 
  list-style: none; 
  margin: 0; 
  padding: 0;
}
ul.header-nav li { margin: 0 0.5rem; }
ul.header-nav li:first-child { margin-right: 0.5rem; }
ul.header-nav li:last-child { margin-left: 0.5rem; }
ul.header-nav li a {
  font-size: 0.8rem; 
  text-decoration: none; 
  color: var(--black); 
  display: block;
}

ul.main-nav { list-style: none; margin: 0; padding: 0; }

ul.main-nav li {
  cursor: pointer; 
  min-width: 300px; 
  display: block;
  text-transform: uppercase; 
  font-size: 1rem; 
  font-weight: 600; 
  color: var(--black);
  line-height: 2rem; 
  transition: font-size 0.3s, line-height 0.3s;
}
@media (max-width: 991px) {
  ul.main-nav li  { 
    font-size: 4rem; 
    line-height: 4rem; 
    padding: .2rem 0; 
  }
}

ul.main-nav li:hover {
  font-size: 5rem; 
  line-height: 5rem; 
  transition: font-size 0.3s, line-height .3s;
}
@media (max-width: 991px) {
  ul.main-nav li:hover {
    font-size: 4rem; 
    line-height: 4rem; 
    padding: .2rem 0; 
  }
}

ul.main-nav li .num {
  display: inline-block; 
  font-size: 1rem; 
  transform: translate(0, 0);
  transition: font-size 0.3s, transform 0.3s;
}
@media (max-width: 991px) {
  ul.main-nav li .num  { font-size: 2rem; transform: translate(0, 0); }
}

ul.main-nav li:hover .num { 
  font-size: 2rem; 
  transform: translate(0, -33px); 
  transition: font-size .3s, transform .3s; 
}
@media (max-width: 991px) {
  ul.main-nav li:hover .num  { font-size: 2rem; transform: translate(0, 0); }
}


ul.main-nav li a { color: var(--black); text-decoration: none; }

ul.main-nav li:hover:after {
  content: "_";
  animation: blink 0.3s infinite;
}

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }

.scroller {
  height: 200vh; overflow-y: auto; overflow-x: hidden;
  position: relative; z-index: 0;
}
.scroller::-webkit-scrollbar { display: none; }

.three-container {
  pointer-events: auto; position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0; background: transparent; overflow: hidden;
}

canvas { display: block; }

#minimap {
  position: fixed; left: 10px; bottom: 10px; z-index: 10000;
  width: 220px; height: 220px;
  border: 1px solid var(--black); border-radius: 8px;
  background-color: var(--black);
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  cursor: crosshair;
}
#minimap.dragging { cursor: grabbing; }

footer { position: fixed; bottom: 1rem; right: 1rem; z-index: 20; }
ul.footer-nav { display: flex; list-style: none; margin: 0; padding: 0; }
ul.footer-nav li { margin: 0 0.5rem; }
ul.footer-nav li:first-child { margin-right: 0.5rem; }
ul.footer-nav li:last-child { margin-left: 0.5rem; }
ul.footer-nav li a { font-size: 0.8rem; text-decoration: none; color: var(--black); display: block; }
</style>
