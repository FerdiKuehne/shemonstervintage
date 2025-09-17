<!-- layouts/default.vue -->
<!-- layouts/default.vue -->
<template>
  <div>
    <!--
        <header>
      <nav class="navbar navbar-expand-lg navbar-light">
        <a class="navbar-brand" href="/">
          <img class="logo" src="assets/images/logo.svg" alt="Company Logo"
        /></a>
        <div id="navbarNav" class="collapse navbar-collapse">
          <ul class="navbar-nav">
            <li class="nav-item active">
              <NuxtLinkLocale to="/"> Home </NuxtLinkLocale>
            </li>
            <li class="nav-item">
              <NuxtLinkLocale to="/anfahrt">
                {{ $t("nav.visitUndKontakt") }}
              </NuxtLinkLocale>
            </li>

            <li class="nav-item">
              <NuxtLinkLocale to="/gallery"> Sabotage </NuxtLinkLocale>
            </li>
            <li class="nav-item">
              <NuxtLinkLocale to="/3dgallery"> Sab0tag3 </NuxtLinkLocale>
            </li>
          </ul>
        </div>
        <div class="d-flex align-items-center ms-auto cart-button wishlist">
          <NuxtLinkLocale to="/wunschliste">
            <svg
              v-if="isEmpty"
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
          </NuxtLinkLocale>

          <a
            class="nav-link dropdown-toggle d-flex align-items-center"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-globe"
              viewBox="0 0 16 16"
            >
              <path
                d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"
              />
            </svg>
          </a>
          <ul class="dropdown-menu dropdown-menu-end rounded-0">
            <li v-for="locale in locales" :key="locale.code">
              <button class="dropdown-item" @click="setLocale(locale.code)">
                {{ locale.name }}
              </button>
            </li>
          </ul>
        </div>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
      </nav>
    </header>
    -->

    
    <NuxtPage keepalive />
   
<!--
        <footer>
      <div class="footer text-center">
        <div class="row">
          <div class="col-12 d-flex">
            <a>
              &copy; {{ new Date().getFullYear() }} Shemonstervintage. All
              rights reserved.
            </a>
            <NuxtLinkLocale to="/impressum">
              {{ $t("nav.impressum") }}
            </NuxtLinkLocale>
            <NuxtLinkLocale to="/datenschutz">
              {{ $t("nav.privacyPolicy") }}
            </NuxtLinkLocale>
          </div>
        </div>
      </div>
    </footer>


-->

  </div>
</template>

<script setup>
import { NuxtPage } from "#components";
import { useI18n } from "vue-i18n";


const { locales, setLocale } = useI18n();

const isEmpty = computed(() => wishes.value.length === 0);
</script>

<style>

.wishlist {

  padding-right: 2rem;

}


header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 100%;
}

.dropdown-menu {
  background-color: white;
  border: 0.1rem solid black;
  border-radius: 0rem;
}

.nav-right {
  padding: 1rem;
}

.navbar {
  background-color: white;
  padding-top: 0;
  padding-bottom: 0;
}
.logo {
  height: 25px;
  width: auto;
}
@media screen and (max-width: 512px) {
  .logo {
    width: 100%;
  }
}

@font-face {
  font-family: "Bank-Gothic-Medium";
  src: url("assets/fonts/Bank-Gothic-Medium.woff") format("woff");
}

body {
  font-family: "Bank-Gothic-Medium";
}

footer {
  height: 5vh;
  bottom: 0;
  position: fixed;
  align-items: center;
  width: 100%;
  overflow: hidden;
  background-color: white;
  z-index: 3;
}

footer a {
  padding-top: 0;
  padding-left: 1rem;
}



a {
  text-decoration: none;
  display: block;
  padding: 1rem 1rem 1rem 1rem;
  font-size: var(--bs-nav-link-font-size);
  font-weight: var(--bs-nav-link-font-weight);
  color: var(--bs-nav-link-color);
  text-decoration: none;
  background: none;
  border: 0;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out;
}
</style>
