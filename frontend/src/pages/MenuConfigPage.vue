<template>
  <q-page class="q-pa-lg bg-dark-page">
    <!-- Header Page Banner -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h4 text-weight-bolder text-white row items-center gap-sm">
          <q-icon name="settings_suggest" color="primary" size="36px" />
          <span>Gestión de Menús y Jerarquía</span>
        </div>
        <div class="text-caption text-grey-4 q-mt-xs">
          Administra de forma dinámica los Menús (Nivel 1), Submenús (Nivel 2) y Pestañas (Nivel 3).
        </div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="refresh"
        label="Actualizar Lista"
        no-caps
        unelevated
        class="text-weight-bold qi-glow-btn"
        @click="fetchAdminData"
      />
    </div>

    <!-- Tabs Navigation for Levels -->
    <div class="qi-card q-pa-md q-mb-lg">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey-4"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="menus" icon="list" label="Menús Principales (Nivel 1)" />
        <q-tab name="submenus" icon="toc" label="Submenús (Nivel 2)" />
        <q-tab name="tabs" icon="tab" label="Pestañas / Tabs (Nivel 3)" />
      </q-tabs>

      <q-separator dark class="q-my-md" />

      <!-- Tab 1: Menús Principales (Nivel 1) -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent text-white">
        <q-tab-panel name="menus" class="q-pa-none">
          <q-table
            dark
            flat
            bordered
            :rows="adminData.menus"
            :columns="columnsMenu"
            row-key="id"
            class="bg-dark qi-card"
          >
            <template #body-cell-icono="props">
              <q-td :props="props">
                <q-icon :name="props.value || 'circle'" color="primary" size="20px" />
                <span class="q-ml-sm text-grey-3">{{ props.value }}</span>
              </q-td>
            </template>

            <template #body-cell-estado="props">
              <q-td :props="props">
                <q-toggle
                  v-model="props.row.estado"
                  :true-value="1"
                  :false-value="0"
                  color="primary"
                  @update:model-value="val => toggleStatus('menu', props.row.id, val)"
                />
                <q-badge :color="props.row.estado ? 'positive' : 'negative'" class="q-ml-xs text-weight-bold">
                  {{ props.row.estado ? 'Activo' : 'Inactivo' }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab 2: Submenús (Nivel 2) -->
        <q-tab-panel name="submenus" class="q-pa-none">
          <q-table
            dark
            flat
            bordered
            :rows="adminData.submenus"
            :columns="columnsSubmenu"
            row-key="id"
            class="bg-dark qi-card"
          >
            <template #body-cell-icono="props">
              <q-td :props="props">
                <q-icon :name="props.value || 'navigate_next'" color="primary" size="20px" />
                <span class="q-ml-sm text-grey-3">{{ props.value }}</span>
              </q-td>
            </template>

            <template #body-cell-estado="props">
              <q-td :props="props">
                <q-toggle
                  v-model="props.row.estado"
                  :true-value="1"
                  :false-value="0"
                  color="primary"
                  @update:model-value="val => toggleStatus('submenu', props.row.id, val)"
                />
                <q-badge :color="props.row.estado ? 'positive' : 'negative'" class="q-ml-xs text-weight-bold">
                  {{ props.row.estado ? 'Activo' : 'Inactivo' }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab 3: Pestañas / Tabs (Nivel 3) -->
        <q-tab-panel name="tabs" class="q-pa-none">
          <q-table
            dark
            flat
            bordered
            :rows="adminData.tabs"
            :columns="columnsTabs"
            row-key="id"
            class="bg-dark qi-card"
          >
            <template #body-cell-icono="props">
              <q-td :props="props">
                <q-icon :name="props.value || 'tab'" color="primary" size="20px" />
                <span class="q-ml-sm text-grey-3">{{ props.value }}</span>
              </q-td>
            </template>

            <template #body-cell-estado="props">
              <q-td :props="props">
                <q-toggle
                  v-model="props.row.estado"
                  :true-value="1"
                  :false-value="0"
                  color="primary"
                  @update:model-value="val => toggleStatus('tab', props.row.id, val)"
                />
                <q-badge :color="props.row.estado ? 'positive' : 'negative'" class="q-ml-xs text-weight-bold">
                  {{ props.row.estado ? 'Activo' : 'Inactivo' }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'

const $q = useQuasar()
const activeTab = ref('menus')
const adminData = ref({ menus: [], submenus: [], tabs: [] })

const columnsMenu = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'nombre', label: 'Nombre del Menú', field: 'nombre', align: 'left', sortable: true },
  { name: 'icono', label: 'Ícono', field: 'icono', align: 'left' },
  { name: 'ruta', label: 'Ruta', field: 'ruta', align: 'left' },
  { name: 'orden', label: 'Orden', field: 'orden', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' }
]

const columnsSubmenu = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'menu_id', label: 'ID Menú Padre', field: 'menu_id', align: 'center', sortable: true },
  { name: 'nombre', label: 'Nombre Submenú', field: 'nombre', align: 'left', sortable: true },
  { name: 'icono', label: 'Ícono', field: 'icono', align: 'left' },
  { name: 'ruta', label: 'Ruta', field: 'ruta', align: 'left' },
  { name: 'orden', label: 'Orden', field: 'orden', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' }
]

const columnsTabs = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'submenu_id', label: 'ID Submenú Padre', field: 'submenu_id', align: 'center', sortable: true },
  { name: 'nombre', label: 'Nombre Tab', field: 'nombre', align: 'left', sortable: true },
  { name: 'tab_key', label: 'Tab Key', field: 'tab_key', align: 'left' },
  { name: 'icono', label: 'Ícono', field: 'icono', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' }
]

async function fetchAdminData() {
  try {
    const res = await apiFetch('/menu/admin')
    if (res.ok) {
      adminData.value = await res.json()
    }
  } catch (err) {
    console.error('Error cargando datos de administración:', err)
  }
}

async function toggleStatus(tipo, id, nuevoEstado) {
  try {
    const res = await apiFetch('/menu/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ tipo, id, estado: nuevoEstado })
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: `Estado actualizado exitosamente`,
        icon: 'check',
        position: 'top'
      })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: `Error al actualizar estado`,
      icon: 'error',
      position: 'top'
    })
  }
}

onMounted(() => {
  fetchAdminData()
})
</script>
