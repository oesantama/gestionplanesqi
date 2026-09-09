<template>
  <q-dialog v-model="isOpen" persistent max-width="680px">
    <q-card class="bg-grey-9 text-white rounded-borders" style="width: 100%; max-width: 680px;">
      <!-- Header -->
      <q-card-section class="row items-center justify-between bg-dark q-py-sm">
        <div class="row items-center gap-xs text-subtitle1 text-weight-bold text-primary">
          <q-icon name="tune" size="sm" />
          <span>Configuración de Servidor, Datos & Offline</span>
        </div>
        <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
      </q-card-section>

      <q-separator dark />

      <!-- Navigation Tabs -->
      <q-tabs v-model="activeTab" dark active-color="primary" indicator-color="primary" align="justify" dense class="bg-grey-10">
        <q-tab name="server" icon="dns" label="Servidor API" />
        <q-tab name="offline" icon="cloud_off" label="Cola Offline">
          <q-badge v-if="pendingCount > 0" color="orange" floating>{{ pendingCount }}</q-badge>
        </q-tab>
        <q-tab name="logs" icon="terminal" label="Logs Diagnóstico" />
      </q-tabs>

      <q-separator dark />

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="bg-grey-9 text-white">
        <!-- Panel 1: Servidor API -->
        <q-tab-panel name="server" class="q-pa-md q-gutter-y-md">
          <div class="text-caption text-grey-4">
            Especifica la URL pública o IP del servidor backend de la API para Android, Windows y la versión Web.
          </div>

          <div>
            <div class="text-subtitle2 text-grey-3 q-mb-xs">URL Actual de la API:</div>
            <q-input
              v-model="inputApiUrl"
              outlined
              dark
              dense
              placeholder="https://gestion.qinspecting.com/api"
              color="primary"
              class="full-width"
            >
              <template #prepend>
                <q-icon name="language" color="primary" />
              </template>
            </q-input>
          </div>

          <div class="row q-col-gutter-sm justify-end">
            <div class="col-xs-12 col-sm-auto">
              <q-btn label="Restablecer URL" flat color="grey-4" no-caps class="full-width" @click="onResetUrl" />
            </div>
            <div class="col-xs-12 col-sm-auto">
              <q-btn label="Probar Conexión" outline color="info" icon="network_check" no-caps class="full-width" :loading="testing" @click="onTestConnection" />
            </div>
            <div class="col-xs-12 col-sm-auto">
              <q-btn label="Guardar Servidor" color="primary" text-color="dark" icon="save" no-caps class="full-width text-weight-bold" @click="onSaveUrl" />
            </div>
          </div>

          <q-banner v-if="testResult" :class="testResult.ok ? 'bg-positive text-white' : 'bg-negative text-white'" class="rounded-borders q-mt-sm">
            <template #avatar>
              <q-icon :name="testResult.ok ? 'check_circle' : 'error'" />
            </template>
            <div class="text-weight-bold">{{ testResult.ok ? '¡Conexión Exitosa con la API!' : 'Fallo en la prueba de conexión' }}</div>
            <div class="text-caption">
              {{ testResult.message }}
              <span v-if="testResult.ok"> (Latencia: {{ testResult.latency }}ms)</span>
            </div>
          </q-banner>
        </q-tab-panel>

        <!-- Panel 2: Cola Offline -->
        <q-tab-panel name="offline" class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-subtitle2 text-grey-2">Registros Pendientes de Sincronizar</div>
              <div class="text-caption text-grey-4">Peticiones almacenadas en el dispositivo mientras estuvo sin internet.</div>
            </div>
            <div class="row gap-xs">
              <q-btn icon="sync" label="Sincronizar Ahora" color="primary" text-color="dark" size="sm" no-caps :loading="syncing" @click="onManualSync" />
              <q-btn icon="delete" label="Limpiar Cola" color="negative" flat size="sm" no-caps @click="onClearQueue" />
            </div>
          </div>

          <div class="bg-black q-pa-sm rounded-borders overflow-auto" style="height: 250px;">
            <div v-if="!pendingItems.length" class="text-grey-6 text-center q-pt-xl">
              <q-icon name="cloud_done" size="md" color="grey-7" class="q-mb-xs" /><br />
              No hay datos pendientes en la cola local. Todo está sincronizado con el servidor.
            </div>
            <q-list v-else dark separator dense>
              <q-item v-for="item in pendingItems" :key="item.id" class="q-py-xs">
                <q-item-section avatar>
                  <q-chip dense :color="getMethodColor(item.method)" text-color="white" class="text-weight-bold text-caption">
                    {{ item.method }}
                  </q-chip>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium text-white">{{ item.endpoint }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{ item.timestamp }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-tab-panel>

        <!-- Panel 3: Logs de Diagnóstico -->
        <q-tab-panel name="logs" class="q-pa-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-caption text-grey-4">
              Historial de eventos y respuestas HTTP en tiempo real:
            </div>
            <div class="row gap-xs">
              <q-btn icon="content_copy" label="Copiar Logs" size="sm" color="primary" outline no-caps @click="copyLogs" />
              <q-btn icon="delete_sweep" label="Limpiar" size="sm" color="negative" flat no-caps @click="clearLogs" />
            </div>
          </div>

          <div class="log-console bg-black text-green-4 font-mono q-pa-sm rounded-borders overflow-auto" style="height: 250px; font-family: monospace; font-size: 12px; line-height: 1.4;">
            <div v-if="!logList.length" class="text-grey-6 text-center q-pt-xl">
              No hay logs registrados en este momento.
            </div>
            <div v-for="entry in logList" :key="entry.id" class="q-mb-xs border-b border-grey-9 pb-xs">
              <span class="text-grey-5">[{{ entry.timeFormatted }}]</span>
              <span :class="getTypeClass(entry.type)" class="text-weight-bold q-ml-xs">[{{ entry.type }}]</span>
              <span class="text-white q-ml-xs">{{ entry.message }}</span>
              <pre v-if="entry.details" class="text-amber-3 q-ml-md q-my-none text-caption" style="white-space: pre-wrap; word-break: break-all;">{{ entry.details }}</pre>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, testApiConnection, apiFetch } from '../services/api'
import { logger } from '../services/logger'
import { offlineSync } from '../services/offlineSync'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const $q = useQuasar()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('server')
const inputApiUrl = ref(getApiBaseUrl())
const testing = ref(false)
const syncing = ref(false)
const testResult = ref(null)
const logList = ref([])
const pendingItems = ref([])
const pendingCount = ref(0)

watch(isOpen, (newVal) => {
  if (newVal) {
    inputApiUrl.value = getApiBaseUrl()
    refreshData()
  }
})

function refreshData() {
  logList.value = logger.getLogs()
  pendingItems.value = offlineSync.getPendingItems()
  pendingCount.value = offlineSync.getPendingCount()
}

function getMethodColor(method) {
  switch (method) {
    case 'POST': return 'positive'
    case 'PUT': return 'warning'
    case 'DELETE': return 'negative'
    default: return 'info'
  }
}

function getTypeClass(type) {
  switch (type) {
    case 'ERROR': return 'text-red-4'
    case 'WARN': return 'text-orange-4'
    case 'NETWORK': return 'text-cyan-4'
    default: return 'text-green-4'
  }
}

async function onTestConnection() {
  testing.value = true
  testResult.value = null
  try {
    const res = await testApiConnection(inputApiUrl.value)
    testResult.value = res
  } finally {
    testing.value = false
    refreshData()
  }
}

function onSaveUrl() {
  setApiBaseUrl(inputApiUrl.value)
  $q.notify({ type: 'positive', message: 'URL de Servidor API guardada correctamente', position: 'top' })
  onTestConnection()
}

function onResetUrl() {
  resetApiBaseUrl()
  inputApiUrl.value = getApiBaseUrl()
  testResult.value = null
  $q.notify({ type: 'info', message: 'Servidor API restaurado a valor predeterminado', position: 'top' })
}

async function onManualSync() {
  syncing.value = true
  try {
    await offlineSync.triggerAutoSync(apiFetch)
  } finally {
    syncing.value = false
    refreshData()
  }
}

function onClearQueue() {
  offlineSync.clearQueue()
  refreshData()
  $q.notify({ type: 'info', message: 'Cola offline borrada', position: 'top' })
}

function copyLogs() {
  const text = logger.exportLogsAsText()
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Logs copiados al portapapeles', position: 'top' })
  }).catch(() => {
    $q.notify({ type: 'warning', message: 'No se pudo copiar automáticamente', position: 'top' })
  })
}

function clearLogs() {
  logger.clearLogs()
  refreshData()
}
</script>

<style scoped>
.gap-xs {
  gap: 8px;
}
</style>
