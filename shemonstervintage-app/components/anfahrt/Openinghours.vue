<template>
  <div class="openinghours">
    <h4 class="mb-4 fw-bold">{{ $t("openingHours") }}</h4>
    <div>
      <div v-for="(item, idx) in openingHours" :key="idx" class="row">
        <div class="col-2">{{ item.day }}</div>
        <div class="col-3 justify-end">{{ item.hours }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const openingHours = ref([
  { day: t("monday"), hours: t("closed") },
  { day: t("tuesday"), hours: "10:00 – 19:00" },
  { day: t("wednesday"), hours: "10:00 – 19:00" },
  { day: t("thursday"), hours: "10:00 – 19:00" },
  { day: t("friday"), hours: "10:00 – 19:00" },
  { day: t("saturday"), hours: "11:00 – 18:00" },
  { day: t("sunday"), hours: t("closed") },
]);
</script>

<style scoped>
.openinghours {
  padding-bottom: 1rem;
  border-radius: 0.5rem;
}
</style>
