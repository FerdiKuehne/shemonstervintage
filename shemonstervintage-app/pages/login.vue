<template>
  <div class="login-wrapper">
    <div class="login">
      <!-- Close (X) -->
      <button
        class="box-close"
        type="button"
        @click.stop.prevent="closeBox"
        aria-label="Schließen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32" height="32"
          viewBox="0 0 32 32"
          fill="none" stroke="#000000" stroke-miterlimit="10"
          aria-hidden="true"
        >
          <line x1="1.672" y1="1.672" x2="31.164" y2="31.164"/>
          <line x1="31.164" y1="1.672" x2="1.672" y2="31.164"/>
        </svg>
      </button>

      <div class="form-header">
        <h1>{{ $t("login.title") }}</h1>
      </div>

      <form @submit.prevent="login">
        <div class="cofirmation-input-group">
          <input v-model="email" class="cofirmation-input" type="email" placeholder=" " />
          <label class="cofirmation-label">{{ $t("login.email") }}</label>
        </div>

        <div class="cofirmation-input-group">
          <input v-model="password" class="cofirmation-input" type="password" placeholder=" " />
          <label class="cofirmation-label">{{ $t("login.password") }}</label>
        </div>

        <div class="button-wrapper">
          <div>
            <NuxtLink to="/passwortReset">
              <button class="btn link small" type="button">{{ $t("login.forgotPassword") }}</button>
            </NuxtLink>

            <!-- Hier geändert: führt jetzt zu /register -->
            <NuxtLink to="/register">
              <button class="btn link small" type="button">{{ $t("login.register") }}</button>
            </NuxtLink>
          </div>

          <button class="btn primary" type="submit">Login</button>
          <p v-if="error">{{ error }}</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "#imports"; // Nuxt 3

definePageMeta({ layout: "three" });

const router = useRouter();
const email = ref("");
const password = ref("");
const user = ref(null);
const error = ref("");

function closeBox() {
  router.push("/"); // immer Home
}

async function login() {
  try {
    const response = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Login failed");
    const data = await response.json();
    user.value = data.user;
    router.push("/dashboard");
  } catch (err) {
    error.value = "Login failed" +  err;
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100vh;
}

/* Box über evtl. Overlays legen */
.login {
  position: relative;
  z-index: 9998;
  width: 400px;
  border: 1px solid var(--black);
  padding: 1rem;
  background-color: var(--white);
}

/* Close (X) – exakt wie Wishlist + sicher klickbar */
.box-close {
  position: absolute;
  top: 1rem; right: 1rem;
  padding: 0;
  border: none;
  background: transparent;
  width: 32px; height: 32px;
  cursor: pointer; line-height: 0;
  z-index: 9999;         /* über allem in der Box */
  pointer-events: auto;
}
</style>
