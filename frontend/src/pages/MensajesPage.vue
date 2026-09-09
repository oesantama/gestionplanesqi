<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Mensajes y Banners de Plataforma</div>
        <div class="text-caption text-grey-4">Configuración de avisos informativos y recomendaciones del sistema</div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="add_comment"
        label="Nuevo Mensaje"
        no-caps
        unelevated
        class="text-weight-bold"
        style="border-radius: 8px;"
        @click="openCreateDialog"
      />
    </div>

    <!-- Tabla -->
    <q-card class="qi-card">
      <q-table
        :rows="mensajes"
        :columns="columns"
        row-key="id_mensaje"
        dark
        flat
        :loading="loading"
        no-data-label="No hay mensajes registrados"
      >
        <template #body-cell-Name="props">
          <q-td :props="props" class="row items-center">
            <q-icon :name="props.row.Name || 'chat'" color="primary" size="20px" class="q-mr-sm" />
            <span class="text-weight-bold">{{ props.row.Name }}</span>
          </q-td>
        </template>

        <template #body-cell-Estado="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.Estado === 1 ? 'positive' : 'grey-8'"
              text-color="white"
              dense
              size="sm"
              class="text-weight-bold"
            >
              {{ props.row.Estado === 1 ? 'ACTIVO' : 'INACTIVO' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props" align="center">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Editar Mensaje</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="deleteMensaje(props.row)">
              <q-tooltip>Eliminar Mensaje</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Formulario -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 500px; max-width: 90vw; border-radius: 12px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditing ? 'Editar Mensaje' : 'Nuevo Mensaje' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <q-input v-model="form.Name" label="Nombre / Icono (ej: style, tv, layers) *" outlined dark dense color="primary" />
          <q-input v-model="form.Mensaje" label="Contenido del Mensaje *" type="textarea" outlined dark dense color="primary" rows="4" />
          <q-toggle v-model="form.estadoBool" label="Mensaje Activo" color="primary" dark />
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditing ? 'Guardar Cambios' : 'Crear Mensaje'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :loading="saving"
            @click="saveMensaje"
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

const $q = useQuasar()

const mensajes = ref([])
const loading = ref(false)
const dialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const form = ref({
  id_mensaje: null,
  Name: '',
  Mensaje: '',
  estadoBool: true
})

const columns = [
  { name: 'id_mensaje', label: 'ID', field: 'id_mensaje', sortable: true, align: 'left' },
  { name: 'Name', label: 'Identificador / Icono', field: 'Name', sortable: true, align: 'left' },
  { name: 'Mensaje', label: 'Mensaje Informativo', field: 'Mensaje', align: 'left' },
  { name: 'Estado', label: 'Estado', field: 'Estado', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

async function fetchMensajes() {
  loading.value = true
  try {
    const res = await apiFetch('/mensajes')
    if (res.ok) {
      mensajes.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar mensajes:', err)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  form.value = {
    id_mensaje: null,
    Name: 'style',
    Mensaje: '',
    estadoBool: true
  }
  dialogOpen.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  form.value = {
    ...row,
    estadoBool: row.Estado === 1
  }
  dialogOpen.value = true
}

async function saveMensaje() {
  if (!form.value.Name || !form.value.Mensaje) {
    $q.notify({ type: 'negative', message: 'Nombre y Mensaje son requeridos', position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      Estado: form.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditing.value ? `/mensajes/${form.value.id_mensaje}` : '/mensajes'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditing.value ? 'Mensaje actualizado correctamente' : 'Mensaje registrado correctamente',
        position: 'top'
      })
      dialogOpen.value = false
      fetchMensajes()
    }
  } catch (err) {
    console.error('Error al guardar mensaje:', err)
  } finally {
    saving.value = false
  }
}

async function deleteMensaje(row) {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Eliminar el mensaje #${row.id_mensaje}?`,
    cancel: true,
    persistent: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await apiFetch(`/mensajes/${row.id_mensaje}`, { method: 'DELETE' })
      if (res.ok) {
        $q.notify({ type: 'positive', message: 'Mensaje eliminado', position: 'top' })
        fetchMensajes()
      }
    } catch (err) {
      console.error('Error al eliminar mensaje:', err)
    }
  })
}

onMounted(() => {
  fetchMensajes()
})
</script>
