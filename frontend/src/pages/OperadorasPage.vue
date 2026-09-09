<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header Banner -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white row items-center gap-sm">
          <q-icon name="apartment" color="primary" size="32px" />
          <span>Gestión de Empresas Operadoras</span>
        </div>
        <div class="text-caption text-grey-4 q-mt-xs">
          Administración de empresas operadoras registradas en el sistema para la vinculación opcional de usuarios.
        </div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="add_business"
        label="Nueva Operadora"
        no-caps
        unelevated
        class="text-weight-bold qi-glow-btn"
        style="border-radius: 8px;"
        @click="openCreateDialog"
      />
    </div>

    <!-- Tabla Principal de Operadoras -->
    <QiTable
      title="Directorio de Operadoras"
      :rows="operadoras"
      :columns="columns"
      row-key="id"
      :loading="loading"
      export-filename="operadoras_sistema_qi"
      placeholder="Buscar por nombre de operadora..."
      no-data-label="No hay operadoras registradas"
    >
      <!-- Slot de Estado -->
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

      <!-- Slot de Acciones -->
      <template #body-cell-acciones="props">
        <q-td :props="props" align="center">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="primary"
            class="q-mr-xs"
            @click="openEditDialog(props.row)"
          >
            <q-tooltip>Editar Operadora</q-tooltip>
          </q-btn>

          <q-btn
            flat
            round
            dense
            :icon="props.row.estado === 1 ? 'block' : 'check_circle'"
            :color="props.row.estado === 1 ? 'negative' : 'positive'"
            @click="toggleOperadoraStatus(props.row)"
          >
            <q-tooltip>{{ props.row.estado === 1 ? 'Desactivar Operadora' : 'Activar Operadora' }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </QiTable>

    <!-- Diálogo Formulario Crear/Editar Operadora -->
    <q-dialog v-model="showModal" persistent transition-show="scale" transition-hide="scale">
      <q-card dark class="bg-dark text-white qi-card q-pa-md border-glow" style="width: 480px; max-width: 95vw; border-radius: 16px;">
        <q-card-section class="row items-center justify-between q-pb-none">
          <div class="row items-center gap-sm">
            <q-icon :name="isEditing ? 'edit' : 'add_business'" color="primary" size="28px" />
            <div class="text-h6 text-weight-bold">{{ isEditing ? 'Editar Operadora' : 'Nueva Operadora' }}</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="saveOperadora">
          <q-card-section class="q-gutter-y-md q-pt-md">
            <div>
              <div class="text-subtitle2 text-grey-3 q-mb-xs">Nombre de la Empresa Operadora *</div>
              <q-input
                v-model="form.nombre"
                outlined
                dark
                dense
                color="primary"
                placeholder="Ej. Ecopetrol, Frontera Energy, GeoPark..."
                :rules="[val => !!val && !!val.trim() || 'El nombre es obligatorio']"
              >
                <template #prepend>
                  <q-icon name="business" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="row items-center justify-between qi-card q-pa-sm">
              <span class="text-subtitle2 text-grey-3">Estado de la Operadora</span>
              <q-toggle
                v-model="form.estado"
                :true-value="1"
                :false-value="0"
                color="primary"
                :label="form.estado === 1 ? 'Activa' : 'Inactiva'"
                left-label
              />
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pt-sm q-gutter-x-sm">
            <q-btn flat label="Cancelar" color="grey-5" no-caps v-close-popup />
            <q-btn
              type="submit"
              color="primary"
              text-color="dark"
              :label="isEditing ? 'Guardar Cambios' : 'Registrar Operadora'"
              no-caps
              unelevated
              class="text-weight-bold"
              style="border-radius: 8px;"
              :loading="submitting"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'
import QiTable from '../components/QiTable.vue'

const $q = useQuasar()

const operadoras = ref([])
const loading = ref(false)
const submitting = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const currentId = ref(null)

const form = ref({
  nombre: '',
  estado: 1
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true, align: 'left', style: 'width: 80px;' },
  { name: 'nombre', label: 'Nombre Operadora', field: 'nombre', sortable: true, align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', sortable: true, align: 'center' },
  { name: 'creado_por', label: 'Creado Por', field: 'creado_por', sortable: true, align: 'left' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center', style: 'width: 120px;' }
]

async function loadOperadoras() {
  loading.value = true
  try {
    const res = await apiFetch('/operadoras')
    if (res.ok) {
      operadoras.value = await res.json()
    } else {
      throw new Error('No se pudo cargar la lista de operadoras')
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Error al conectar con el servidor',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  currentId.value = null
  form.value = { nombre: '', estado: 1 }
  showModal.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  currentId.value = row.id
  form.value = {
    nombre: row.nombre,
    estado: row.estado
  }
  showModal.value = true
}

async function saveOperadora() {
  if (!form.value.nombre || !form.value.nombre.trim()) return

  submitting.value = true
  try {
    const endpoint = isEditing.value ? `/operadoras/${currentId.value}` : '/operadoras'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify({
        nombre: form.value.nombre.trim(),
        estado: form.value.estado
      })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Error al guardar operadora')
    }

    $q.notify({
      type: 'positive',
      message: data.message || 'Operadora guardada con éxito',
      position: 'top'
    })

    showModal.value = false
    await loadOperadoras()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Fallo al procesar operadora',
      position: 'top'
    })
  } finally {
    submitting.value = false
  }
}

async function toggleOperadoraStatus(row) {
  const newStatus = row.estado === 1 ? 0 : 1
  const actionText = newStatus === 1 ? 'activar' : 'desactivar'

  $q.dialog({
    title: 'Confirmar Acción',
    message: `¿Estás seguro de que deseas ${actionText} la operadora "${row.nombre}"?`,
    cancel: true,
    persistent: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await apiFetch(`/operadoras/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: row.nombre,
          estado: newStatus
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error al cambiar estado')

      $q.notify({
        type: 'positive',
        message: `Operadora ${newStatus === 1 ? 'activada' : 'desactivada'} correctamente`,
        position: 'top'
      })

      await loadOperadoras()
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.message || 'Error al cambiar estado de operadora',
        position: 'top'
      })
    }
  })
}

onMounted(() => {
  loadOperadoras()
})
</script>
