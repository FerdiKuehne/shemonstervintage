<template>
  <div class="register-wrapper">
    <div class="register">
      <div class="page registrierung">
        <h1>{{ $t("person.register") }}</h1>
        <div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.username"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.username") }}</label>
          </div>
          <div class="cofirmation-input-group">
            <input
              v-model="person.firstname"
              class="cofirmation-input"
              type="text"
              placeholder=" "
            />
            <label class="cofirmation-label">{{ $t("person.firstname") }}</label>
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
            <label class="cofirmation-label">{{ $t("person.instagram") }}</label>
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
  // Hier können Sie die Registrierung verarbeiten, z.B. Daten an einen Server senden
  console.log("Registrierungsdaten:", person.value);
  // Beispiel: Senden der Daten an einen API-Endpunkt
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(person.value),
    });
    if (response.ok) {
      console.log("Registrierung erfolgreich");
    } else {
      console.error("Registrierung fehlgeschlagen");
    }
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);
  }
};
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

</style>
