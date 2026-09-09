<template>
  <q-page class="q-pa-md q-pa-sm-lg bg-dark-page text-white overflow-hidden">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Mi Perfil de Usuario</div>
        <div class="text-caption text-grey-4">Información personal, credenciales y seguridad de la cuenta</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Tarjeta de Perfil -->
      <div class="col-12 col-md-4">
        <q-card class="qi-card q-pa-md column items-center text-center overflow-hidden">
          <q-avatar size="90px" color="secondary" text-color="primary" class="text-weight-bolder text-h3 border-glow q-mb-sm">
            {{ userInitial }}
          </q-avatar>

          <div class="text-h6 text-weight-bold text-white ellipsis full-width">{{ profile.nombre_completo || 'Usuario' }}</div>
          <div class="text-subtitle2 text-primary q-mb-xs">{{ profile.rol_nombre || 'Rol' }}</div>
          <div class="text-caption text-grey-5 q-mb-sm word-break-all full-width">{{ profile.email }}</div>

          <q-chip color="positive" text-color="dark" icon="shield" size="sm" class="text-weight-bold">
            Sesión Segura ISO 27001 / BASC
          </q-chip>
        </q-card>
      </div>

      <!-- Formulario de Edición -->
      <div class="col-12 col-md-8">
        <q-card class="qi-card q-pa-lg">
          <div class="text-h6 text-weight-bold text-white q-mb-md row items-center">
            <q-icon name="person" color="primary" class="q-mr-sm" />
            Información Personal
          </div>

          <q-form @submit.prevent="updateProfile" class="q-gutter-y-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="profile.username"
                  label="Nombre de Usuario"
                  outlined
                  dark
                  dense
                  disable
                  color="primary"
                >
                  <template #prepend>
                    <q-icon name="account_circle" color="grey-5" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="profile.rol_nombre"
                  label="Rol Asignado"
                  outlined
                  dark
                  dense
                  disable
                  color="primary"
                >
                  <template #prepend>
                    <q-icon name="badge" color="grey-5" />
                  </template>
                </q-input>
              </div>
            </div>

            <q-input
              v-model="form.nombre_completo"
              label="Nombre Completo *"
              outlined
              dark
              dense
              color="primary"
              :rules="[val => !!val || 'El nombre completo es requerido']"
            >
              <template #prepend>
                <q-icon name="badge" color="primary" />
              </template>
            </q-input>

            <q-input
              v-model="form.email"
              label="Correo Electrónico *"
              type="email"
              outlined
              dark
              dense
              color="primary"
              :rules="[val => !!val || 'El correo electrónico es requerido']"
            >
              <template #prepend>
                <q-icon name="email" color="primary" />
              </template>
            </q-input>

            <q-separator dark class="q-my-lg" />

            <div class="text-h6 text-weight-bold text-white q-mb-md row items-center">
              <q-icon name="lock" color="warning" class="q-mr-sm" />
              Cambiar Contraseña (Opcional)
            </div>

            <q-input
              v-model="form.password_actual"
              :type="showCurrentPassword ? 'text' : 'password'"
              label="Contraseña Actual"
              outlined
              dark
              dense
              color="primary"
            >
              <template #prepend>
                <q-icon name="lock" color="warning" />
              </template>
              <template #append>
                <q-icon
                  :name="showCurrentPassword ? 'visibility' : 'visibility_off'"
                  class="cursor-pointer text-grey-4"
                  @click="showCurrentPassword = !showCurrentPassword"
                />
              </template>
            </q-input>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.password_nueva"
                  :type="showNewPassword ? 'text' : 'password'"
                  label="Nueva Contraseña"
                  outlined
                  dark
                  dense
                  color="primary"
                  hint="Min. 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (!@#$%^&*)"
                >
                  <template #prepend>
                    <q-icon name="key" color="primary" />
                  </template>
                  <template #append>
                    <q-icon
                      :name="showNewPassword ? 'visibility' : 'visibility_off'"
                      class="cursor-pointer text-grey-4"
                      @click="showNewPassword = !showNewPassword"
                    />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.password_confirmar"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  label="Confirmar Nueva Contraseña"
                  outlined
                  dark
                  dense
                  color="primary"
                >
                  <template #prepend>
                    <q-icon name="key" color="primary" />
                  </template>
                  <template #append>
                    <q-icon
                      :name="showConfirmPassword ? 'visibility' : 'visibility_off'"
                      class="cursor-pointer text-grey-4"
                      @click="showConfirmPassword = !showConfirmPassword"
                    />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="row justify-end q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                text-color="dark"
                label="Guardar Cambios"
                icon="save"
                no-caps
                unelevated
                class="text-weight-bold px-lg py-sm"
                style="border-radius: 8px;"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'

const $q = useQuasar()

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const profile = ref({
  id: null,
  username: '',
  email: '',
  nombre_completo: '',
  rol_nombre: ''
})

const form = ref({
  nombre_completo: '',
  email: '',
  password_actual: '',
  password_nueva: '',
  password_confirmar: ''
})

const saving = ref(false)

const userInitial = computed(() => {
  return (profile.value.nombre_completo || 'A').charAt(0).toUpperCase()
})

function validatePasswordComplexity(pass) {
  if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(pass)) return 'La contraseña debe contener al menos una letra mayúscula (A-Z)'
  if (!/[a-z]/.test(pass)) return 'La contraseña debe contener al menos una letra minúscula (a-z)'
  if (!/[0-9]/.test(pass)) return 'La contraseña debe contener al menos un número (0-9)'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'La contraseña debe contener al menos un carácter especial (!@#$%^&*)'
  return null
}

async function fetchPerfil() {
  try {
    const res = await apiFetch('/perfil')
    if (res.ok) {
      const data = await res.json()
      profile.value = data
      form.value.nombre_completo = data.nombre_completo
      form.value.email = data.email
    }
  } catch (err) {
    console.error('Error al cargar perfil:', err)
  }
}

async function updateProfile() {
  if (!form.value.nombre_completo || !form.value.email) {
    $q.notify({ type: 'negative', message: 'Nombre y correo son requeridos', position: 'top' })
    return
  }

  if (form.value.password_nueva) {
    if (!form.value.password_actual) {
      $q.notify({ type: 'negative', message: 'Ingresa tu contraseña actual para confirmar el cambio', position: 'top' })
      return
    }

    const errorMsg = validatePasswordComplexity(form.value.password_nueva)
    if (errorMsg) {
      $q.notify({ type: 'negative', message: errorMsg, position: 'top', timeout: 5000 })
      return
    }

    if (form.value.password_nueva !== form.value.password_confirmar) {
      $q.notify({ type: 'negative', message: 'Las nuevas contraseñas no coinciden', position: 'top' })
      return
    }
  }

  saving.value = true
  try {
    const res = await apiFetch('/perfil', {
      method: 'PUT',
      body: JSON.stringify({
        nombre_completo: form.value.nombre_completo,
        email: form.value.email,
        password_actual: form.value.password_actual,
        password_nueva: form.value.password_nueva
      })
    })

    if (res.ok) {
      const data = await res.json()
      $q.notify({
        type: 'positive',
        message: '¡Perfil actualizado exitosamente!',
        position: 'top'
      })

      localStorage.setItem('qi_user', JSON.stringify(data.usuario))
      profile.value = data.usuario
      form.value.password_actual = ''
      form.value.password_nueva = ''
      form.value.password_confirmar = ''

      window.location.reload()
    }
  } catch (err) {
    console.error('Error al actualizar perfil:', err)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchPerfil()
})
</script>

<style scoped>
.word-break-all {
  word-break: break-all;
  overflow-wrap: anywhere;
}
.border-glow {
  border: 1.5px solid #00D26A;
  box-shadow: 0 0 15px rgba(0, 210, 106, 0.2);
}
</style>
