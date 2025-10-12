<template>
  <div class="logo">SHEMONSTER</div>

  <ul class="header-nav">
    <li><NuxtLink to="/login">Login</NuxtLink></li>
    <li><NuxtLink to="/register">Register </NuxtLink></li>
    <li><button @click="isWishlistOpen = true" class="btn-wishlist">

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


    </button></li>
  </ul>

  <header>
    <ul class="main-nav">
      <li>
        <NuxtLink to="/"><span class="num">01</span> Home</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/about"><span class="num">02</span> About</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/gallery"><span class="num">03</span> Gallery</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/anfahrt"><span class="num">04</span> Location</NuxtLink>
      </li>
      <li>
        <NuxtLink to="/kontakt"><span class="num">05</span> Contact</NuxtLink>
      </li>
    </ul>
  </header>

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
import { onMounted, ref } from "vue";
import { useRoute, useNuxtApp } from "#imports";
import Wishlist from "@/components/wishlist.vue";

const isWishlistOpen = ref(false);

const scroller = scrollerRef;
const route = useRoute();

const showCanvas = computed(() => route.path.endsWith("/editmode"));

let $three = null;

onMounted(async () => {
  if (!import.meta.dev) {
    $three = useNuxtApp().$three;

    console.log("App mounted, initializing Three.js scene...");

    console.log("Dev mode:", import.meta.dev);

    await $three.init();
  }
});
</script>

<style>

:root {

  --main-color: #f7a700;

  --white: #fff;
  --black: #000;
}

*,
*:after,
*:before {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  color: var(--black);
}

body::-webkit-scrollbar {
  display: none;
}

.page-headline {
  position: fixed;
  font-weight: 300;
  color: var(--main-color);
  padding: 1.25rem 1rem 0 170px;
  mix-blend-mode: difference;
}

.wishlist-fade-enter-active,
.wishlist-fade-leave-active {
  transition: transform .3s ease;
  will-change: transform;
}

.wishlist-fade-enter-from,
.wishlist-fade-leave-to {
  transform: translateX(100%); 
}

.wishlist-fade-enter-to,
.wishlist-fade-leave-from {
  transform: translateX(0); 
}


.cofirmation-input-group {
  position: relative;
  margin-bottom: 1.5rem;
}

.cofirmation-input {
  font-size: 16px;
  padding: 10px 10px 10px 5px;
  display: block;
  width: 100%;
  outline: none;
  border: none;
  border-bottom: 1px solid var(--black);
  background: transparent;
}

.cofirmation-label {
  position: absolute;
  pointer-events: none;
  top: 10px;
  left: 5px;
  transition: top 0.2s ease, font-size 0.2s ease, color 0.2s ease;
}

.cofirmation-input:focus ~ .cofirmation-label,
.cofirmation-input:not(:placeholder-shown) ~ .cofirmation-label {
  top: -10px;
  font-size: 14px;
  color: var(--black);
}

.cofirmation-input:focus {
  border-width: 2px;
  border-color: var(--black);
  box-shadow: inset 0 -3px 5px -3px var(--white);
}
</style>

<style scoped>

.logo {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--black);
  letter-spacing: -1.5px;
}

header {
  position: fixed;
  top: 50%;
  left: 1rem;
  z-index: 20;
  transform: translate(0, -50%);
}

ul.header-nav {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 20;
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

ul.header-nav li {
  margin: 0 0.5rem;
}

ul.header-nav li:first-child {
  margin: 0 0.5rem 0 0;
}

ul.header-nav li:last-child {
  margin: 0 0 0 0.5rem;
}

ul.header-nav li a {
  font-size: 0.8rem;
  text-decoration: none;
  color: var(--black);
  display: block;
}

.btn-wishlist {
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  cursor: pointer;
}

ul.main-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}

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

ul.main-nav li:hover {
  font-size: 5rem;
  line-height: 5rem;
  transition: font-size 0.3s, line-height 0.3s;
}

ul.main-nav li .num {
  display: inline-block;
  font-size: 1rem;
  transform: translate(0, 0);
  transition: font-size 0.3s, transform 0.3s;
}

ul.main-nav li:hover .num {
  font-size: 2rem;
  transform: translate(0, -33px);
  transition: font-size 0.3s, transform 0.3s;
}

ul.main-nav li a {
  color: var(--black);
  text-decoration: none;
}

ul.main-nav li:hover:after {
  content: "_";
  animation: blink 0.3s infinite;
}
@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.scroller {
  height: 200vh; /* enough content to scroll */
  overflow-y: auto; /* enable scrolling */
  overflow-x: hidden;
  position: relative; /* relative positioning */
  z-index: 0; /* above the canvas */
}

.scroller::-webkit-scrollbar {
  display: none;
}

.three-container {
  pointer-events: auto;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: transparent;
  overflow: hidden;
}

canvas {
  display: block;
}

#minimap {
  position: fixed;
  left: 10px;
  bottom: 10px;
  z-index: 10000;
  width: 220px;
  height: 220px;
  border: 1px solid var(--black);
  border-radius: 8px;
  background-color: var(--black);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  cursor: crosshair;
}

#minimap.dragging {
  cursor: grabbing;
}

footer {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 20;
}

ul.footer-nav {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

ul.footer-nav li {
  margin: 0 0.5rem;
}

ul.footer-nav li:first-child {
  margin: 0 0.5rem 0 0;
}

ul.footer-nav li:last-child {
  margin: 0 0 0 0.5rem;
}

ul.footer-nav li a {
  font-size: 0.8rem;
  text-decoration: none;
  color: var(--black);
  display: block;
}
</style>
