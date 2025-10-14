<template>
  <div class="password-wrapper">
    <div class="password">
      <div class="form-header">
        <h3>{{  $t("newPassword.title") }}</h3>

        <div>{{ $t("newPassword.passwordResetSuccess") }}</div>
      </div>
      
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
  
        <div class="button-wrapper">
          <div></div>
          <div>
            <button class="btn primary" @click="resetPassword">{{ $t("newPassword.submit") }}</button>
          </div>  
        </div>
    </div>
   </div>div> 
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

.password-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.password {
  width: 400px;
  border: 1px solid var(--black);
  padding: 2rem;
  background-color:var(--white);
}


</style>