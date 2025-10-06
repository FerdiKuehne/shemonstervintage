<template>
  <div class="register-wrapper">
    <div class="register">
      <div class="page registrierung">
        <h1>{{ $t("person.register") }}</h1>
        <div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.username"
              class="cofirmation-input hammer-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.username") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.name"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{
              $t("person.firstName")
            }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.surname"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.surname") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.email"
              class="cofirmation-input"
              type="email"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.email") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.phone"
              class="cofirmation-input"
              type="tel"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.phone") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.instagram"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{
              $t("person.instagram")
            }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.street"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.street") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.street_number"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{
              $t("person.street_number")
            }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.zipcode"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.zipcode") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.city"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.city") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.country"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.country") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.password"
              class="cofirmation-input"
              type="password"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.password") }}</label>
          </div>

          <div class="register-button" @click="register">
            {{ $t("register") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

definePageMeta({
  layout: "three",
});

const person = ref({
  username: "",
  password: "",
  email: "",
  name: "",
  surname: "",
  zipcode: "",
  street: "",
  street_number: "",
  city: "",
  country: "",
  phone: "",
  instagram: "",
});

const register = async () => {

  try {
    const response = await fetch("http://localhost:8000/register.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(person.value),
    });
    if (response.ok) {
        const data = await response.json(); // 👈 read the stream here
      console.log("Registrierung erfolgreich",data);
    } else {
        const data = await response.json();
      console.error("Registrierung fehlgeschlagen", data);
    }
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);
  }
};

onMounted(() => {
  const inputs = document.querySelectorAll(".hammer-input");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      // restart hammer animation on every keystroke
      input.classList.remove("hammer");
      void input.offsetWidth; // force reflow
      input.classList.add("hammer");
    });
  });
});
</script>

<style scoped>
.register-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.register {
  width: 60%;
  border: 1px solid #000;
  padding: 1rem;
}


.hammer {
  animation: ease-in 0.3s typewriterTap;

}

@keyframes typewriterTap {
  0%   { transform: scaleY(1); }
  30%  { transform: scaleY(0.85) ; } /* key press down */
  60%  { transform: scaleY(1.05) ; } /* slight bounce back */
  100% { transform: scaleY(1); } /* rest */
}
</style>
