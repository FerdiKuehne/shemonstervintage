<template>
  <div class="login-wrapper">
    <div class="login">
      <h1>{{ $t("login.title") }}</h1>
   
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
        <router-link to="/passwortReset">
          <button type="button">{{ $t("login.forgotPassword") }}</button>
        </router-link>
        <router-link to="/registrierung">
          <button type="button">{{ $t("login.register") }}</button>
        </router-link>

        <button type="submit">Login</button>
        <p v-if="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

definePageMeta({
  layout: "three",
});

const router = useRouter();
const email = ref("");
const password = ref("");
const user = ref(null);
const error = ref("");

async function login() {
  try {
    const response = await fetch("https://your-domain.com/api/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
      credentials: "include", // important if using PHP sessions with cookies
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    user.value = data.user; // whatever your backend sends back

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
  width: 400px;
  border: 1px solid #000;
  padding: 1rem;
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
  border-bottom: 1px solid #515151;
  background: transparent;
}

.cofirmation-label {
  position: absolute;
  pointer-events: none;
  top: 10px;
  left: 5px;
  transition: top 1s ease, font-size 0.6s ease, color 0.4s ease;
}

.cofirmation-input:focus ~ .cofirmation-label,
.cofirmation-input:not(:placeholder-shown) ~ .cofirmation-label {
  top: -10px;
  font-size: 14px;
  color: #515151;
}

.cofirmation-input:focus {
  border-width: 2px;
  border-color: #515151;
  box-shadow: inset 0 -3px 5px -3px #fffefe; /* only bottom */
}
</style>
