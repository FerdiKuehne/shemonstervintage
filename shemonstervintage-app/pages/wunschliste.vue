<template>
  <div>
    <div class="container py-4">
      <h1 class="mt-5 mb-5 fw-bold text-center">{{ $t("nav.wunschliste") }}</h1>
      <componentGallery :images="wishes" />
      <button type="button"
      @click="sendViaEmail()">Anfrage</button>
    </div>
  </div>
</template>

<script setup>
import { useWishlist } from "@/composables/useWishlist";
import componentGallery from "~/components/componentGallery.vue";

const { wishes } = useWishlist();

const sendViaEmail = () => {
  const subject = encodeURIComponent("Sabotage Wunschliste");
  const body = encodeURIComponent(
    "Hallo,\n\nich möchte folgende Produkte anfragen:\n\n" +
    wishes.value.map((item, index) => `${index + 1}. ${item.title || item.name}`).join("\n") +
    "\n\nBitte senden Sie mir weitere Informationen."
  );

  const mailtoLink = `mailto:store@example.com?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
};



</script>
