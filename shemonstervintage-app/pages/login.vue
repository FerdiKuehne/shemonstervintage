<template>
  <div class="login-wrapper">
    <div class="login">
      <!-- Close (X) – identisch zur Register/Wishlist Variante -->
      <button class="box-close" @click="closeBox" aria-label="Schließen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          stroke="#000000"
          stroke-miterlimit="10"
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
          <input
            v-model="email"
            class="cofirmation-input"
            type="email"
            placeholder=" "
          />
          <label class="cofirmation-label">{{ $t("login.email") }}</label>
        </div>

        <div class="cofirmation-input-group">
          <input
            v-model="password"
            class="cofirmation-input"
            type="password"
            placeholder=" "
          />
          <label class="cofirmation-label">{{ $t("login.password") }}</label>
        </div>

        <div class="button-wrapper">
          <div>
            <router-link to="/passwortReset">
              <button class="btn link small" type="button">{{ $t("login.forgotPassword") }}</button>
            </router-link>
            <router-link to="/registrierung">
              <button class="btn link small" type="button">{{ $t("login.register") }}</button>
            </router-link>
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
import { useRouter } from "vue-router";

definePageMeta({ layout: "three" });

const router = useRouter();
const email = ref("");
const password = ref("");
const user = ref(null);
const error = ref("");

function closeBox() {
  if (window.history.length > 1) router.back();
  else router.push("/");
}

async function login() {
  try {
    const response = await fetch("https://your-domain.com/api/login.php", {
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
    error.value = "Login failed";
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.login {
  position: relative; /* für den Close-Button */
  width: 400px;
  border: 1px solid var(--black);
  padding: 1rem;
  background-color: var(--white);
}

/* Close (X) – wie in Wishlist/Register: kein Kreis, 32×32, transparent */
.box-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0;
  border: none;
  background: transparent;
  width: 32px;
  height: 32px;
  cursor: pointer;
  line-height: 0;
}
.box-close:hover { opacity: .8; }
.box-close:focus { outline: 2px solid var(--black); outline-offset: 2px; }
</style>
