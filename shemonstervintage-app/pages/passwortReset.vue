<template>
  <div class="pwforgot-wrapper">
    <div class="pwforgot">
      <!-- Close (X) – identisch zu Login/Register -->
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
          <button class="btn primary" @click="passwordReset" type="button">
            {{ $t("passwordReset.submit") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "#imports"; // Nuxt 3

definePageMeta({ layout: "three" });

const router = useRouter();
const email = ref("");

function closeBox() {
  router.push("/"); // immer Home
}

const passwordReset = async () => {
  if (!email.value) {
    alert("Please enter your email");
    return;
  }
  try {
    const response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value }),
    });
    if (!response.ok) throw new Error("Failed to send reset email");
    alert("Password reset link has been sent to your email.");
    email.value = "";
  } catch (error) {
    alert(error.message);
  }
};
</script>

<style scoped>
.pwforgot-wrapper {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100vh;
}

.pwforgot {
  position: relative;           /* für das X */
  width: 400px;
  border: 1px solid var(--black);
  padding: 1rem;
  background-color: var(--white);
  z-index: 9998;                /* über evtl. Overlays */
}

/* Close (X) – exakt wie Login/Register */
.box-close {
  position: absolute;
  top: 1rem; right: 1rem;
  padding: 0; border: none; background: transparent;
  width: 32px; height: 32px; cursor: pointer; line-height: 0;
  z-index: 9999;
  pointer-events: auto;
}
.box-close:hover { opacity: .8; }

/* (Deine bestehenden Styles können hier weiter unten folgen) */
</style>
