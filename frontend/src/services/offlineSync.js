// Módulo de Almacenamiento Offline y Sincronización Automática en Segundo Plano (Capacitor Android, Electron Windows & Web)

import { Notify } from 'quasar'
import { logger } from './logger'

const QUEUE_KEY = 'qi_offline_queue'

class OfflineSyncService {
  constructor() {
    this.isOnline = navigator.onLine !== false
    this.queue = this.loadQueue()
    this.syncing = false
    this.initListeners()
  }

  loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    } catch (err) {
      logger.error('Error guardando cola offline en localStorage', err.message)
    }
  }

  initListeners() {
    if (typeof window === 'undefined') return

    const handleReconnection = async () => {
      logger.info('Evento de red: Conectado a internet/datos. Comprobando servidor...')
      const apiModule = await import('./api.js')
      const isConnected = await apiModule.checkRealConnectivity()
      if (isConnected) {
        this.isOnline = true
        this.notifyOnline()
        this.triggerAutoSync(apiModule.apiFetch)
      }
    }

    window.addEventListener('online', handleReconnection)

    window.addEventListener('offline', () => {
      logger.warn('Evento de red: Dispositivo SIN conexión a internet o datos')
      this.isOnline = false
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('qi_is_offline', 'true')
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qi-network-status', { detail: { online: false } }))
      }
      this.notifyOffline()
    })

    // Comprobación periódica automática cada 6 segundos cuando hay elementos pendientes o estado offline
    setInterval(async () => {
      if (typeof localStorage !== 'undefined' && (this.queue.length > 0 || localStorage.getItem('qi_is_offline') === 'true')) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const apiModule = await import('./api.js')
          const isConnected = await apiModule.checkRealConnectivity()
          if (isConnected && this.queue.length > 0) {
            this.triggerAutoSync(apiModule.apiFetch)
          }
        }
      }
    }, 6000)
  }

  notifyOffline() {
    Notify.create({
      type: 'warning',
      message: '⚠️ Estás sin conexión a internet o datos. Los cambios se guardarán localmente en el dispositivo.',
      icon: 'wifi_off',
      position: 'top',
      timeout: 5000,
      actions: [{ label: 'Entendido', color: 'white' }]
    })
  }

  notifyOnline() {
    Notify.create({
      type: 'info',
      message: '🌐 Conexión restablecida. Comprobando sincronización en segundo plano...',
      icon: 'wifi',
      position: 'top',
      timeout: 4000
    })
  }

  // Encolar una petición para envío diferido cuando retorne la conexión
  enqueueRequest(endpoint, method = 'POST', body = null, headers = {}) {
    const queueItem = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      endpoint,
      method: method.toUpperCase(),
      body,
      headers
    }

    this.queue.push(queueItem)
    this.saveQueue()
    logger.info(`Petición guardada en cola offline (${this.queue.length} pendientes)`, queueItem)

    Notify.create({
      type: 'warning',
      message: `📥 Operación guardada localmente (${this.queue.length} en espera de datos/internet).`,
      icon: 'cloud_off',
      position: 'bottom-right',
      timeout: 4000
    })

    return queueItem
  }

  getPendingCount() {
    return this.queue.length
  }

  getPendingItems() {
    return this.queue
  }

  clearQueue() {
    this.queue = []
    this.saveQueue()
  }

  // Sincronizar automáticamente en segundo plano todos los registros encolados
  async triggerAutoSync(apiFetchFn) {
    if (this.syncing || !this.queue.length) return
    if (!navigator.onLine) return

    this.syncing = true
    const totalToSync = this.queue.length
    logger.info(`Iniciando auto-sincronización de ${totalToSync} operaciones almacenadas...`)

    let successCount = 0
    let failedItems = []

    // Import dinámico de apiFetch para evitar dependencias circulares si no se provee
    let fetcher = apiFetchFn
    if (!fetcher) {
      const apiModule = await import('./api.js')
      fetcher = apiModule.apiFetch
    }

    const itemsToProcess = [...this.queue]

    for (const item of itemsToProcess) {
      try {
        logger.network(`Sincronizando item [${item.id}] -> ${item.method} ${item.endpoint}`)
        
        await fetcher(item.endpoint, {
          method: item.method,
          body: item.body ? JSON.stringify(item.body) : null,
          headers: item.headers
        })

        successCount++
        // Eliminar elemento procesado con éxito
        this.queue = this.queue.filter(q => q.id !== item.id)
        this.saveQueue()
      } catch (err) {
        logger.error(`Fallo sincronizando registro [${item.id}]`, err.message)
        failedItems.push(item)
      }
    }

    this.syncing = false

    if (successCount > 0) {
      Notify.create({
        type: 'positive',
        message: `✅ Sincronización automática completada. ${successCount} de ${totalToSync} registros enviados al servidor.`,
        icon: 'cloud_done',
        position: 'top',
        timeout: 6000
      })

      // Emitir evento global para refrescar vistas Vue si están abiertas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qi-offline-synced', { detail: { count: successCount } }))
      }
    }

    if (failedItems.length > 0) {
      Notify.create({
        type: 'negative',
        message: `⚠️ Quedan ${failedItems.length} registros pendientes de sincronización por error de servidor.`,
        icon: 'sync_problem',
        position: 'top',
        timeout: 6000
      })
    }
  }
}

export const offlineSync = new OfflineSyncService()
