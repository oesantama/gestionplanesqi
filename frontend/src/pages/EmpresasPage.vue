<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Directorio de Empresas</div>
        <div class="text-caption text-grey-4">Gestión de Clientes y Plataformas QI</div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="add"
        label="Nueva Empresa"
        no-caps
        unelevated
        class="text-weight-bold"
        style="border-radius: 8px;"
        @click="openCreateDialog"
      />
    </div>

    <!-- Filtros y Búsqueda -->
    <q-card class="qi-card q-pa-md q-mb-md">
      <div class="row items-center justify-between q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="filter"
            outlined
            dark
            dense
            placeholder="Buscar por Razón Social, Nombre QI, URL o Base de Datos..."
            color="primary"
            @update:model-value="fetchEmpresas"
          >
            <template #prepend>
              <q-icon name="search" color="primary" />
            </template>
            <template #append v-if="filter">
              <q-icon name="close" class="cursor-pointer" @click="filter = ''; fetchEmpresas()" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-auto">
          <q-btn
            color="positive"
            icon="file_download"
            label="Exportar a Excel"
            no-caps
            unelevated
            class="text-weight-bold"
            @click="exportExcel"
          />
        </div>
      </div>
    </q-card>

    <!-- Tabla -->
    <q-card class="qi-card">
      <q-table
        :rows="empresas"
        :columns="columns"
        row-key="Id_empresa"
        dark
        flat
        :loading="loading"
        no-data-label="No se encontraron empresas registradas"
      >
        <template #body-cell-estado="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.estado === 1 ? 'positive' : 'grey-8'"
              text-color="white"
              dense
              size="sm"
              class="text-weight-bold"
            >
              {{ props.row.estado === 1 ? 'ACTIVA' : 'INACTIVA' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-url_QI="props">
          <q-td :props="props">
            <a :href="props.row.url_QI" target="_blank" class="text-primary text-weight-medium text-decoration-none">
              {{ props.row.url_QI }}
            </a>
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props" align="center">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Editar Empresa</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              :icon="props.row.estado === 1 ? 'toggle_on' : 'toggle_off'"
              :color="props.row.estado === 1 ? 'positive' : 'grey-5'"
              @click="toggleEstado(props.row)"
            >
              <q-tooltip>{{ props.row.estado === 1 ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Formulario -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 550px; max-width: 90vw; border-radius: 12px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditing ? 'Editar Empresa' : 'Nueva Empresa' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <q-input v-model="form.Razon_social" label="Razón Social *" outlined dark dense color="primary" />
          
          <div class="row q-col-gutter-sm">
            <div class="col-8">
              <q-input v-model="form.nombre_QI" label="Nombre QI *" outlined dark dense color="primary" />
            </div>
            <div class="col-4">
              <q-input v-model.number="form.Digito_verificacion" label="DV" type="number" outlined dark dense color="primary" />
            </div>
          </div>

          <q-input v-model="form.Direccion" label="Dirección" outlined dark dense color="primary" />
          <q-input v-model="form.url_QI" label="URL QI (ej: https://empresa.qinspecting.com)" outlined dark dense color="primary" />
          <q-input v-model="form.base" label="Base de Datos MySQL (ej: qinspect_empresa)" outlined dark dense color="primary" />
          <q-input v-model="form.ruta_logo" label="URL Logo Adjunto" outlined dark dense color="primary" />

          <q-toggle v-model="form.estadoBool" label="Empresa Activa" color="primary" dark />
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditing ? 'Guardar Cambios' : 'Crear Empresa'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :loading="saving"
            @click="saveEmpresa"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'
import { exportTableToExcel } from '../utils/exportExcel.js'

function exportExcel() {
  exportTableToExcel(columns, empresas.value, 'directorio_empresas_qi')
}

const $q = useQuasar()

const empresas = ref([])
const loading = ref(false)
const filter = ref('')
const dialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const form = ref({
  Id_empresa: null,
  Razon_social: '',
  Digito_verificacion: 0,
  Direccion: '',
  nombre_QI: '',
  url_QI: '',
  ruta_logo: '',
  descripcion_logo: '',
  base: '',
  estadoBool: true
})

const columns = [
  { name: 'Id_empresa', label: 'ID', field: 'Id_empresa', sortable: true, align: 'left' },
  { name: 'Razon_social', label: 'Razón Social', field: 'Razon_social', sortable: true, align: 'left' },
  { name: 'nombre_QI', label: 'Nombre QI', field: 'nombre_QI', sortable: true, align: 'left' },
  { name: 'url_QI', label: 'URL Plataforma', field: 'url_QI', align: 'left' },
  { name: 'base', label: 'Base de Datos', field: 'base', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

async function fetchEmpresas() {
  loading.value = true
  try {
    const res = await apiFetch(`/empresas?search=${encodeURIComponent(filter.value)}`)
    if (res.ok) {
      const data = await res.json()
      empresas.value = data.rows || []
    }
  } catch (err) {
    console.error('Error al cargar empresas:', err)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  form.value = {
    Id_empresa: null,
    Razon_social: '',
    Digito_verificacion: 0,
    Direccion: '',
    nombre_QI: '',
    url_QI: '',
    ruta_logo: '',
    descripcion_logo: '',
    base: '',
    estadoBool: true
  }
  dialogOpen.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  form.value = {
    ...row,
    estadoBool: row.estado === 1
  }
  dialogOpen.value = true
}

async function saveEmpresa() {
  if (!form.value.Razon_social || !form.value.nombre_QI) {
    $q.notify({ type: 'negative', message: 'Razón social y Nombre QI son requeridos', position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      estado: form.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditing.value ? `/empresas/${form.value.Id_empresa}` : '/empresas'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditing.value ? 'Empresa actualizada correctamente' : 'Empresa registrada correctamente',
        position: 'top'
      })
      dialogOpen.value = false
      fetchEmpresas()
    }
  } catch (err) {
    console.error('Error al guardar empresa:', err)
  } finally {
    saving.value = false
  }
}

async function toggleEstado(row) {
  try {
    const newStatus = row.estado === 1 ? 0 : 1
    const res = await apiFetch(`/empresas/${row.Id_empresa}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: newStatus })
    })

    if (res.ok) {
      $q.notify({ type: 'positive', message: 'Estado actualizado', position: 'top' })
      fetchEmpresas()
    }
  } catch (err) {
    console.error('Error al cambiar estado:', err)
  }
}

onMounted(() => {
  fetchEmpresas()
})
</script>
