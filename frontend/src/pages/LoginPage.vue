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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'
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

async function onLogin() {
  if (!username.value || !password.value) return
  
  loading.value = true
  const inputKey = username.value.trim().toLowerCase()

  // Soporte para inicio de sesión en Modo Sin Conexión (Offline)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineUsersRaw = localStorage.getItem('qi_offline_users') || '{}'
    let offlineUsers = {}
    try { offlineUsers = JSON.parse(offlineUsersRaw) } catch (e) {}

    const matchedUser = offlineUsers[inputKey] || Object.values(offlineUsers).find(u => u.username.toLowerCase() === inputKey)

    if (matchedUser && matchedUser.password === password.value) {
      localStorage.setItem('qi_token', matchedUser.token)
      localStorage.setItem('qi_user', JSON.stringify(matchedUser.usuario))

      $q.notify({
        type: 'positive',
        message: `📶 Modo Sin Conexión Activo: Sesión iniciada para ${matchedUser.usuario.nombre_completo || username.value}`,
        icon: 'cloud_off',
        position: 'top',
        timeout: 5000
      })
      loading.value = false
      router.push('/')
      return
    }

    // Si no coincide la clave pero hay una sesión activa previa cargada
    const cachedUserRaw = localStorage.getItem('qi_user')
    const cachedToken = localStorage.getItem('qi_token')
    if (cachedUserRaw && cachedToken) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw)
        $q.notify({
          type: 'info',
          message: `📶 Modo Sin Conexión: Sesión recuperada para ${cachedUser.nombre_completo || username.value}`,
          icon: 'cloud_off',
          position: 'top',
          timeout: 5000
        })
        loading.value = false
        router.push('/')
        return
      } catch (e) {}
    }

    $q.notify({
      type: 'warning',
      message: '📶 Dispositivo sin datos móviles ni internet. Para validar este usuario por primera vez necesitas conexión a red.',
      icon: 'wifi_off',
      position: 'top',
      timeout: 6000
    })
    loading.value = false
    return
  }

  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.value, password: password.value })
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

    // Guardar credenciales para autenticación offline en este dispositivo
    const offlineUsersRaw = localStorage.getItem('qi_offline_users') || '{}'
    let offlineUsers = {}
    try { offlineUsers = JSON.parse(offlineUsersRaw) } catch (e) {}
    offlineUsers[inputKey] = {
      username: username.value,
      password: password.value,
      token: data.token,
      usuario: data.usuario
    }
    localStorage.setItem('qi_offline_users', JSON.stringify(offlineUsers))

    $q.notify({
      type: 'positive',
      message: `¡Bienvenido ${data.usuario.nombre_completo}!`,
      icon: 'verified_user',
      position: 'top'
    })

    router.push('/')
  } catch (err) {
    // Si la llamada falló por error de red/offline durante el intento de login
    const isOfflineErr = (typeof navigator !== 'undefined' && !navigator.onLine) || err.message.includes('sin conexión')
    
    if (isOfflineErr) {
      const offlineUsersRaw = localStorage.getItem('qi_offline_users') || '{}'
      let offlineUsers = {}
      try { offlineUsers = JSON.parse(offlineUsersRaw) } catch (e) {}
      const matchedUser = offlineUsers[inputKey] || Object.values(offlineUsers)[0]

      if (matchedUser) {
        localStorage.setItem('qi_token', matchedUser.token)
        localStorage.setItem('qi_user', JSON.stringify(matchedUser.usuario))

        $q.notify({
          type: 'positive',
          message: `📶 Modo Sin Conexión: Sesión recuperada para ${matchedUser.usuario.nombre_completo}`,
          icon: 'cloud_off',
          position: 'top',
          timeout: 5000
        })
        router.push('/')
        return
      }
    }

    $q.notify({
      type: isOfflineErr ? 'warning' : 'negative',
      message: err.message || 'No fue posible iniciar sesión',
      icon: isOfflineErr ? 'wifi_off' : 'error',
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
