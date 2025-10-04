<template>
    <div>
      <h3>{{  $t("newPassword.title") }}</h3>
      
      <div class="cofirmation-input-group">
        <input
          v-model="password"
          class="cofirmation-input"
          type="password"
          placeholder=" "
        />
        <label class="cofirmation-label">{{ $t("newPassword.newPassword") }}</label>
      </div>
  
      <div class="cofirmation-input-group">
        <input
          v-model="confirmPassword"
          class="cofirmation-input"
          type="password"
          placeholder=" "
        />
        <label class="cofirmation-label">{{ $t("newPassword.confirmNewPassword") }}</label>
      </div>
  
      <button @click="resetPassword">{{ $t("newPassword.submit") }}</button>
      <div>{{ $t("newPassword.passwordResetSuccess") }}</div>
    </div>
  </template>


<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";

definePageMeta({
  layout: "three",
});

const route = useRoute();
const token = route.query.token; // get token from URL

const password = ref("");
const confirmPassword = ref("");

const resetPassword = async () => {
  if (!password.value || !confirmPassword.value) {
    alert("Please fill in all fields");
    return;
  }

  if (password.value !== confirmPassword.value) {
    alert("Passwords do not match");
    return;
  }

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        newPassword: password.value,
      }),
    });

    if (!response.ok) throw new Error("Failed to reset password");

    alert("Your password has been successfully reset!");
    password.value = "";
    confirmPassword.value = "";
  } catch (err) {
    alert(err.message);
  }
};
</script>

<style scoped>

.cofirmation-input-group {
  position: relative;
  margin-bottom: 1.5rem;
}

.cofirmation-input {
  font-size: 16px;
  padding: 10px 10px 10px 5px;
  display: block;
  width: 200px;
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
.cofirmation-input:not(:placeholder-shown) ~ .cofirmation-label  {
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