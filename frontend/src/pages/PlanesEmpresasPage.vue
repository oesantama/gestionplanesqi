<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Asignación de Planes a Empresas</div>
        <div class="text-caption text-grey-4">Gestión de suscripciones activas y registro de movimientos históricos</div>
      </div>
      <div class="row items-center q-gutter-x-sm">
        <q-btn
          outline
          color="primary"
          icon="history"
          label="Bitácora de Histórico"
          no-caps
          class="text-weight-bold"
          style="border-radius: 8px;"
          @click="openLogDialog(null)"
        />
        <q-btn
          color="primary"
          text-color="dark"
          icon="add"
          label="Nueva Asignación"
          no-caps
          unelevated
          class="text-weight-bold"
          style="border-radius: 8px;"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Tabla Principal de Asignaciones -->
    <q-card class="qi-card">
      <q-table
        :rows="assignments"
        :columns="columns"
        row-key="Id_llave"
        dark
        flat
        :loading="loading"
        no-data-label="No hay asignaciones registradas"
      >
        <template #body-cell-Estado="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.Estado === 1 ? 'positive' : 'grey-8'"
              text-color="white"
              dense
              size="sm"
              class="text-weight-bold"
            >
              {{ props.row.Estado === 1 ? 'VIGENTE' : 'INACTIVO' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-Fecha_inicio="props">
          <q-td :props="props">
            {{ formatDate(props.row.Fecha_inicio) }}
          </q-td>
        </template>

        <template #body-cell-Fecha_facturacion="props">
          <q-td :props="props">
            {{ formatDate(props.row.Fecha_facturacion) }}
          </q-td>
        </template>

        <template #body-cell-plan_precio="props">
          <q-td :props="props" class="text-weight-bold text-primary">
            ${{ Number(props.row.plan_precio || 0).toLocaleString() }}
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props" align="center">
            <q-btn flat round dense icon="history" color="info" @click="openLogDialog(props.row.Id_llave)">
              <q-tooltip>Ver Histórico de Cambios</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Modificar Asignación</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="deleteAssignment(props.row)">
              <q-tooltip>Eliminar Asignación</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Formulario de Asignación -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 500px; max-width: 90vw; border-radius: 12px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditing ? 'Modificar Asignación' : 'Nueva Asignación de Plan' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <q-select
            v-model="form.Id_empresa"
            :options="empresaOptions"
            option-value="Id_empresa"
            option-label="Razon_social"
            emit-value
            map-options
            label="Empresa Cliente *"
            outlined
            dark
            dense
            color="primary"
          />

          <q-select
            v-model="form.Id_plan"
            :options="planOptions"
            option-value="Id_plan"
            option-label="Descripcion"
            emit-value
            map-options
            label="Plan QI *"
            outlined
            dark
            dense
            color="primary"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.Fecha_inicio" label="Fecha Inicio *" type="date" outlined dark dense color="primary" stack-label />
            </div>
            <div class="col-6">
              <q-input v-model="form.Fecha_facturacion" label="Fecha Facturación *" type="date" outlined dark dense color="primary" stack-label />
            </div>
          </div>

          <q-toggle v-model="form.estadoBool" label="Asignación Vigente" color="primary" dark />
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditing ? 'Guardar y Registrar Movimiento' : 'Asignar Plan'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :loading="saving"
            @click="saveAssignment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal Bitácora / Timeline de Histórico -->
    <q-dialog v-model="logDialogOpen" backdrop-filter="blur(6px)">
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 750px; max-width: 95vw; max-height: 85vh; border-radius: 14px;">
        <q-card-section class="row items-center justify-between">
          <div class="row items-center">
            <q-avatar icon="history" color="primary" text-color="dark" class="q-mr-sm" size="40px" />
            <div>
              <div class="text-h6 text-weight-bold">Histórico de Movimientos de Planes</div>
              <div class="text-caption text-grey-4">Auditoría Inalterable (ISO 27001 / BASC)</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator dark />

        <q-card-section style="max-height: 65vh; overflow-y: auto;" class="q-pa-md">
          <div v-if="loadingLog" class="text-center q-pa-lg">
            <q-spinner-dots color="primary" size="40px" />
          </div>

          <div v-else-if="!logList.length" class="text-center text-grey-5 q-pa-xl">
            <q-icon name="history_toggle_off" size="50px" class="q-mb-sm" />
            <div>No hay registros históricos en la bitácora</div>
          </div>

          <q-timeline v-else color="primary" dark>
            <q-timeline-entry
              v-for="item in logList"
              :key="item.id"
              :subtitle="formatDateTime(item.creado_en)"
              :icon="getLogIcon(item.accion)"
              :color="getLogColor(item.accion)"
            >
              <template #title>
                <div class="row items-center justify-between">
                  <div class="text-subtitle1 text-weight-bold">
                    {{ item.empresa_nombre || ('Empresa #' + item.id_empresa) }}
                  </div>
                  <q-chip :color="getLogColor(item.accion)" text-color="white" size="xs" class="text-weight-bold">
                    {{ item.accion }}
                  </q-chip>
                </div>
              </template>

              <div class="qi-card q-pa-sm q-mt-xs text-caption text-grey-3">
                <div><strong>Plan:</strong> {{ item.plan_nombre || ('Plan #' + item.id_plan) }}</div>
                <div><strong>Fechas:</strong> Inicio: {{ formatDate(item.fecha_inicio) }} | Facturación: {{ formatDate(item.fecha_facturacion) }}</div>
                <div><strong>Usuario Responsable:</strong> <span class="text-primary">{{ item.username || 'Sistema' }}</span></div>
                <div v-if="item.detalles" class="q-mt-xs text-grey-5 font-mono" style="font-size: 11px;">
                  {{ item.detalles }}
                </div>
              </div>
            </q-timeline-entry>
          </q-timeline>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'

const $q = useQuasar()

const assignments = ref([])
const empresaOptions = ref([])
const planOptions = ref([])
const loading = ref(false)
const saving = ref(false)

const dialogOpen = ref(false)
const isEditing = ref(false)

const logDialogOpen = ref(false)
const logList = ref([])
const loadingLog = ref(false)

const form = ref({
  Id_llave: null,
  Id_empresa: null,
  Id_plan: null,
  Fecha_inicio: '',
  Fecha_facturacion: '',
  estadoBool: true
})

const columns = [
  { name: 'Id_llave', label: 'ID', field: 'Id_llave', sortable: true, align: 'left' },
  { name: 'empresa_nombre', label: 'Empresa', field: 'empresa_nombre', sortable: true, align: 'left' },
  { name: 'plan_nombre', label: 'Plan QI', field: 'plan_nombre', sortable: true, align: 'left' },
  { name: 'Fecha_inicio', label: 'Fecha Inicio', field: 'Fecha_inicio', align: 'center' },
  { name: 'Fecha_facturacion', label: 'Fecha Facturación', field: 'Fecha_facturacion', align: 'center' },
  { name: 'plan_precio', label: 'Tarifa Mensual', field: 'plan_precio', align: 'right' },
  { name: 'Estado', label: 'Estado', field: 'Estado', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toISOString().split('T')[0]
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getLogIcon(accion) {
  if (accion === 'CREACION') return 'add_circle'
  if (accion === 'MODIFICACION') return 'edit'
  if (accion === 'ELIMINACION') return 'delete'
  return 'info'
}

function getLogColor(accion) {
  if (accion === 'CREACION') return 'positive'
  if (accion === 'MODIFICACION') return 'warning'
  if (accion === 'ELIMINACION') return 'negative'
  return 'info'
}

async function fetchAssignments() {
  loading.value = true
  try {
    const res = await apiFetch('/planes-empresas')
    if (res.ok) {
      assignments.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar asignaciones:', err)
  } finally {
    loading.value = false
  }
}

async function fetchOptions() {
  try {
    const [resE, resP] = await Promise.all([
      apiFetch('/empresas?limit=200'),
      apiFetch('/planes')
    ])
    if (resE.ok) {
      const dataE = await resE.json()
      empresaOptions.value = dataE.rows || []
    }
    if (resP.ok) {
      planOptions.value = await resP.json()
    }
  } catch (err) {
    console.error('Error al cargar opciones:', err)
  }
}

function openCreateDialog() {
  isEditing.value = false
  const today = new Date().toISOString().split('T')[0]
  form.value = {
    Id_llave: null,
    Id_empresa: empresaOptions.value.length ? empresaOptions.value[0].Id_empresa : null,
    Id_plan: planOptions.value.length ? planOptions.value[0].Id_plan : null,
    Fecha_inicio: today,
    Fecha_facturacion: today,
    estadoBool: true
  }
  dialogOpen.value = true
}

function openEditDialog(row) {
  isEditing.value = true
  form.value = {
    ...row,
    Fecha_inicio: formatDate(row.Fecha_inicio),
    Fecha_facturacion: formatDate(row.Fecha_facturacion),
    estadoBool: row.Estado === 1
  }
  dialogOpen.value = true
}

async function saveAssignment() {
  if (!form.value.Id_empresa || !form.value.Id_plan || !form.value.Fecha_inicio || !form.value.Fecha_facturacion) {
    $q.notify({ type: 'negative', message: 'Todos los campos con * son obligatorios', position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      Estado: form.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditing.value ? `/planes-empresas/${form.value.Id_llave}` : '/planes-empresas'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditing.value ? 'Asignación actualizada y registrada en histórico' : 'Asignación registrada con éxito',
        position: 'top'
      })
      dialogOpen.value = false
      fetchAssignments()
    }
  } catch (err) {
    console.error('Error al guardar asignación:', err)
  } finally {
    saving.value = false
  }
}

async function deleteAssignment(row) {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Desea eliminar la asignación de plan para "${row.empresa_nombre}"? Esta acción quedará registrada en la bitácora de histórico.`,
    cancel: true,
    persistent: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await apiFetch(`/planes-empresas/${row.Id_llave}`, { method: 'DELETE' })
      if (res.ok) {
        $q.notify({ type: 'warning', message: 'Asignación eliminada y registrada en histórico', position: 'top' })
        fetchAssignments()
      }
    } catch (err) {
      console.error('Error al eliminar asignación:', err)
    }
  })
}

async function openLogDialog(idLlave = null) {
  logDialogOpen.value = true
  loadingLog.value = true
  logList.value = []

  try {
    const query = idLlave ? `?id_llave=${idLlave}` : ''
    const res = await apiFetch(`/planes-empresas/log${query}`)
    if (res.ok) {
      logList.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar log de movimientos:', err)
  } finally {
    loadingLog.value = false
  }
}

onMounted(() => {
  fetchAssignments()
  fetchOptions()
})
</script>
