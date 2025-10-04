<template>
  <div class="wishlist">
    <h2>Wishlist Page - Coming Soon!</h2>
    <div v-for="(item, i) in testData" :key="item.id" class="wishlist-item">
      <div
        @click="removeItem(item.id)"
        class="remove-item"
        style="cursor: pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-trash3"
          viewBox="0 0 16 16"
        >
          <path
            d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"
          />
        </svg>
      </div>
      <picture class="wishlist-image">
        <source
          srcset="https://picsum.photos/800/900?random=1"
          media="(min-width: 650px)"
        />
        <source
          srcset="https://picsum.photos/400/300?random=1"
          media="(min-width: 465px)"
        />
        <img
          :src="`https://picsum.photos/800/900?random=${i + 1}`"
          :alt="item.name"
          style="width: 200px; height: auto"
        />
      </picture>
      <div class="whishlist-beschreibung">{{ item.description }}</div>
      <div class="whishlist-materialien">
        Price: ${{ item.price.toFixed(2) }}
      </div>
    </div>
    <div class="whishlist-empty" v-if="testData.length === 0">
      <p>Your wishlist is empty.</p>
    </div>
    <div v-else class="wishlist-actions">
      <h3>
        Total: ${{
          testData.reduce((total, item) => total + item.price, 0).toFixed(2)
        }}
      </h3>
      <button @click="testData = []">Clear Wishlist</button>
      <button @click="sendWishlist">Send</button>
      <button @click="closePopup">Close</button>
    </div>

    <div v-if="openConfirmPopup" class="conformation-popup">
      <div class="cofirmation-input-group">
        <input v-model="person.surrname" class="cofirmation-input" placeholder=" "/>
        <label class="cofirmation-label">Your Surrname</label>
      </div>
      <div class="cofirmation-input-group">
        <input v-model="person.name" class="cofirmation-input" placeholder=" "/>
        <label class="cofirmation-label">Your Name</label>
      </div>
      <select v-model="contact" id="contact" name="fruits">
        <option disabled value="">-- Contact via --</option>
        <option value="email">Email</option>
        <option value="instagramm">Insta</option>
      </select>
      <div v-if="contact === 'email'">
        <div class="cofirmation-input-group">
          <input
            v-model="person.email"
            class="cofirmation-input"
            type="email"
            placeholder=" "
          />
          <label class="cofirmation-label">Your Email</label>
        </div>
      </div>
      <div v-if="contact === 'instagramm'">
        <div class="cofirmation-input-group">
          <input
            v-model="person.instagramm"
            class="cofirmation-input"
            type="text"
            placeholder=" "
          />
          <label class="cofirmation-label">Your instagramm</label>
        </div>
      </div>
      <input type="checkbox" class="agb" /> I accept the
      <a href="/datenschutz" target="_blank">privacy policy</a> and
      <a href="/impressum" target="_blank">imprint</a>.
      <input type="checkbox" class="blindcopy" /> I want a blind copy to my
      email.
      <div class="cofirmation-input-group">
        <input
          v-model="person.emailCopy"
          type="email"
          class="cofirmation-input"
          placeholder=" "
        />
        <label class="cofirmation-label">Your email</label>
      </div>

      <button @click="sendWishlistToEmail">Send</button>
      <div class="wishlist-toast">
        <!-- Toast notification placeholder -->
        Toast send => name email adresse
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";

definePageMeta({
  layout: "three",
});

const contact = ref("");
const openConfirmPopup = ref(false);
const person = ref({
  surrname: "",
  name: "",
  email: "",
  instagramm: "",
  emailCopy: "",
});

const removeItem = (id) => {
  testData.value = testData.value.filter((item) => item.id !== id);
};

const closePopup = () => {
  openConfirmPopup.value = false;
};

const sendWishlist = () => {
  // Placeholder for sending wishlist logic
  openConfirmPopup.value = true;
  console.log("Sending wishlist:", testData.value);
  console.log("Person info:", person.value);
};

const sendWishlistToEmail = async () => {
  // Placeholder for sending wishlist via email logic
  fetch('http://localhost:8000/wishlist.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ person: person.value, wishlist: testData.value })
            })
            .then(res => res.json())
            .then(data => {
              console.log("Sending wishlist to email:",data);
            })
            .catch(err => console.error(err));
  
};

const testData = ref([
  {
    id: 1,
    name: "Sample Item 1",
    description: "This is a sample item in the wishlist.",
    src: "https://picsum.photos/800/900?random=${i + 1}",
    price: 19.99,
  },
  {
    id: 2,
    name: "Sample Item 2",
    description: "This is another sample item in the wishlist.",
    src: "https://picsum.photos/800/900?random=${i + 1}",
    price: 29.99,
  },
  {
    id: 3,
    name: "Sample Item 3",
    description: "This is yet another sample item in the wishlist.",
    src: "https://picsum.photos/800/900?random=${i + 1}",
    price: 39.99,
  },
  {
    id: 4,
    name: "Sample Item 4",
    description: "This is yet another sample item in the wishlist.",
    src: "https://picsum.photos/800/900?random=${i + 1}",
    price: 49.99,
  },
  {
    id: 5,
    name: "Sample Item 5",
    description: "This is yet another sample item in the wishlist.",
    src: "https://picsum.photos/800/900?random=${i + 1}",
    price: 59.99,
  },
]);
</script>
<style scoped>
.wishlist {
  position: absolute; /* float above 3D background */
  top: 5rem; /* adjust spacing from top */
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 70vh; /* fixed height panel */
  overflow-y: auto; /* internal scroll */
  background-color: rgba(0, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 1rem;
  z-index: 1000; /* above Three.js canvas */
}

.whishlist-beschreibung::selection {
  color: white;
  background: black;
}

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
