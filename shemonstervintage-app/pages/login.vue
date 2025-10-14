<template>
  <div class="login-wrapper">
    <div class="login">
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
  border: 1px solid var(--black);
  padding: 2rem;
  background-color: var(--white);
}



</style>
