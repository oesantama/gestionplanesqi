<template>
  <router-view />

  <!-- Diálogo de Advertencia por Inactividad (ISO 27001 / BASC) -->
  <q-dialog v-model="showInactivityWarning" persistent transition-show="scale" transition-hide="scale">
    <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 420px; max-width: 90vw; border-radius: 14px;">
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="timer" color="warning" text-color="dark" size="44px" />
        <div class="q-ml-md">
          <div class="text-h6 text-weight-bold">Advertencia de Inactividad</div>
          <div class="text-caption text-grey-4">Estándar ISO 27001 / BASC</div>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-md text-body2 text-grey-3">
        Tu sesión se cerrará automáticamente en
        <span class="text-warning text-weight-bolder text-subtitle1 q-px-xs">{{ countdownSeconds }}</span>
        segundos por motivos de inactividad y protección de datos.
      </q-card-section>

      <q-card-actions align="right" class="q-pt-none q-gutter-x-sm">
        <q-btn flat label="Cerrar Sesión" color="negative" no-caps @click="forceLogout()" />
        <q-btn
          unelevated
          label="Mantener Sesión"
          color="primary"
          text-color="dark"
          no-caps
          class="text-weight-bold"
          style="border-radius: 8px;"
          @click="extendSession()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Diálogo de Bloqueo por Pestaña Duplicada (Seguridad Multi-Pestaña) -->
  <q-dialog v-model="isMultiTabBlocked" persistent backdrop-filter="blur(8px)" transition-show="fade" transition-hide="fade">
    <q-card class="bg-dark text-white q-pa-lg text-center" style="width: 460px; max-width: 90vw; border: 2px solid #ff4d4f; border-radius: 16px;">
      <q-card-section>
        <q-avatar icon="tab_unselected" color="negative" text-color="white" size="64px" class="q-mb-md" />
        <div class="text-h5 text-weight-bold text-negative">Pestaña Inactiva / Duplicada</div>
        <div class="text-subtitle2 text-grey-4 q-mt-xs">Control de Seguridad de Información</div>
      </q-card-section>

      <q-card-section class="text-body2 text-grey-3 q-py-sm">
        Se ha detectado otra pestaña de <strong>Qinspecting</strong> activa en este navegador.
        Por políticas de confidencialidad y control de concurrencia BASC / ISO 27001, solo se permite una pestaña activa a la vez.
      </q-card-section>

      <q-card-actions align="center" class="q-mt-md column q-gutter-y-sm">
        <q-btn
          unelevated
          color="primary"
          text-color="dark"
          label="Usar Qinspecting en esta pestaña"
          no-caps
          class="full-width text-weight-bold"
          style="border-radius: 8px; height: 44px;"
          @click="claimPrimaryTab()"
        />
        <q-btn
          flat
          color="grey-5"
          label="Cerrar esta pestaña"
          no-caps
          class="full-width"
          @click="closeThisTab()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Diálogo de Cambio Obligatorio de Contraseña Expirada (ISO 27001 / BASC) -->
  <q-dialog v-model="showExpiredPasswordModal" persistent backdrop-filter="blur(8px)" transition-show="scale" transition-hide="scale">
    <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 520px; max-width: 95vw; border-radius: 16px; border: 2px solid #ff4d4f;">
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="lock_clock" color="negative" text-color="white" size="48px" />
        <div class="q-ml-md">
          <div class="text-h6 text-weight-bold text-negative">Contraseña Expirada (90 Días)</div>
          <div class="text-caption text-grey-4">Normas de Seguridad ISO 27001 / BASC</div>
        </div>
      </q-card-section>

      <q-card-section class="text-body2 text-grey-3 q-py-sm">
        Tu contraseña actual ha alcanzado el límite máximo de validez (90 días). Por políticas de seguridad, debes actualizarla para continuar usando la plataforma.
      </q-card-section>

      <q-card-section class="q-gutter-y-sm q-pt-none">
        <!-- Contraseña Actual -->
        <q-input
          v-model="expiredForm.password_actual"
          :type="showActualPass ? 'text' : 'password'"
          label="Contraseña Actual *"
          outlined
          dark
          dense
          color="primary"
        >
          <template #append>
            <q-icon
              :name="showActualPass ? 'visibility' : 'visibility_off'"
              class="cursor-pointer text-grey-4"
              @click="showActualPass = !showActualPass"
            />
          </template>
        </q-input>

        <!-- Nueva Contraseña -->
        <q-input
          v-model="expiredForm.password_nueva"
          :type="showNuevaPass ? 'text' : 'password'"
          label="Nueva Contraseña *"
          outlined
          dark
          dense
          color="primary"
        >
          <template #append>
            <q-icon
              :name="showNuevaPass ? 'visibility' : 'visibility_off'"
              class="cursor-pointer text-grey-4"
              @click="showNuevaPass = !showNuevaPass"
            />
          </template>
        </q-input>

        <!-- Lista de validación en tiempo real para contraseña -->
        <div
          v-if="expiredForm.password_nueva"
          class="qi-card q-pa-sm text-caption"
          :style="{
            border: expIsPasswordValid ? '1px solid rgba(0, 210, 106, 0.4)' : '1px solid rgba(255, 77, 79, 0.5)',
            background: expIsPasswordValid ? 'rgba(0, 210, 106, 0.05)' : 'rgba(255, 77, 79, 0.05)'
          }"
        >
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-weight-bold" :class="expIsPasswordValid ? 'text-positive' : 'text-negative'">
              {{ expIsPasswordValid ? '✓ Contraseña Cumple Todos los Requisitos' : '⚠️ Requisitos Faltantes:' }}
            </span>
          </div>
          <div class="row q-col-gutter-xs">
            <div class="col-6" :class="expHasMinLength ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expHasMinLength ? 'check_circle' : 'cancel'" :color="expHasMinLength ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              Mínimo 8 caracteres
            </div>
            <div class="col-6" :class="expHasUppercase ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expHasUppercase ? 'check_circle' : 'cancel'" :color="expHasUppercase ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              1 Mayúscula (A-Z)
            </div>
            <div class="col-6" :class="expHasLowercase ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expHasLowercase ? 'check_circle' : 'cancel'" :color="expHasLowercase ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              1 Minúscula (a-z)
            </div>
            <div class="col-6" :class="expHasNumber ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expHasNumber ? 'check_circle' : 'cancel'" :color="expHasNumber ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              1 Número (0-9)
            </div>
            <div class="col-6" :class="expHasSpecialChar ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expHasSpecialChar ? 'check_circle' : 'cancel'" :color="expHasSpecialChar ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              1 Carácter especial (!@#$%)
            </div>
            <div class="col-6" :class="expPasswordsMatch && expiredForm.confirm_password ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
              <q-icon :name="expPasswordsMatch && expiredForm.confirm_password ? 'check_circle' : 'cancel'" :color="expPasswordsMatch && expiredForm.confirm_password ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
              Contraseñas coinciden
            </div>
          </div>
        </div>

        <!-- Confirmar Nueva Contraseña -->
        <q-input
          v-model="expiredForm.confirm_password"
          :type="showConfirmPass ? 'text' : 'password'"
          label="Confirmar Nueva Contraseña *"
          outlined
          dark
          dense
          color="primary"
          :error="!!expiredForm.confirm_password && !expPasswordsMatch"
          error-message="Las contraseñas no coinciden"
        >
          <template #append>
            <q-icon
              :name="showConfirmPass ? 'visibility' : 'visibility_off'"
              class="cursor-pointer text-grey-4"
              @click="showConfirmPass = !showConfirmPass"
            />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="between" class="q-pt-sm">
        <q-btn flat label="Cerrar Sesión" color="negative" no-caps @click="forceLogout('Has cerrado sesión por expiración de contraseña.')" />
        <q-btn
          unelevated
          label="Actualizar Contraseña"
          color="primary"
          text-color="dark"
          no-caps
          class="text-weight-bold"
          style="border-radius: 8px;"
          :disable="!expIsPasswordValid || !expiredForm.password_actual"
          :loading="submittingExpired"
          @click="submitExpiredPasswordChange"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useSessionSecurity } from './composables/useSessionSecurity'
import { apiFetch } from './services/api'
import { offlineSync } from './services/offlineSync'

const $q = useQuasar()
$q.dark.set(true)

onMounted(() => {
  if (navigator.onLine) {
    offlineSync.triggerAutoSync(apiFetch)
  }
})

const {
  showInactivityWarning,
  countdownSeconds,
  isMultiTabBlocked,
  showExpiredPasswordModal,
  extendSession,
  forceLogout,
  claimPrimaryTab,
  closeThisTab
} = useSessionSecurity()

const expiredForm = ref({
  password_actual: '',
  password_nueva: '',
  confirm_password: ''
})

const showActualPass = ref(false)
const showNuevaPass = ref(false)
const showConfirmPass = ref(false)
const submittingExpired = ref(false)

const expHasMinLength = computed(() => (expiredForm.value.password_nueva || '').length >= 8)
const expHasUppercase = computed(() => /[A-Z]/.test(expiredForm.value.password_nueva || ''))
const expHasLowercase = computed(() => /[a-z]/.test(expiredForm.value.password_nueva || ''))
const expHasNumber = computed(() => /[0-9]/.test(expiredForm.value.password_nueva || ''))
const expHasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(expiredForm.value.password_nueva || ''))
const expPasswordsMatch = computed(() => expiredForm.value.password_nueva === expiredForm.value.confirm_password)

const expIsPasswordValid = computed(() => {
  return expHasMinLength.value &&
    expHasUppercase.value &&
    expHasLowercase.value &&
    expHasNumber.value &&
    expHasSpecialChar.value &&
    expPasswordsMatch.value &&
    !!expiredForm.value.confirm_password
})

async function submitExpiredPasswordChange() {
  if (!expIsPasswordValid.value || !expiredForm.value.password_actual) return

  submittingExpired.value = true
  try {
    const res = await apiFetch('/auth/change-expired-password', {
      method: 'POST',
      body: JSON.stringify({
        password_actual: expiredForm.value.password_actual,
        password_nueva: expiredForm.value.password_nueva
      })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Error al actualizar contraseña')
    }

    $q.notify({
      type: 'positive',
      message: '¡Contraseña actualizada exitosamente! Tu cuenta vuelve a estar activa.',
      icon: 'verified_user',
      position: 'top',
      timeout: 5000
    })

    const userRaw = localStorage.getItem('qi_user')
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw)
        u.password_expirado = false
        u.password_por_vencer = false
        u.dias_para_vencer = 90
        localStorage.setItem('qi_user', JSON.stringify(u))
      } catch (e) {}
    }

    showExpiredPasswordModal.value = false
    expiredForm.value = { password_actual: '', password_nueva: '', confirm_password: '' }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Error al actualizar contraseña',
      icon: 'error',
      position: 'top',
      timeout: 7000
    })
  } finally {
    submittingExpired.value = false
  }
}
</script>

<style>
.border-glow {
  border: 1px solid rgba(0, 210, 106, 0.3);
  box-shadow: 0 0 20px rgba(0, 210, 106, 0.15);
}
</style>
