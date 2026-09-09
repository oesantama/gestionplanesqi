<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark-page">
    <q-page-container>
      <q-page class="flex flex-center bg-dark-page q-pa-md relative-position overflow-hidden" style="min-height: 100vh;">
        <!-- Ambient Glow Background -->
        <div class="glow-bg absolute-full pointer-events-none"></div>

        <div class="qi-card q-pa-xl column items-center" style="width: 100%; max-width: 440px; z-index: 10;">
          <!-- Logo & Header -->
          <div class="row items-center justify-center q-mb-md">
            <q-img :src="logoQi" style="width: 70px; height: 70px;" fit="contain" />
          </div>

          <div class="text-h4 text-weight-bold text-white text-center q-mb-xs">
            <span class="qi-brand-text">Qinspecting</span>
          </div>
          <div class="text-caption text-grey-4 text-center q-mb-lg">
            Gestión de Planes QI & Checklist de Flotas
          </div>

          <!-- Form -->
          <q-form @submit.prevent="onLogin" class="full-width q-gutter-y-md">
            <div>
              <div class="text-subtitle2 text-grey-3 q-mb-xs text-weight-medium">Correo Electrónico o Usuario</div>
              <q-input
                v-model="username"
                outlined
                dark
                dense
                placeholder="admin"
                color="primary"
                class="full-width"
                :rules="[val => !!val || 'El correo o usuario es requerido']"
              >
                <template #prepend>
                  <q-icon name="email" color="primary" />
                </template>
              </q-input>
            </div>

            <div>
              <div class="text-subtitle2 text-grey-3 q-mb-xs text-weight-medium">Contraseña</div>
              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                outlined
                dark
                dense
                placeholder="••••••••"
                color="primary"
                class="full-width"
                :rules="[val => !!val || 'La contraseña es requerida']"
              >
                <template #prepend>
                  <q-icon name="lock" color="primary" />
                </template>
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility' : 'visibility_off'"
                    class="cursor-pointer text-grey-5"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
            </div>

            <div class="row items-center justify-between q-mt-sm">
              <q-checkbox v-model="rememberMe" label="Recordarme" dark color="primary" dense />
              <router-link to="/recuperar-contrasena" class="text-primary text-caption text-weight-medium no-underline hover-underline">
                ¿Olvidaste tu contraseña?
              </router-link>
            </div>

            <div class="q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                text-color="dark"
                label="Iniciar Sesión"
                no-caps
                unelevated
                class="full-width text-weight-bold qi-glow-btn text-subtitle1 py-sm"
                style="border-radius: 10px; height: 48px;"
                :loading="loading"
              />
            </div>
          </q-form>

          <!-- Configuración de Servidor & Diagnóstico button -->
          <div class="q-mt-md full-width row justify-center">
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="tune"
              label="Configurar Servidor & Diagnóstico (Logs)"
              class="text-caption"
              @click="showDiagnosticModal = true"
            />
          </div>

          <!-- Footer Info -->
          <div class="text-center text-caption text-grey-6 q-mt-md">
            © {{ new Date().getFullYear() }} Qinspecting. Todos los derechos reservados.
          </div>
        </div>

        <DiagnosticDialog v-model="showDiagnosticModal" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'
import { localUserDb } from '../services/localUserDb'
import DiagnosticDialog from '../components/DiagnosticDialog.vue'
import logoQi from '../assets/logo.png'

const showDiagnosticModal = ref(false)

const $q = useQuasar()
const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const loading = ref(false)

onMounted(() => {
  const existingToken = localStorage.getItem('qi_token')
  if (existingToken) {
    router.push('/')
  }
})

async function onLogin() {
  if (!username.value || !password.value) return
  
  loading.value = true
  const inputUser = username.value.trim()
  const inputPass = password.value

  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: inputUser, password: inputPass })
    })

    const contentType = response.headers.get('content-type') || ''
    let data = {}

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      console.error('Respuesta no JSON del servidor:', text)
      throw new Error(`El servidor API no devolvió una respuesta válida (${response.status})`)
    }

    if (!response.ok) {
      throw new Error(data.message || 'Error en autenticación')
    }

    // Guardar sesión y token JWT
    localStorage.setItem('qi_token', data.token)
    localStorage.setItem('qi_user', JSON.stringify(data.usuario))

    // Guardar credenciales en la base de datos local para validación offline futura
    localUserDb.saveUser(inputUser, inputPass, data.token, data.usuario)

    const isOfflineSession = data.offline || (typeof navigator !== 'undefined' && !navigator.onLine)

    $q.notify({
      type: isOfflineSession ? 'warning' : 'positive',
      message: isOfflineSession
        ? `📶 Modo Sin Conexión: Sesión iniciada correctamente para ${data.usuario.nombre_completo || inputUser}`
        : `¡Bienvenido ${data.usuario.nombre_completo || inputUser}!`,
      icon: isOfflineSession ? 'cloud_off' : 'verified_user',
      position: 'top',
      timeout: 4000
    })

    if (window.location.hash) {
      window.location.hash = '#/'
    }
    await router.push('/')
  } catch (err) {
    // Si apiFetch falló por cualquier motivo de red, intentar respaldo directo con la base local de usuarios
    const authRes = localUserDb.authenticate(inputUser, inputPass)

    if (authRes.status === 'SUCCESS') {
      const { user } = authRes
      localStorage.setItem('qi_token', user.token)
      localStorage.setItem('qi_user', JSON.stringify(user.usuario))

      $q.notify({
        type: 'positive',
        message: `📶 Modo Sin Conexión: Sesión iniciada para ${user.usuario.nombre_completo || inputUser} (Validación local)`,
        icon: 'cloud_off',
        position: 'top',
        timeout: 5000
      })

      router.push('/')
      return
    }

    $q.notify({
      type: 'negative',
      message: err.message || 'No fue posible iniciar sesión',
      icon: 'error',
      position: 'top',
      timeout: 6000
    })
  } finally {
    loading.value = false
  }
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
