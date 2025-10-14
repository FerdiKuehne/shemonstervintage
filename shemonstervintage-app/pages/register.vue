<template>
  <div class="register-wrapper">
    <div class="register">
      <!-- Stepper/Header -->
      <div class="wizard-header">
        <h1>{{ $t("person.register") }}</h1>
        <div class="steps">
          <div
            v-for="(s, i) in steps"
            :key="s.key"
            class="step"
            :class="{ current: i === step, done: isStepDone(i) }"
          >
            <div class="bullet">
              <span v-if="isStepDone(i)">✓</span>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div class="label">{{ s.label }}</div>
          </div>
        </div>
        <div class="progress" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="bar" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <div class="page registrierung container p-0">
        <div class="row">
          <template v-if="step === 0">
            <!-- STEP 1: Person -->
            <div class="col-6 input-group-wrap"> 
              <div class="cofirmation-input-group">
                <div class="cofirmation-input-group-wrap">
                  <input v-model.trim="person.username" class="cofirmation-input" type="text" placeholder=" " />
                  <label class="cofirmation-label">{{ $t("person.username") }}</label>
                </div>
              </div>
              <p v-if="errors.username" class="err">{{ errors.username }}</p> 
            </div>

            <div class="col-6 input-group-wrap">  
              <div class="cofirmation-input-group">
                <div class="cofirmation-input-group-wrap">
                  <input v-model.trim="person.name" class="cofirmation-input" type="text" placeholder=" " />
                  <label class="cofirmation-label">{{ $t("person.firstName") }}</label>
                </div>
              </div>
              <p v-if="errors.name" class="err">{{ errors.name }}</p>
            </div>

            <div class="col-6 input-group-wrap">  
              <div class="cofirmation-input-group">
                <div class="cofirmation-input-group-wrap">
                  <input v-model.trim="person.surname" class="cofirmation-input" type="text" placeholder=" " />
                  <label class="cofirmation-label">{{ $t("person.surname") }}</label>
                </div>
              </div>
              <p v-if="errors.surname" class="err">{{ errors.surname }}</p>
            </div>
          </template>

          <template v-else-if="step === 1">
            <!-- STEP 2: Kontaktdaten -->
            <div class="col-6 input-group-wrap"> 
              <div class="cofirmation-input-group">
                <div class="cofirmation-input-group-wrap">
                  <input v-model.trim="person.email" class="cofirmation-input" type="email" placeholder=" " />
                  <label class="cofirmation-label">{{ $t("person.email") }}</label>
                </div>
              </div>
             <p v-if="errors.email" class="err">{{ errors.email }}</p>
            </div>

           <div class="col-6 input-group-wrap"> 
              <div class="cofirmation-input-group">
                <div class="cofirmation-input-group-wrap">
                  <input v-model.trim="person.phone" class="cofirmation-input" type="tel" placeholder=" " />
                  <label class="cofirmation-label">{{ $t("person.phone") }}</label>
                </div>
             </div>
           </div>

          <div class="col-6 input-group-wrap">   
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.instagram" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.instagram") }}</label>
              </div>
            </div>
          </div>    

          <div class="col-6 input-group-wrap">            
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.street" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.street") }}</label>
              </div>
            </div>
         </div> 

          <div class="col-6 input-group-wrap">       
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.street_number" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.street_number") }}</label>
              </div>
            </div>
          </div>  

          <div class="col-6 input-group-wrap">            
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.zipcode" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.zipcode") }}</label>
              </div>
            </div>
          </div> 

          <div class="col-6 input-group-wrap">  
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.city" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.city") }}</label>
              </div>
            </div>
          </div>  

          <div class="col-6 input-group-wrap">  
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.country" class="cofirmation-input" type="text" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.country") }}</label>
              </div>
            </div>
          </div>

          </template>

          <template v-else>
            <!-- STEP 3: Passwortvergabe -->
          <div class="col-6 input-group-wrap">              
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="person.password" class="cofirmation-input" type="password" placeholder=" " />
                <label class="cofirmation-label">{{ $t("person.password") }}</label>
              </div>
            </div>
             <p v-if="errors.password" class="err">{{ errors.password }}</p>
          </div>

           <div class="col-6 input-group-wrap">               
            <div class="cofirmation-input-group">
              <div class="cofirmation-input-group-wrap">
                <input v-model.trim="confirmPassword" class="cofirmation-input" type="password" placeholder=" " />
                <label class="cofirmation-label">{{ $t("auth.confirmPassword") || 'Passwort bestätigen' }}</label>
              </div>
            </div>
            <p v-if="errors.confirmPassword" class="err">{{ errors.confirmPassword }}</p>
           </div>

            <div class="cofirmation-input-group col-12" v-if="showTerms">
              <!-- Optional: AGB / Datenschutz Checkbox -->
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
  { key: 'person', label: 'Person', fields: ['username','name','surname'] },
  { key: 'contact', label: 'Kontaktdaten', fields: ['email','phone','instagram','street','street_number','zipcode','city','country'] },
  { key: 'password', label: 'Passwort', fields: ['password','confirmPassword'] }
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

// --- PROGRESS: wächst pro ausgefülltem Feld ---
// Konfiguration, was als "gefüllt" zählt
const fieldConfig = [
  { key: 'username', required: true },
  { key: 'name', required: true },
  { key: 'surname', required: true },
  { key: 'email', required: true, validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { key: 'phone', required: false },
  { key: 'instagram', required: false },
  { key: 'street', required: false },
  { key: 'street_number', required: false },
  { key: 'zipcode', required: false },
  { key: 'city', required: false },
  { key: 'country', required: false },
  { key: 'password', required: true, validator: (v) => (v?.length || 0) >= 8 },
  { key: 'confirmPassword', required: true, validator: () => confirmPassword.value === person.value.password }
]

const includeOptionalInProgress = true // falls false: nur required Felder zählen

const totalFields = computed(() => fieldConfig.filter(f => includeOptionalInProgress || f.required).length)

function getValue (key) {
  if (key === 'confirmPassword') return confirmPassword.value
  return person.value[key]
}

const completedFields = computed(() => {
  return fieldConfig
    .filter(f => includeOptionalInProgress || f.required)
    .reduce((acc, f) => {
      const val = getValue(f.key)
      const hasVal = typeof val === 'string' ? val.trim().length > 0 : !!val
      const isValid = f.validator ? f.validator(val) : true
      return acc + (hasVal && isValid ? 1 : 0)
    }, 0)
})

const progress = computed(() => {
  const total = totalFields.value || 1
  return Math.round((completedFields.value / total) * 100)
})

// Step-Validierung
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

function isStepDone (idx) {
  const keys = steps[idx].fields
  return keys.every(k => {
    const val = getValue(k)
    const cfg = fieldConfig.find(f => f.key === k)
    const hasVal = typeof val === 'string' ? val.trim().length > 0 : !!val
    const valid = cfg?.validator ? cfg.validator(val) : true
    return hasVal && valid
  })
}

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
    const response = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person.value)
    })
    const data = await response.json()
    if (!response.ok) throw data
    console.log('Registrierung erfolgreich', data)
  } catch (err) {
    console.error('Registrierung fehlgeschlagen', err)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {

})
</script>

<style scoped>
.register-wrapper { 
  display: flex; 
  align-items: center; 
  justify-content:center; 
  width:100%; 
  height:100vh; 
}

.register { 
  width: 40%; 
  border: 1px solid var(--black); 
  padding: 2rem; 
  background-color: var(--white); 
}

/* Stepper */
.wizard-header { 
  margin-bottom: 3rem; 
}

.steps { 
  display: flex; 
  align-items: center; 
  flex-wrap: wrap;
  gap: .75rem 1rem;
  margin-bottom: 1rem;
  justify-content: space-between;
  width: 100%;
}

.step { 
  display: flex; 
  align-items: center; 
  gap: .5rem;
  position: relative;
  opacity: .7;
}

.step.current { opacity: 1; }
.step.done { opacity: 1; }

.bullet { 
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--black);
  display: grid;
  place-items: center;
  font-size: .9rem;
}

.step.current .bullet { background: var(--black); color: var(--white); }
.step.done .bullet { background: var(--black); color: var(--white); }

.label { font-weight: 600; }

/* Progressbar: wächst pro Feld */
.progress {
  height: 2px;
  overflow: hidden;
  border-radius: 0;
  background: #f0f0f0;
}
.progress .bar { 
  height: 100%; 
  background: var(--black); 
  width:0; 
  transition: width .2s linear; 
}
/* optionale "Ticks" unter der Progressbar – je Feld ein Tick */




/* Controls */
.wizard-controls { display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem; }
.btn { border:1px solid var(--black); background:transparent; padding:.5rem 1rem; cursor:pointer; }
.btn.primary { background: var(--black); color: var(--white); }
.btn[disabled] { opacity:.5; cursor:not-allowed; }

/* Existing styles */
.hammer { animation: ease-in .3s typewriterTap; }
@keyframes typewriterTap { 0%{transform:scaleY(1)} 30%{transform:scaleY(.85)} 60%{transform:scaleY(1.05)} 100%{transform:scaleY(1)} }

/* Small helper for errors */
.err { color: #999; font-size: .75rem;  position: absolute; top: 46px; }
</style>
