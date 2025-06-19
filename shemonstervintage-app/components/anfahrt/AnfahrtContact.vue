<template>
  <div class="AnfahrtContact-Wrapper">
    <h4 class="mt-4 mb-4 fw-bold">{{ $t("contact") }}</h4>
    <div class="row">
      <div class="col-2">{{ $t("phone") }}</div>
      <div class="col-6 justify-end">
        <a
          href="tel:+491738216011"
          style="color: black; text-decoration: none"
          onmouseover="this.style.textDecoration='underline'"
          onmouseout="this.style.textDecoration='none'"
          class="col-6 justify-end d-block"
        >
          +49 1738216011
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col-2">{{ $t("email") }}</div>
      <div class="col-6 justify-end">
        <a
          href="mailto:shemonstervintage@googlemail.com"
          style="color: black; text-decoration: none"
          onmouseover="this.style.textDecoration='underline'"
          onmouseout="this.style.textDecoration='none'"
          class="col-6 justify-end d-block"
        >
          shemonstervintage@googlemail.com
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col-2">Instagram</div>
      <div class="col-6 justify-end">
        <a
          href="https://instagram.com/shemonstervintage"
          style="color: black; text-decoration: none"
          onmouseover="this.style.textDecoration='underline'"
          onmouseout="this.style.textDecoration='none'"
          class="col-6 justify-end d-block"
          target="_blank"
        >
          @shemonstervintage
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.links-a {
  padding: 0;
  border: none;
  margin-bottom: 1rem;
}

a {
  padding: 0;
}

.AnfahrtContact-Wrapper {
  padding-bottom: 5rem;
  border-radius: 0.5rem;
}
</style>