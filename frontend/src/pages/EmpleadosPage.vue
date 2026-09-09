<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Directorio de Empleados</div>
        <div class="text-caption text-grey-4">Gestión de Talento Humano y Colaboradores</div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="person_add"
        label="Nuevo Empleado"
        no-caps
        unelevated
        class="text-weight-bold"
        style="border-radius: 8px;"
        @click="openCreateDialog"
      />
    </div>

    <!-- Filtros y Búsqueda -->
    <q-card class="qi-card q-pa-md q-mb-md">
      <div class="row items-center q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="filter"
            outlined
            dark
            dense
            placeholder="Buscar por Nombre, Cédula, Cargo o Correo..."
            color="primary"
            @update:model-value="fetchEmpleados"
          >
            <template #prepend>
              <q-icon name="search" color="primary" />
            </template>
            <template #append v-if="filter">
              <q-icon name="close" class="cursor-pointer" @click="filter = ''; fetchEmpleados()" />
            </template>
          </q-input>
        </div>
      </div>
    </q-card>

    <!-- Tabla de Empleados -->
    <q-card class="qi-card">
      <q-table
        :rows="empleados"
        :columns="columns"
        row-key="Cedula"
        dark
        flat
        :loading="loading"
        no-data-label="No se encontraron empleados registrados"
      >
        <template #body-cell-nombre_completo="props">
          <q-td :props="props" class="text-weight-bold">
            {{ props.row.Primer_Nombre }} {{ props.row.Segundo_Nombre || '' }} {{ props.row.Primer_Apellido }} {{ props.row.Segundo_Apellido || '' }}
          </q-td>
        </template>

        <template #body-cell-Estado_contrato="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.Estado_contrato === 1 ? 'positive' : 'grey-8'"
              text-color="white"
              dense
              size="sm"
              class="text-weight-bold"
            >
              {{ props.row.Estado_contrato === 1 ? 'ACTIVO' : 'INACTIVO' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props" align="center">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Editar Empleado</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="deleteEmpleado(props.row)">
              <q-tooltip>Eliminar Empleado</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Formulario -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 600px; max-width: 90vw; border-radius: 12px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditing ? 'Editar Empleado' : 'Nuevo Empleado' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <q-input v-model.number="form.Cedula" label="Cédula / Documento *" type="number" outlined dark dense color="primary" :disable="isEditing" />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.Primer_Nombre" label="Primer Nombre *" outlined dark dense color="primary" />
            </div>
            <div class="col-6">
              <q-input v-model="form.Segundo_Nombre" label="Segundo Nombre" outlined dark dense color="primary" />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.Primer_Apellido" label="Primer Apellido *" outlined dark dense color="primary" />
            </div>
            <div class="col-6">
              <q-input v-model="form.Segundo_Apellido" label="Segundo Apellido" outlined dark dense color="primary" />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.Cargo" label="Cargo" outlined dark dense color="primary" />
            </div>
            <div class="col-6">
              <q-input v-model="form.Departamento_area" label="Departamento / Área" outlined dark dense color="primary" />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.Email_Corporativo" label="Correo Corporativo" outlined dark dense color="primary" />
            </div>
            <div class="col-6">
              <q-input v-model.number="form.Celular" label="Teléfono Celular" type="number" outlined dark dense color="primary" />
            </div>
          </div>

          <q-toggle v-model="form.estadoBool" label="Contrato Activo" color="primary" dark />
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditing ? 'Guardar Cambios' : 'Registrar Empleado'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :loading="saving"
            @click="saveEmpleado"
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

const empleados = ref([])
const loading = ref(false)
const filter = ref('')
const dialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const form = ref({
  Cedula: null,
  Primer_Nombre: '',
  Segundo_Nombre: '',
  Primer_Apellido: '',
  Segundo_Apellido: '',
  Cargo: '',
  Email_Corporativo: '',
  Celular: null,
  Departamento_area: 'General',
  estadoBool: true
})

const columns = [
  { name: 'Cedula', label: 'Cédula', field: 'Cedula', sortable: true, align: 'left' },
  { name: 'nombre_completo', label: 'Nombre Completo', field: 'nombre_completo', sortable: true, align: 'left' },
  { name: 'Cargo', label: 'Cargo', field: 'Cargo', sortable: true, align: 'left' },
  { name: 'Departamento_area', label: 'Área', field: 'Departamento_area', align: 'left' },
  { name: 'Email_Corporativo', label: 'Correo Corporativo', field: 'Email_Corporativo', align: 'left' },
  { name: 'Celular', label: 'Celular', field: 'Celular', align: 'left' },
  { name: 'Estado_contrato', label: 'Estado', field: 'Estado_contrato', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

async function fetchEmpleados() {
  loading.value = true
  try {
    const res = await apiFetch(`/empleados?search=${encodeURIComponent(filter.value)}`)
    if (res.ok) {
      const data = await res.json()
      empleados.value = data.rows || []
    }
  } catch (err) {
    console.error('Error al cargar empleados:', err)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  form.value = {
    Cedula: null,
    Primer_Nombre: '',
    Segundo_Nombre: '',
    Primer_Apellido: '',
    Segundo_Apellido: '',
    Cargo: '',
    Email_Corporativo: '',
    Celular: null,
    Departamento_area: 'General',
    estadoBool: true
  }
  dialogOpen.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  form.value = {
    ...row,
    estadoBool: row.Estado_contrato === 1
  }
  dialogOpen.value = true
}

async function saveEmpleado() {
  if (!form.value.Cedula || !form.value.Primer_Nombre || !form.value.Primer_Apellido) {
    $q.notify({ type: 'negative', message: 'Cédula, Primer Nombre y Primer Apellido son requeridos', position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      Estado_contrato: form.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditing.value ? `/empleados/${form.value.Cedula}` : '/empleados'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditing.value ? 'Empleado actualizado correctamente' : 'Empleado registrado correctamente',
        position: 'top'
      })
      dialogOpen.value = false
      fetchEmpleados()
    }
  } catch (err) {
    console.error('Error al guardar empleado:', err)
  } finally {
    saving.value = false
  }
}

async function deleteEmpleado(row) {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Eliminar al empleado ${row.Primer_Nombre} ${row.Primer_Apellido} (${row.Cedula})?`,
    cancel: true,
    persistent: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await apiFetch(`/empleados/${row.Cedula}`, { method: 'DELETE' })
      if (res.ok) {
        $q.notify({ type: 'positive', message: 'Empleado eliminado', position: 'top' })
        fetchEmpleados()
      }
    } catch (err) {
      console.error('Error al eliminar empleado:', err)
    }
  })
}

onMounted(() => {
  fetchEmpleados()
})
</script>
