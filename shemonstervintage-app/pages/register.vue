<template>
  <div class="register-wrapper">
    <div class="register">
      <!-- Stepper/Header -->
      <div class="wizard-header">
        <h1>{{ $t("person.register") }}</h1>
        <div class="steps">
          <div v-for="(s, i) in steps" :key="s.key" class="step" :class="{ active: i === step, done: i < step }">
            <div class="bullet">{{ i + 1 }}</div>
            <div class="label">{{ s.label }}</div>
          </div>
        </div>
        <div class="progress">
          <div class="bar" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <div class="page registrierung container p-0">
        <div class="row">
          <!-- STEP 1: Person -->
          <template v-if="step === 0">
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.username" class="cofirmation-input hammer-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.username") }}</label>
                <p v-if="errors.username" class="err">{{ errors.username }}</p>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.name" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.firstName") }}</label>
                <p v-if="errors.name" class="err">{{ errors.name }}</p>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.surname" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.surname") }}</label>
                <p v-if="errors.surname" class="err">{{ errors.surname }}</p>
              </div>
           </div>
          </template>

          <!-- STEP 2: Kontaktdaten -->
          <template v-else-if="step === 1">
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.email" class="cofirmation-input" type="email" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.email") }}</label>
                <p v-if="errors.email" class="err">{{ errors.email }}</p>
              </div>  
            </div>
            <div class="cofirmation-input-group col-6 p-0">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.phone" class="cofirmation-input" type="tel" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.phone") }}</label>
              </div>  
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.instagram" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.instagram") }}</label>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.street" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.street") }}</label>
              </div>  
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.street_number" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.street_number") }}</label>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.zipcode" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.zipcode") }}</label>
              </div>  
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.city" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.city") }}</label>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.country" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.country") }}</label>
              </div>
            </div>
          </template>

          <!-- STEP 3: Passwortvergabe -->
          <template v-else>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.password" class="cofirmation-input" type="password" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.password") }}</label>
                <p v-if="errors.password" class="err">{{ errors.password }}</p>
              </div>
            </div>
            <div class="cofirmation-input-group col-6">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="confirmPassword" class="cofirmation-input" type="password" placeholder=" " />
                <label class="cofirmation-label">{{ $t("auth.confirmPassword") || 'Passwort bestätigen' }}</label>
                <p v-if="errors.confirmPassword" class="err">{{ errors.confirmPassword }}</p>
              </div>  
            </div>

            <!-- Optional: AGB / Datenschutz Checkbox -->
            <div class="cofirmation-input-group col-12" v-if="showTerms">
              <label class="checkbox">
                <input type="checkbox" v-model="acceptTerms" />
                <span>{{ $t('auth.acceptTerms') || 'Ich akzeptiere die AGB und Datenschutzbestimmungen' }}</span>
              </label>
              <p v-if="errors.terms" class="err">{{ errors.terms }}</p>
            </div>
          </template>

          <!-- Wizard Controls -->
          <div class="wizard-controls col-12">
            <button class="btn secondary" :disabled="step === 0" @click="prev">{{ $t('common.back') || 'Zurück' }}</button>
            <button v-if="step < steps.length - 1" class="btn primary" :disabled="!canGoNext" @click="next">{{ $t('common.next') || 'Weiter' }}</button>
            <button v-else class="btn primary" :disabled="submitting || !canSubmit" @click="submit">
              <span v-if="submitting">{{ $t('common.sending') || 'Sende…' }}</span>
              <span v-else>{{ $t('register') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'

definePageMeta({ layout: 'three' })

const steps = [
  { key: 'person', label: 'Person' },
  { key: 'contact', label: 'Kontaktdaten' },
  { key: 'password', label: 'Passwort' }
]

const step = ref(0)
const submitting = ref(false)
const showTerms = false // ggf. auf true setzen und i18n-Keys bereitstellen
const acceptTerms = ref(false)

const person = ref({
  username: '',
  password: '',
  email: '',
  name: '',
  surname: '',
  zipcode: '',
  street: '',
  street_number: '',
  city: '',
  country: '',
  phone: '',
  instagram: ''
})

const confirmPassword = ref('')
const errors = ref({})

const progress = computed(() => Math.round(((step.value + 1) / steps.length) * 100))

function validateCurrentStep () {
  const e = {}
  if (step.value === 0) {
    if (!person.value.username) e.username = 'Benutzername ist erforderlich'
    if (!person.value.name) e.name = 'Vorname ist erforderlich'
    if (!person.value.surname) e.surname = 'Nachname ist erforderlich'
  } else if (step.value === 1) {
    if (!person.value.email) e.email = 'E-Mail ist erforderlich'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.value.email)) e.email = 'Bitte gültige E-Mail angeben'
  } else if (step.value === 2) {
    if (!person.value.password) e.password = 'Passwort ist erforderlich'
    else if (person.value.password.length < 8) e.password = 'Mind. 8 Zeichen'
    if (confirmPassword.value !== person.value.password) e.confirmPassword = 'Passwörter stimmen nicht überein'
    if (showTerms && !acceptTerms.value) e.terms = 'Bitte AGB/Datenschutz akzeptieren'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const canGoNext = computed(() => validateCurrentStep())
const canSubmit = computed(() => validateCurrentStep())

function next () {
  if (validateCurrentStep() && step.value < steps.length - 1) step.value++
}
function prev () {
  if (step.value > 0) step.value--
}

async function submit () {
  if (!validateCurrentStep()) return
  submitting.value = true
  try {
    const response = await fetch('http://localhost:8000/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person.value)
    })
    const data = await response.json()
    if (!response.ok) throw data
    // Erfolg: hier ggf. Routing, Toast etc.
    console.log('Registrierung erfolgreich', data)
  } catch (err) {
    console.error('Registrierung fehlgeschlagen', err)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const inputs = document.querySelectorAll('.hammer-input')
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('hammer')
      void input.offsetWidth
      input.classList.add('hammer')
    })
  })
})
</script>

<style scoped>
.register-wrapper { display:flex; align-items:center; justify-content:center; width:100%; height:100vh; }
.register { width:60%; border:1px solid var(--black); padding:2rem; background-color:var(--white); }

/* Stepper */
.wizard-header { margin-bottom: 3rem; }
.steps { display:flex; gap:1rem; align-items:center; margin-bottom: .5rem; flex-wrap: wrap;}
.step { display:flex; align-items:center; gap:.5rem; opacity:.6; width: calc(33.333% - .67rem); }
.step.active, .step.done { opacity:1; }
.bullet { width:28px; height:28px; border-radius:50%; border:1px solid var(--black); display:grid; place-items:center; font-size:.9rem; }
.step.done .bullet { background: var(--black); color: var(--white); }
.label { font-weight:600; }
.progress { height:2px; background: #eee; overflow:hidden; }
.progress .bar { height:100%; background: var(--black); width:0; transition: width .25s ease; }

/* Controls */
.wizard-controls { display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem; }
.btn { border:1px solid var(--black); background:transparent; padding:.5rem 1rem; cursor:pointer; }
.btn.primary { background: var(--black); color: var(--white); }
.btn[disabled] { opacity:.5; cursor:not-allowed; }

/* Existing styles */
.hammer { animation: ease-in .3s typewriterTap; }
@keyframes typewriterTap { 0%{transform:scaleY(1)} 30%{transform:scaleY(.85)} 60%{transform:scaleY(1.05)} 100%{transform:scaleY(1)} }

/* Small helper for errors */
.err { color: #c62828; font-size: .85rem; margin-top: .25rem; }
</style>
