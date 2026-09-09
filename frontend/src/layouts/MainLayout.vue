<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark-page text-white">
    <!-- Header Navbar -->
    <q-header class="bg-dark q-py-xs" style="border-bottom: 1px solid rgba(0, 210, 106, 0.15); backdrop-filter: blur(10px);">
      <q-toolbar class="q-px-md">
        <q-btn
          flat
          dense
          round
          icon="menu"
          color="primary"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <div class="row items-center q-ml-sm cursor-pointer" @click="$router.push('/')">
          <q-img :src="logoQi" style="width: 38px; height: 38px;" fit="contain" class="q-mr-sm" />
          <span class="text-h6 text-weight-bolder qi-brand-text">QINSPECTING</span>
          <span class="text-caption text-grey-4 q-ml-sm gt-xs">| Planes QI</span>
        </div>

        <q-space />

        <!-- User Options & Profile -->
        <div class="row items-center q-gutter-x-xs">
          <!-- Password Expiration Warning Chip -->
          <q-chip
            v-if="currentUser.dias_para_vencer !== undefined && currentUser.dias_para_vencer <= 15"
            dense
            clickable
            color="warning"
            text-color="dark"
            class="text-weight-bold cursor-pointer"
            to="/perfil"
          >
            <q-icon name="lock_clock" size="16px" class="q-mr-xs" />
            <span>Contraseña vence en {{ currentUser.dias_para_vencer }}d</span>
          </q-chip>

          <!-- State Chip Badge -->
          <q-chip
            dense
            clickable
            :color="isOnline ? 'positive' : 'warning'"
            text-color="dark"
            class="text-weight-bold cursor-pointer"
            @click="showNotificationsModal = true"
          >
            <q-icon :name="isOnline ? 'wifi' : 'wifi_off'" size="16px" class="q-mr-xs" />
            <span>{{ isOnline ? 'En línea' : 'Sin Conexión' }}</span>
            <q-badge v-if="pendingCount > 0" color="dark" text-color="warning" class="q-ml-xs text-weight-bolder">
              {{ pendingCount }}
            </q-badge>
          </q-chip>

          <!-- Notifications Icon Button -->
          <q-btn
            flat
            round
            dense
            icon="notifications"
            color="grey-4"
            @click="showNotificationsModal = true"
          >
            <q-badge v-if="pendingCount > 0 || !isOnline" color="warning" floating transparent rounded>
              {{ pendingCount > 0 ? pendingCount : '!' }}
            </q-badge>
            <q-badge v-else color="positive" floating transparent rounded>✓</q-badge>
          </q-btn>

          <!-- User Menu Dropdown -->
          <q-btn-dropdown flat no-caps dense class="q-px-xs">
            <template #label>
              <div class="row items-center no-wrap">
                <q-avatar size="32px" color="secondary" text-color="primary" class="text-weight-bold border-glow">
                  {{ userInitial }}
                </q-avatar>
                <div class="text-left q-ml-sm gt-xs">
                  <div class="text-subtitle2 text-weight-bold leading-none text-white">{{ currentUser.nombre_completo || 'Usuario' }}</div>
                  <div class="text-caption text-grey-5 leading-none">{{ currentUser.rol_nombre || 'Rol' }}</div>
                </div>
              </div>
            </template>

            <q-list class="bg-dark text-white shadow-10" style="min-width: 180px; border: 1px solid rgba(0, 210, 106, 0.2);">
              <q-item clickable v-close-popup to="/perfil">
                <q-item-section avatar>
                  <q-icon name="person" color="primary" />
                </q-item-section>
                <q-item-section>Mi Perfil</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="showDiagnosticModal = true">
                <q-item-section avatar>
                  <q-icon name="tune" color="primary" />
                </q-item-section>
                <q-item-section>Configuración & Logs</q-item-section>
              </q-item>
              <q-separator dark />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section class="text-negative text-weight-bold">Cerrar Sesión</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Sidebar Drawer (Menú Dinámico desde Backend) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-dark text-white"
      style="border-right: 1px solid rgba(0, 210, 106, 0.15);"
      :width="260"
    >
      <div class="column justify-between full-height q-py-md">
        <div>
          <!-- Header Perfil Corto en Drawer -->
          <div class="q-px-md q-mb-md row items-center">
            <q-avatar size="40px" color="secondary" text-color="primary" class="text-weight-bold border-glow q-mr-sm">
              {{ userInitial }}
            </q-avatar>
            <div class="overflow-hidden">
              <div class="text-subtitle2 text-weight-bold text-white ellipsis">{{ currentUser.nombre_completo || 'Usuario' }}</div>
              <div class="text-caption text-primary text-weight-medium ellipsis">{{ currentUser.rol_nombre || 'Invitado' }}</div>
            </div>
          </div>

          <q-separator dark class="q-mb-md" />

          <!-- Lista de Menús Dinámicos -->
          <div v-if="loadingMenu" class="text-center q-pa-md">
            <q-spinner-dots color="primary" size="30px" />
            <div class="text-caption text-grey-5 q-mt-xs">Cargando menú...</div>
          </div>

          <q-list v-else dark dense class="q-px-sm q-gutter-y-xs">
            <template v-for="item in menuList" :key="item.id || item.nombre">
              <!-- Categoría Acordeón con Submenús (Nivel 2) -->
              <q-expansion-item
                v-if="item.submenus && item.submenus.length > 0"
                dark
                dense
                dense-toggle
                expand-separator
                :icon="item.icono || 'folder'"
                :label="item.nombre || item.titulo"
                header-class="text-grey-3 text-weight-bold rounded-borders"
                :default-opened="isGroupActive(item)"
              >
                <q-list dark dense class="q-pl-sm q-gutter-y-xs q-py-xs">
                  <q-item
                    v-for="sub in item.submenus"
                    :key="sub.id || sub.ruta"
                    clickable
                    v-ripple
                    :to="sub.ruta"
                    active-class="qi-active-menu"
                    class="rounded-borders text-grey-3 q-py-xs"
                  >
                    <q-item-section avatar min-width="28px">
                      <q-icon :name="sub.icono || 'circle'" color="primary" size="18px" />
                    </q-item-section>

                    <q-item-section>
                      <q-item-label class="text-weight-medium text-caption">{{ sub.nombre || sub.titulo }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>

              <!-- Opción Individual sin Submenús -->
              <q-item
                v-else
                clickable
                v-ripple
                :to="item.ruta"
                active-class="qi-active-menu"
                class="rounded-borders text-grey-3"
              >
                <q-item-section avatar min-width="36px">
                  <q-icon :name="item.icono || 'extension'" color="primary" />
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ item.nombre || item.titulo }}</q-item-label>
                  <q-item-label v-if="item.descripcion" caption class="text-grey-5 text-caption">
                    {{ item.descripcion }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </div>

        <!-- Footer Drawer Info -->
        <div class="q-pa-md">
          <div class="qi-card q-pa-sm text-center">
            <div class="text-caption text-primary text-weight-bold">Estándares de Seguridad</div>
            <div class="text-caption text-grey-5" style="font-size: 10px;">Sesión Segura Encriptada</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <!-- Main Content Area -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Modal Responsivo de Notificaciones y Sincronización -->
    <q-dialog v-model="showNotificationsModal">
      <q-card dark class="bg-dark text-white qi-card q-pa-md shadow-12 border-glow" style="width: 500px; max-width: 92vw; border-radius: 14px;">
        <q-card-section class="row items-center justify-between q-pb-none">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="notifications" color="primary" size="24px" />
            <div class="text-h6 text-weight-bold text-primary">Notificaciones y Estado</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-py-md q-gutter-y-sm">
          <!-- Indicador Estado de Conexión -->
          <div class="qi-card q-pa-md row items-center justify-between" :style="{ borderColor: isOnline ? 'rgba(0, 210, 106, 0.4)' : 'rgba(242, 192, 55, 0.6)' }">
            <div class="row items-center q-gutter-x-sm">
              <q-icon :name="isOnline ? 'wifi' : 'wifi_off'" :color="isOnline ? 'positive' : 'warning'" size="28px" />
              <div>
                <div class="text-subtitle2 text-weight-bold" :class="isOnline ? 'text-positive' : 'text-warning'">
                  {{ isOnline ? '🌐 Conexión Activa (En Línea)' : '📶 Modo Sin Conexión (Offline)' }}
                </div>
                <div class="text-caption text-grey-4">
                  {{ isOnline ? 'Servidor https://gestion.qinspecting.com disponible.' : 'Operando con base de datos local del dispositivo.' }}
                </div>
              </div>
            </div>
            <q-chip dense :color="isOnline ? 'positive' : 'warning'" text-color="dark" class="text-weight-bold">
              {{ isOnline ? 'En línea' : 'Offline' }}
            </q-chip>
          </div>

          <!-- Peticiones Pendientes de Sincronización -->
          <div v-if="pendingCount > 0" class="qi-card q-pa-md text-warning" style="border-color: #f2c037; background: rgba(242, 192, 55, 0.1);">
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center q-gutter-x-xs">
                <q-icon name="cloud_off" color="warning" size="22px" />
                <span class="text-weight-bold text-subtitle2">Operaciones Pendientes ({{ pendingCount }})</span>
              </div>
              <q-btn
                color="warning"
                text-color="dark"
                icon="sync"
                label="Sincronizar Ahora"
                no-caps
                unelevated
                dense
                class="text-weight-bold q-px-sm"
                :loading="syncingNow"
                @click="forceSyncNow"
              />
            </div>
            <div class="text-caption text-grey-3">
              Hay {{ pendingCount }} registro(s) guardado(s) localmente listos para enviarse al servidor.
            </div>
          </div>

          <!-- Información de Seguridad -->
          <div class="qi-card q-pa-md row items-center q-gutter-x-sm">
            <q-icon name="shield" color="info" size="26px" />
            <div>
              <div class="text-subtitle2 text-weight-bold text-white">Estándares de Seguridad</div>
              <div class="text-caption text-grey-4">Sesión cifrada con JWT y registro de auditoría activo.</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="between">
          <q-btn flat label="Diagnóstico y Logs" color="primary" icon="tune" @click="openDiagnostic" no-caps />
          <q-btn unelevated label="Cerrar" color="grey-8" text-color="white" v-close-popup no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <DiagnosticDialog v-model="showDiagnosticModal" />
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiFetch, checkRealConnectivity } from '../services/api.js'
import { offlineSync } from '../services/offlineSync.js'
import DiagnosticDialog from '../components/DiagnosticDialog.vue'
import logoQi from '../assets/Qi.png'

const $q = useQuasar()
const router = useRouter()

const showDiagnosticModal = ref(false)
const showNotificationsModal = ref(false)
const syncingNow = ref(false)

const isOnline = ref(localStorage.getItem('qi_is_offline') !== 'true' && (typeof navigator !== 'undefined' ? navigator.onLine : true))
const pendingCount = ref(offlineSync.getPendingCount())

const DEFAULT_FALLBACK_MENU = [
  {
    id: 1,
    nombre: 'Resumen operacional de flotas',
    descripcion: 'Dashboard ejecutivo',
    icono: 'dashboard',
    ruta: '/',
    submenus: []
  },
  {
    id: 2,
    nombre: 'Empresas, Planes QI y Asignaciones',
    descripcion: 'Gestión comercial y asignaciones',
    icono: 'business',
    submenus: [
      { id: 21, nombre: 'Empresas', descripcion: 'Directorio de empresas', icono: 'store', ruta: '/empresas' },
      { id: 22, nombre: 'Planes QI', descripcion: 'Catálogo de tarifas', icono: 'monetization_on', ruta: '/planes' },
      { id: 23, nombre: 'Asignación de Planes', descripcion: 'Planes por empresa', icono: 'assignment_turned_in', ruta: '/planes-empresas' }
    ]
  },
  {
    id: 3,
    nombre: 'Gestión de personal y colaboradores',
    descripcion: 'Directorio humano',
    icono: 'badge',
    submenus: [
      { id: 31, nombre: 'Empleados', descripcion: 'Registro de empleados', icono: 'people', ruta: '/empleados' }
    ]
  },
  {
    id: 4,
    nombre: 'Plataforma & Comunicaciones',
    descripcion: 'Avisos y capacitaciones',
    icono: 'campaign',
    submenus: [
      { id: 41, nombre: 'Mensajes de Avisos', descripcion: 'Notificaciones masivas', icono: 'chat', ruta: '/mensajes' },
      { id: 42, nombre: 'Capacitaciones Operadora', descripcion: 'Cursos y módulos', icono: 'school', ruta: '/capacitaciones-operadora' }
    ]
  },
  {
    id: 5,
    nombre: 'Configuración',
    descripcion: 'Parámetros y seguridad',
    icono: 'settings',
    submenus: [
      { id: 51, nombre: 'Gestión de Menús', descripcion: 'Menús, submenús y pestañas', icono: 'menu_open', ruta: '/configuracion/menus' },
      { id: 52, nombre: 'Usuarios y Roles', descripcion: 'Gestión de accesos', icono: 'manage_accounts', ruta: '/configuracion/usuarios' },
      { id: 53, nombre: 'Operadoras', descripcion: 'Empresas operadoras registradas', icono: 'apartment', ruta: '/configuracion/operadoras' },
      { id: 54, nombre: 'Bitácora de Auditoría', descripcion: 'Auditoría de Seguridad', icono: 'security', ruta: '/configuracion/bitacora' }
    ]
  }
]

function isGroupActive(item) {
  if (!item || !item.submenus || !router.currentRoute.value) return false
  const currentPath = router.currentRoute.value.path
  return item.submenus.some(sub => sub.ruta === currentPath)
}

function updateNetworkStatus(evt) {
  if (evt && evt.type === 'qi-network-status') {
    isOnline.value = evt.detail.online
  } else {
    isOnline.value = localStorage.getItem('qi_is_offline') !== 'true' && (typeof navigator !== 'undefined' ? navigator.onLine : true)
  }
  pendingCount.value = offlineSync.getPendingCount()
}

async function forceSyncNow() {
  syncingNow.value = true
  try {
    const isConnected = await checkRealConnectivity()
    if (isConnected) {
      await offlineSync.triggerAutoSync(apiFetch)
      $q.notify({ type: 'positive', message: 'Sincronización manual finalizada', position: 'top' })
    } else {
      $q.notify({ type: 'warning', message: 'Servidor no disponible. Verifica tus datos móviles o WiFi.', position: 'top' })
    }
  } catch (err) {
    console.error(err)
  } finally {
    syncingNow.value = false
    updateNetworkStatus()
  }
}

function openDiagnostic() {
  showNotificationsModal.value = false
  showDiagnosticModal.value = true
}

const leftDrawerOpen = ref(false)
const menuList = ref([])
const loadingMenu = ref(true)
const currentUser = ref({ nombre_completo: '', rol_nombre: '' })

const userInitial = computed(() => {
  return (currentUser.value.nombre_completo || 'A').charAt(0).toUpperCase()
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function useFallbackMenu() {
  const cached = localStorage.getItem('qi_cache_menu')
  if (cached) {
    try {
      menuList.value = JSON.parse(cached)
      return
    } catch (e) {}
  }
  menuList.value = DEFAULT_FALLBACK_MENU
}

async function fetchMenu() {
  const token = localStorage.getItem('qi_token')
  if (!token) {
    logout()
    return
  }

  loadingMenu.value = true
  try {
    const user = currentUser.value
    const rolId = user && user.rol_id ? user.rol_id : 1
    const res = await apiFetch(`/menu?rol_id=${rolId}`)

    if (res && res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        menuList.value = data
        localStorage.setItem('qi_cache_menu', JSON.stringify(data))
      } else {
        useFallbackMenu()
      }
    } else {
      useFallbackMenu()
    }
  } catch (err) {
    console.error('Error al cargar menú desde BD:', err)
    useFallbackMenu()
  } finally {
    loadingMenu.value = false
  }
}

function loadUserData() {
  const stored = localStorage.getItem('qi_user')
  if (stored) {
    try {
      currentUser.value = JSON.parse(stored)
    } catch (e) {}
  } else {
    logout()
  }
}

function logout() {
  localStorage.removeItem('qi_token')
  localStorage.removeItem('qi_user')
  router.push('/login')
}

onMounted(() => {
  loadUserData()
  fetchMenu()
  checkRealConnectivity()
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
  window.addEventListener('qi-network-status', updateNetworkStatus)
  window.addEventListener('qi-offline-synced', updateNetworkStatus)
  window.addEventListener('qi-offline-mutation', updateNetworkStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateNetworkStatus)
  window.removeEventListener('offline', updateNetworkStatus)
  window.removeEventListener('qi-network-status', updateNetworkStatus)
  window.removeEventListener('qi-offline-synced', updateNetworkStatus)
  window.removeEventListener('qi-offline-mutation', updateNetworkStatus)
})
</script>

<style scoped>
.qi-active-menu {
  background: rgba(0, 210, 106, 0.15) !important;
  color: #00D26A !important;
  border-left: 4px solid #00D26A;
  border-radius: 8px;
}

.border-glow {
  border: 1.5px solid #00D26A;
}

.leading-none {
  line-height: 1.1;
}

.rounded-borders {
  border-radius: 8px;
}
</style>
