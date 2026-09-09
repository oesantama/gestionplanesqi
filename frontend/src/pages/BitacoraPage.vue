<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Bitácora de Auditoría de Seguridad</div>
        <div class="text-caption text-grey-4">Registro inalterable de eventos de acceso e inicios de sesión (Auditoría de Seguridad)</div>
      </div>
    </div>

    <!-- Tabla de Bitácora -->
    <QiTable
      title="Bitácora de Auditoría"
      :rows="logs"
      :columns="columns"
      row-key="id"
      :loading="loading"
      export-filename="bitacora_seguridad_qi"
      placeholder="Buscar por Usuario, Evento o Dirección IP..."
      no-data-label="No hay registros en la bitácora"
      v-model:filter="filter"
      @request="fetchBitacora"
    >
      <template #body-cell-evento="props">
        <q-td :props="props">
          <q-chip
            :color="getEventColor(props.row.evento)"
            text-color="white"
            dense
            size="sm"
            class="text-weight-bold"
          >
            {{ props.row.evento }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-fecha="props">
        <q-td :props="props">
          {{ formatDateTime(props.row.fecha) }}
        </q-td>
      </template>
    </QiTable>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../services/api.js'
import { exportTableToExcel } from '../utils/exportExcel.js'
import QiTable from '../components/QiTable.vue'

function exportExcel() {
  exportTableToExcel(columns, logs.value, 'bitacora_seguridad_qi')
}

const logs = ref([])
const loading = ref(false)
const filter = ref('')

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true, align: 'left' },
  { name: 'fecha', label: 'Fecha / Hora', field: 'fecha', sortable: true, align: 'left' },
  { name: 'username', label: 'Usuario', field: 'username', sortable: true, align: 'left' },
  { name: 'evento', label: 'Evento de Seguridad', field: 'evento', align: 'left' },
  { name: 'ip_origen', label: 'IP Origen', field: 'ip_origen', align: 'left' },
  { name: 'detalles', label: 'Detalles JSON', field: 'detalles', align: 'left' }
]

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getEventColor(evento) {
  if (evento.includes('EXITOSO')) return 'positive'
  if (evento.includes('BLOQUEADO')) return 'negative'
  if (evento.includes('FALLIDO')) return 'warning'
  return 'info'
}

async function fetchBitacora() {
  loading.value = true
  try {
    const res = await apiFetch(`/bitacora?search=${encodeURIComponent(filter.value)}`)
    if (res.ok) {
      const data = await res.json()
      logs.value = data.rows || []
    }
  } catch (err) {
    console.error('Error al cargar bitacora:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBitacora()
})
</script>
