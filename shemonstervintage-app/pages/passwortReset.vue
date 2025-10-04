<template>
  <div>
    <h3 class="pr_title">{{ $t("passwordReset.title") }}</h3>
    <div class="pr_subtitle">
        {{ $t("passwordReset.subtitle") }}
    </div>
    
    

    <div class="cofirmation-input-group">
      <input
        v-model="email"
        class="cofirmation-input"
        type="email"
        placeholder=" "
      />
      <label class="cofirmation-label">{{ $t("passwordReset.email") }}</label>
    </div>
    <button @click="passwordReset" type="submit">{{ $t("passwordReset.submit") }}</button>

  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";

definePageMeta({
  layout: "three",
});

const passwortReset = () => {
  // Hier können Sie die Logik zum Zurücksetzen des Passworts implementieren
  alert("Password reset link has been sent to your email.");
}
const email = ref("");

const passwordReset = async () => {
  if (!email.value) {
    alert("Please enter your email");
    return;
  }

  try {
    // Replace this URL with your backend API
    const response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value }),
    });

    if (!response.ok) {
      throw new Error("Failed to send reset email");
    }

    alert("Password reset link has been sent to your email.");
    email.value = "";
  } catch (error) {
    alert(error.message);
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

