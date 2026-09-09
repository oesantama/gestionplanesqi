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
        <div class="row items-center q-gutter-x-sm">
          <q-btn flat round dense icon="notifications" color="grey-4">
            <q-badge color="accent" floating transparent rounded>3</q-badge>
          </q-btn>

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

    <!-- Dynamic Navigation Drawer (Cargado desde la Base de Datos) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      class="bg-dark text-white"
      style="border-right: 1px solid rgba(0, 210, 106, 0.12);"
      :width="270"
    >
      <div class="column justify-between full-height q-py-md">
        <div>
          <div class="text-overline text-grey-5 q-px-md q-mb-sm text-weight-bold tracking-wider">
            MENÚ PRINCIPAL
          </div>

          <!-- Spinner mientras carga el menú de BD -->
          <div v-if="loadingMenu" class="text-center q-pa-lg">
            <q-spinner-dots color="primary" size="30px" />
          </div>

          <!-- Arbol Dinámico de Menús, Submenús y Tabs -->
          <q-list v-else padding class="text-grey-3">
            <template v-for="menu in menuList" :key="menu.id">
              <!-- Caso 1: Menú con Submenús (Expansion Item) -->
              <q-expansion-item
                v-if="menu.submenus && menu.submenus.length"
                :icon="menu.icono || 'folder'"
                :label="menu.nombre"
                header-class="text-weight-medium text-white"
                expand-icon-class="text-primary"
                class="q-mx-sm q-mb-xs rounded-borders"
              >
                <q-list class="q-pl-md">
                  <q-item
                    v-for="sub in menu.submenus"
                    :key="sub.id"
                    clickable
                    v-ripple
                    :to="sub.ruta"
                    active-class="qi-active-menu"
                    class="q-my-xs rounded-borders"
                  >
                    <q-item-section avatar>
                      <q-icon :name="sub.icono || 'navigate_next'" size="18px" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ sub.nombre }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>

              <!-- Caso 2: Menú directo (Nivel 1) -->
              <q-item
                v-else
                clickable
                v-ripple
                :to="menu.ruta"
                active-class="qi-active-menu"
                class="q-mx-sm q-mb-xs rounded-borders"
              >
                <q-item-section avatar>
                  <q-icon :name="menu.icono || 'circle'" size="22px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ menu.nombre }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </div>

        <!-- System Status Banner -->
        <div class="q-px-md">
          <div class="qi-card q-pa-md row items-center no-wrap">
            <q-icon name="shield" color="primary" size="28px" class="q-mr-sm" />
            <div>
              <div class="text-caption text-weight-bold text-white">ISO 27001 / BASC</div>
              <div class="text-caption text-grey-5" style="font-size: 11px;">Sesión Segura Encriptada</div>
            </div>
          </div>
        </div>
      </div>
    </q-drawer>

    <!-- Main Content Area -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'
import logoQi from '../assets/Qi.png'

const $q = useQuasar()
const router = useRouter()

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
      menuList.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar menú desde BD:', err)
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
