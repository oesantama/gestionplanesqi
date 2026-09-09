// Módulo de Caché Local Persistente para Funcionamiento 100% Offline (GET, POST, PUT)
import { logger } from './logger'

const CACHE_PREFIX = 'qi_cache_'

export class OfflineCacheService {
  getCacheKey(endpoint) {
    const clean = endpoint.split('?')[0].replace(/\/+$/, '').replace(/^\/+/, '')
    return `${CACHE_PREFIX}${clean}`
  }

  // Guardar datos devueltos por el servidor cuando se tiene internet
  setCache(endpoint, data) {
    try {
      const key = this.getCacheKey(endpoint)
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data
      }))
      logger.info(`Caché local actualizada para [${key}]`)
    } catch (err) {
      logger.warn(`No fue posible guardar caché para [${endpoint}]:`, err.message)
    }
  }

  // Recuperar datos en caché si el dispositivo está sin datos ni internet
  getCache(endpoint) {
    try {
      const key = this.getCacheKey(endpoint)
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        logger.info(`Datos cargados desde caché local para [${key}]`)
        return parsed.data
      }
    } catch (err) {
      logger.error(`Error leyendo caché de [${endpoint}]:`, err.message)
    }
    return null
  }

  // Actualizar la caché local en mutaciones offline (POST, PUT, DELETE) para que la UI se actualice inmediatamente sin internet
  applyMutationToCache(endpoint, method, body) {
    if (!body || typeof body !== 'object') return

    try {
      const key = this.getCacheKey(endpoint)
      const current = this.getCache(endpoint)

      if (Array.isArray(current)) {
        let updatedList = [...current]

        if (method === 'POST') {
          // Agregar elemento creado offline con ID temporal si no tiene
          const newItem = {
            id: body.id || `offline-${Date.now()}`,
            ...body,
            _offline_created: true
          }
          updatedList.unshift(newItem)
          this.setCache(endpoint, updatedList)
          logger.info(`Mutación POST aplicada a la caché local [${key}]`, newItem)
        } else if (method === 'PUT' || method === 'PATCH') {
          // Actualizar elemento en lista
          const index = updatedList.findIndex(item => item.id === body.id)
          if (index !== -1) {
            updatedList[index] = { ...updatedList[index], ...body, _offline_updated: true }
          } else {
            updatedList.unshift({ ...body, _offline_updated: true })
          }
          this.setCache(endpoint, updatedList)
          logger.info(`Mutación PUT aplicada a la caché local [${key}]`)
        } else if (method === 'DELETE') {
          if (body.id) {
            updatedList = updatedList.filter(item => item.id !== body.id)
            this.setCache(endpoint, updatedList)
            logger.info(`Mutación DELETE aplicada a la caché local [${key}]`)
          }
        }
      }
    } catch (err) {
      logger.warn(`Error aplicando mutación offline a la caché:`, err.message)
    }
  }

  clearAllCache() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      logger.info('Caché local reseteada')
    } catch (e) {}
  }
}

export const offlineCache = new OfflineCacheService()
