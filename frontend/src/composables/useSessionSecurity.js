import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'

// Configuración de Tiempos de Inactividad (Políticas de Seguridad)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos de inactividad máxima
const WARNING_WINDOW_MS = 60 * 1000 // 60 segundos de advertencia previa

// Identificador único de esta pestaña
const tabId = Math.random().toString(36).substring(2, 9)
const channelName = 'qinspecting_single_tab_channel'

// Estado reactivo compartido
const showInactivityWarning = ref(false)
const countdownSeconds = ref(60)
const isMultiTabBlocked = ref(false)
const showExpiredPasswordModal = ref(false)

let lastActivityTime = Date.now()
let checkInterval = null
let channel = null
let hasWarnedPasswordExpiration = false

export function useSessionSecurity() {
  const router = useRouter()
  const $q = useQuasar()

  function checkUserLoggedIn() {
    return !!localStorage.getItem('qi_token')
  }

  function checkPasswordStatus() {
    if (!checkUserLoggedIn()) return

    const userRaw = localStorage.getItem('qi_user')
    if (!userRaw) return

    try {
      const user = JSON.parse(userRaw)
      if (user.password_expirado) {
        showExpiredPasswordModal.value = true
      } else if (user.password_por_vencer && !hasWarnedPasswordExpiration) {
        hasWarnedPasswordExpiration = true
        $q.notify({
          type: 'warning',
          message: `⚠️ Tu contraseña vencerá en ${user.dias_para_vencer} día(s). Por seguridad, te sugerimos actualizarla desde Mi Perfil.`,
          icon: 'shield_alert',
          position: 'top-right',
          timeout: 10000,
          actions: [
            {
              label: 'Ir a Mi Perfil',
              color: 'dark',
              handler: () => {
                if (router) router.push('/perfil')
              }
            }
          ]
        })
      }
    } catch (e) {}
  }

  async function refreshUserPasswordStatus() {
    if (!checkUserLoggedIn()) return
    try {
      const res = await apiFetch('/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.usuario) {
          localStorage.setItem('qi_user', JSON.stringify(data.usuario))
          checkPasswordStatus()
        }
      }
    } catch (e) {}
  }

  function resetActivity() {
    lastActivityTime = Date.now()
    if (showInactivityWarning.value) {
      showInactivityWarning.value = false
    }
  }

  function extendSession() {
    resetActivity()
    $q.notify({
      type: 'positive',
      message: 'Sesión extendida correctamente',
      icon: 'sync',
      timeout: 2000,
      position: 'top-right'
    })
  }

  function forceLogout(reasonMessage = 'Sesión cerrada automáticamente por inactividad por seguridad') {
    showInactivityWarning.value = false
    showExpiredPasswordModal.value = false
    hasWarnedPasswordExpiration = false
    localStorage.removeItem('qi_token')
    localStorage.removeItem('qi_user')

    $q.notify({
      type: 'warning',
      message: reasonMessage,
      icon: 'lock_clock',
      position: 'top',
      timeout: 5000
    })

    if (router) {
      router.push('/login')
    } else {
      window.location.href = '/login'
    }
  }

  function startInactivityMonitor() {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetActivity, { passive: true })
    })

    checkInterval = setInterval(() => {
      if (!checkUserLoggedIn()) return

      const idleMs = Date.now() - lastActivityTime
      const remainingMs = INACTIVITY_TIMEOUT_MS - idleMs

      if (remainingMs <= 0) {
        forceLogout('Tu sesión ha expirado por inactividad (15 min). Por favor inicia sesión nuevamente.')
      } else if (remainingMs <= WARNING_WINDOW_MS) {
        showInactivityWarning.value = true
        countdownSeconds.value = Math.ceil(remainingMs / 1000)
      } else {
        showInactivityWarning.value = false
      }
    }, 1000)
  }

  function handleExpiredEvent() {
    showExpiredPasswordModal.value = true
  }

  function initSingleTabEnforcement() {
    if (typeof BroadcastChannel === 'undefined') return

    channel = new BroadcastChannel(channelName)

    channel.onmessage = (event) => {
      if (!checkUserLoggedIn()) return

      const { type, senderTabId, targetTabId } = event.data || {}

      if (type === 'PING_TAB' && senderTabId !== tabId) {
        channel.postMessage({ type: 'PONG_TAB', senderTabId: tabId, targetTabId: senderTabId })
      } else if (type === 'PONG_TAB' && targetTabId === tabId) {
        isMultiTabBlocked.value = true
      } else if (type === 'TAKE_CONTROL' && senderTabId !== tabId) {
        isMultiTabBlocked.value = true
      }
    }

    if (checkUserLoggedIn()) {
      channel.postMessage({ type: 'PING_TAB', senderTabId: tabId })
    }
  }

  function claimPrimaryTab() {
    isMultiTabBlocked.value = false
    if (channel) {
      channel.postMessage({ type: 'TAKE_CONTROL', senderTabId: tabId })
    }
  }

  function closeThisTab() {
    window.close()
  }

  onMounted(() => {
    startInactivityMonitor()
    initSingleTabEnforcement()
    checkPasswordStatus()
    refreshUserPasswordStatus()
    window.addEventListener('qi-password-expired', handleExpiredEvent)
  })

  onUnmounted(() => {
    if (checkInterval) clearInterval(checkInterval)
    if (channel) channel.close()
    window.removeEventListener('qi-password-expired', handleExpiredEvent)
  })

  return {
    showInactivityWarning,
    countdownSeconds,
    isMultiTabBlocked,
    showExpiredPasswordModal,
    extendSession,
    forceLogout,
    claimPrimaryTab,
    closeThisTab,
    checkPasswordStatus
  }
}
