<template>
  <div class="pwforgot-wrapper">
    <div class="pwforgot">
      <div class="form-header">
        <h3 class="pr_title">{{ $t("passwordReset.title") }}</h3>
        <div class="pr_subtitle">
            {{ $t("passwordReset.subtitle") }}
        </div>
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


    <div class="button-wrapper">
      <div></div>
      <div>
        <button class="btn primary" @click="passwordReset" type="submit">{{ $t("passwordReset.submit") }}</button>
      </div> 
    </div> 

  </div>
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

.pwforgot-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.pwforgot {
  width: 400px;
  border: 1px solid var(--black);
  padding: 2rem;
  background-color:var(--white);
}

</style>

