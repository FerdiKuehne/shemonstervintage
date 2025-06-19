<template>
  <div class="AnfahrtUndMap-Wrapper">
    <div class="col-12 col-md-6">
      <h4 class="mt-4 mb-4 fw-bold">{{ $t("direction") }}</h4>
      <div class="row">
        <div class="col-6">
          <p>Georg-Lechleiter-Platz 2</p>
          <p>68165 Mannheim</p>
          <p>{{ $t("germany") }}</p>
          
        </div>
        <div class="col-6 justify-end">
          <img
            src="../../public/shemonstervintageshop.webp"
            alt="Map"
            class="img-fluid"
          />
        </div>
      </div>
      <div class="openmap">
        <iframe
          width="425"
          height="350"
          src="https://www.openstreetmap.org/export/embed.html?bbox=8.47886234521866%2C49.47553163901673%2C8.481839597225191%2C49.47714546954036&amp;layer=mapnik&amp;marker=49.476338560925804%2C8.480350971221924"
          style="border: 1px solid black"
        ></iframe
        ><br /><small
          ><a
            href="https://www.openstreetmap.org/?mlat=49.476339&amp;mlon=8.480351#map=19/49.476339/8.480351"
            >Größere Karte anzeigen</a
          ></small
        >
      </div>
    </div>
  </div>
</template>

<script setup>


</script>

<style scoped>
.AnfahrtUndMap-Wrapper {
  padding: 1rem;
}

.openmap {
  padding: 1rem;
}
</style>
