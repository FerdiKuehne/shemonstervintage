<template>
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
