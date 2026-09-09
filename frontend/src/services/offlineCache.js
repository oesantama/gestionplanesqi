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

  // Actualizar la caché local en mutaciones offline (POST, PUT, DELETE, PATCH)
  applyMutationToCache(endpoint, method, body) {
    if (!body || typeof body !== 'object') return

    try {
      const parts = endpoint.replace(/^\/+/, '').split('/')
      const baseEndpoint = parts[0] // ej: 'empresas', 'planes', 'capacitaciones'
      const idFromRoute = parts.length > 1 && !isNaN(parts[1]) ? Number(parts[1]) : null

      const targetEndpoints = [endpoint, baseEndpoint]

      for (const ep of targetEndpoints) {
        const key = this.getCacheKey(ep)
        const current = this.getCache(ep)

        if (Array.isArray(current)) {
          let updatedList = [...current]

          const matchId = (item) => {
            const itemId = item.Id_empresa || item.Id_plan || item.Id_capacitacion || item.id || item.Id
            const bodyId = body.Id_empresa || body.Id_plan || body.Id_capacitacion || body.id || body.Id || idFromRoute
            return itemId == bodyId
          }

          if (method === 'POST') {
            const newItem = {
              Id_empresa: body.Id_empresa || Date.now(),
              id: body.id || Date.now(),
              ...body,
              _offline_created: true
            }
            updatedList.unshift(newItem)
            this.setCache(ep, updatedList)
            logger.info(`Mutación POST aplicada a la caché local [${key}]`, newItem)
          } else if (method === 'PUT' || method === 'PATCH') {
            const index = updatedList.findIndex(matchId)
            if (index !== -1) {
              updatedList[index] = { ...updatedList[index], ...body, _offline_updated: true }
            } else {
              updatedList.unshift({ ...body, _offline_updated: true })
            }
            this.setCache(ep, updatedList)
            logger.info(`Mutación ${method} aplicada a la caché local [${key}]`)
          } else if (method === 'DELETE') {
            updatedList = updatedList.filter(item => !matchId(item))
            this.setCache(ep, updatedList)
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
