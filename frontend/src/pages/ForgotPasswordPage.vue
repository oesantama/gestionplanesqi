<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark-page">
    <q-page-container>
      <q-page class="flex flex-center bg-dark-page q-pa-md relative-position overflow-hidden" style="min-height: 100vh;">
        <!-- Ambient Glow Background -->
        <div class="glow-bg absolute-full pointer-events-none"></div>

        <div class="qi-card q-pa-xl column items-center" style="width: 100%; max-width: 440px; z-index: 10;">
          <!-- Logo & Header -->
          <div class="row items-center justify-center q-mb-md">
            <q-img :src="logoQi" style="width: 65px; height: 65px;" fit="contain" />
          </div>

          <div class="text-h4 text-weight-bold text-white text-center q-mb-xs">
            Recuperar Contraseña
          </div>
          <div class="text-caption text-grey-4 text-center q-mb-lg">
            Ingresa tu correo registrado y te enviaremos las instrucciones para restablecer tu cuenta Qinspecting.
          </div>

          <!-- State: Form -->
          <q-form v-if="!submitted" @submit.prevent="onRequestReset" class="full-width q-gutter-y-md">
            <div>
              <div class="text-subtitle2 text-grey-3 q-mb-xs text-weight-medium">Correo Electrónico</div>
              <q-input
                v-model="email"
                outlined
                dark
                dense
                placeholder="usuario@qinspecting.com"
                color="primary"
                class="full-width"
                :rules="[
                  val => !!val || 'El correo es requerido',
                  val => /.+@.+\..+/.test(val) || 'Ingresa un correo electrónico válido'
                ]"
              >
                <template #prepend>
                  <q-icon name="email" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                text-color="dark"
                label="Enviar Instrucciones"
                no-caps
                unelevated
                class="full-width text-weight-bold qi-glow-btn text-subtitle1"
                style="border-radius: 10px; height: 48px;"
                :loading="loading"
              />
            </div>
          </q-form>

          <!-- State: Success Message -->
          <div v-else class="column items-center q-gutter-y-md full-width text-center">
            <q-avatar icon="mark_email_read" color="positive" text-color="dark" size="64px" class="q-mb-sm" />
            <div class="text-h6 text-weight-bold text-white">¡Correo Enviado!</div>
            <div class="text-body2 text-grey-3">
              Hemos enviado un enlace de recuperación a <strong>{{ email }}</strong>. Por favor revisa tu bandeja de entrada o spam.
            </div>
            <q-btn
              color="secondary"
              text-color="primary"
              label="Reenviar Correo"
              flat
              no-caps
              class="q-mt-sm"
              @click="submitted = false"
            />
          </div>

          <!-- Back to Login -->
          <div class="q-mt-xl text-center">
            <router-link to="/login" class="text-primary text-subtitle2 no-underline row items-center justify-center gap-xs">
              <q-icon name="arrow_back" size="18px" />
              <span>Volver al Inicio de Sesión</span>
            </router-link>
          </div>

          <!-- Footer Info -->
          <div class="text-center text-caption text-grey-6 q-mt-lg">
            © {{ new Date().getFullYear() }} Qinspecting
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import logoQi from '../assets/Qi.png'

const $q = useQuasar()
const email = ref('')
const loading = ref(false)
const submitted = ref(false)

function onRequestReset() {
  if (!email.value) return
  
  loading.value = true
  setTimeout(() => {
    loading.value = false
    submitted.value = true
    $q.notify({
      type: 'positive',
      message: 'Instrucciones enviadas con éxito',
      icon: 'email',
      position: 'top'
    })
  }, 900)
}
</script>

<style scoped>
.glow-bg {
  background: radial-gradient(circle at 50% 30%, rgba(0, 210, 106, 0.12) 0%, rgba(6, 16, 12, 0) 70%);
}

.no-underline {
  text-decoration: none;
}
.no-underline:hover {
  text-decoration: underline;
}
</style>
