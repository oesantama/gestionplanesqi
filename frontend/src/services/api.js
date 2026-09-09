import { Notify } from 'quasar'
import { logger } from './logger'
import { offlineSync } from './offlineSync'
import { offlineCache } from './offlineCache'
import { localUserDb } from './localUserDb'

const isNativeOrDesktop = typeof window !== 'undefined' && (
  window.Capacitor ||
  window.location.protocol === 'file:' ||
  window.location.origin === 'capacitor://localhost' ||
  (typeof process !== 'undefined' && process.versions && process.versions.electron) ||
  navigator.userAgent.includes('Electron')
)

// Lista de URLs candidatas del servidor backend para fallback automático si el operador móvil bloquea un puerto
const CANDIDATE_API_URLS = [
  'https://gestion.qinspecting.com/api',
  'http://162.240.237.6:8060/api',
  'http://162.240.237.6:3060/api'
]

const DEFAULT_REMOTE_API = CANDIDATE_API_URLS[0]

export function getApiBaseUrl() {
  const customUrl = localStorage.getItem('qi_api_url')
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '')
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')
  }

  if (isNativeOrDesktop) {
    return DEFAULT_REMOTE_API
  }

  return '/api'
}

export function setApiBaseUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('qi_api_url')
    logger.info('API Base URL reiniciada a valor predeterminado', getApiBaseUrl())
    return
  }
  let cleanUrl = url.trim().replace(/\/+$/, '')
  if (!cleanUrl.endsWith('/api') && !cleanUrl.includes('/api/')) {
    cleanUrl = `${cleanUrl}/api`
  }
  localStorage.setItem('qi_api_url', cleanUrl)
  logger.info(`API Base URL actualizada manualmente: ${cleanUrl}`)
}

export function resetApiBaseUrl() {
  localStorage.removeItem('qi_api_url')
  logger.info('API Base URL restaurada')
}

export async function testApiConnection(targetUrl = null) {
  const urlsToTest = targetUrl 
    ? [targetUrl.trim().replace(/\/+$/, '')]
    : [getApiBaseUrl(), ...CANDIDATE_API_URLS]

  // Eliminar duplicados
  const uniqueUrls = [...new Set(urlsToTest.map(u => u.endsWith('/api') ? u : u + '/api'))]
  
  logger.info(`Iniciando prueba de conectividad de servidor en ${uniqueUrls.length} candidato(s)...`)

  for (const baseUrl of uniqueUrls) {
    const pingEndpoint = `${baseUrl}/auth/login`
    const startTime = Date.now()

    try {
      logger.info(`Probando puerto/URL: ${pingEndpoint}`)
      
      // Intentar primero POST con cuerpo vacío (devuelve 400 Bad Request si la API Express/Nginx responde)
      let response
      try {
        response = await fetch(pingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      } catch (postErr) {
        // Fallback a OPTIONS si POST falla por restricción de CORS
        response = await fetch(pingEndpoint, {
          method: 'OPTIONS',
          headers: { 'Accept': 'application/json' }
        })
      }

      const latency = Date.now() - startTime

      if (response && (response.ok || response.status === 400 || response.status === 401 || response.status === 422 || response.status === 404 || response.status === 405)) {
        logger.info(`¡Conexión exitosa encontrada en ${baseUrl}! (${latency}ms)`)
        setApiBaseUrl(baseUrl)
        return { ok: true, latency, status: response.status, baseUrl, message: `Conexión establecida con ${baseUrl}` }
      }
    } catch (err) {
      logger.warn(`Fallo al intentar puerto ${baseUrl}: ${err.message}`)
    }
  }

  return { ok: false, status: 0, message: `No fue posible conectar con ninguna de las IPs o puertos del servidor` }
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('qi_token')
  const method = (options.method || 'GET').toUpperCase()
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  }

  let baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint
  
  let url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${cleanEndpoint}`

  logger.network(`HTTP ${method} -> ${url}`)

  // Interceptar modo sin conexión (Offline) directo antes de intentar red
  if (isOffline) {
    if (cleanEndpoint.includes('/auth/login') && method === 'POST') {
      let bodyData = options.body
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData) } catch {}
      }
      const { username, password } = bodyData || {}
      const authRes = localUserDb.authenticate(username, password)

      if (authRes.status === 'SUCCESS') {
        logger.info(`📶 Autenticación Offline directa en la base local exitosa para [${username}]`)
        return new Response(JSON.stringify({
          ok: true,
          token: authRes.user.token,
          usuario: authRes.user.usuario,
          offline: true,
          message: 'Sesión iniciada correctamente en modo sin conexión'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      } else if (authRes.status === 'INVALID_PASSWORD') {
        return new Response(JSON.stringify({
          ok: false,
          message: 'Contraseña incorrecta (Verificación local offline)'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      }
    }

    if (method === 'GET') {
      logger.warn(`Dispositivo Offline: Recuperando caché para GET ${cleanEndpoint}`)
      const cached = offlineCache.getCache(cleanEndpoint)
      const dataToReturn = cached !== null ? cached : []
      return new Response(JSON.stringify(dataToReturn), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !endpoint.includes('/auth/login')) {
      logger.warn(`Dispositivo Offline: Encolando mutación ${method} ${cleanEndpoint}`)
      let bodyData = options.body
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData) } catch {}
      }
      offlineSync.enqueueRequest(cleanEndpoint, method, bodyData, options.headers)
      offlineCache.applyMutationToCache(cleanEndpoint, method, bodyData)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qi-offline-mutation', { detail: { endpoint: cleanEndpoint, method } }))
      }

      return new Response(JSON.stringify({ success: true, offline: true, message: 'Operación guardada localmente en tu dispositivo.', data: bodyData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    })

    logger.network(`HTTP Response ${response.status} <- ${url}`)

    // Si la respuesta de inicio de sesión fue exitosa, registrar/actualizar el usuario en la base de datos local para uso offline futuro
    if (response.ok && cleanEndpoint.includes('/auth/login') && method === 'POST') {
      try {
        const cloned = response.clone()
        const data = await cloned.json()
        let bodyData = options.body
        if (typeof bodyData === 'string') {
          try { bodyData = JSON.parse(bodyData) } catch {}
        }
        if (data.token && data.usuario && bodyData && bodyData.username && bodyData.password) {
          localUserDb.saveUser(bodyData.username, bodyData.password, data.token, data.usuario)
        }
      } catch (e) {
        logger.warn('Error guardando credenciales en base local post-login:', e.message)
      }
    }

    // Si la respuesta de consulta GET es exitosa, actualizar la caché local para disponibilidad offline
    if (response.ok && method === 'GET') {
      try {
        const cloned = response.clone()
        const data = await cloned.json()
        offlineCache.setCache(cleanEndpoint, data)
      } catch (e) {}
    }

    // Si retornó la conexión y hay items encolados, sincronizar en segundo plano
    if (response.ok && offlineSync.getPendingCount() > 0) {
      offlineSync.triggerAutoSync(apiFetch)
    }

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}))
      
      const message = data.code === 'SESSION_SUPERSEDED'
        ? '⚠️ Se ha iniciado sesión desde otro dispositivo o navegador. Tu sesión anterior se ha cerrado por seguridad.'
        : (data.message || 'Sesión expirada o no autorizada.')

      logger.warn('Sesión terminada (401)', message)

      Notify.create({
        type: 'warning',
        message,
        icon: 'security',
        position: 'top',
        timeout: 6000
      })

      localStorage.removeItem('qi_token')
      localStorage.removeItem('qi_user')

      if (window.location.hash || window.location.pathname !== '/login') {
        window.location.href = '/login'
      }

      throw new Error(message)
    }

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}))
      if (data.code === 'PASSWORD_EXPIRED' || data.password_expirado) {
        window.dispatchEvent(new CustomEvent('qi-password-expired', { detail: data }))
      }
      logger.warn('Acceso prohibido (403)', data)
      throw new Error(data.message || 'Acceso prohibido')
    }

    return response
  } catch (error) {
    logger.error(`Fallo inicial en apiFetch (${url})`, error.message)

    // Fallback de Autenticación Offline si ocurrió un error de red durante el intento de inicio de sesión
    if (cleanEndpoint.includes('/auth/login') && method === 'POST') {
      let bodyData = options.body
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData) } catch {}
      }
      const { username, password } = bodyData || {}
      const authRes = localUserDb.authenticate(username, password)

      if (authRes.status === 'SUCCESS') {
        logger.info(`📶 Fallo de red recuperado exitosamente: Autenticando [${username}] con la base local de usuarios.`)
        return new Response(JSON.stringify({
          ok: true,
          token: authRes.user.token,
          usuario: authRes.user.usuario,
          offline: true,
          message: 'Sin conexión a internet. Sesión iniciada correctamente con credenciales guardadas en la base local.'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      } else if (authRes.status === 'INVALID_PASSWORD') {
        return new Response(JSON.stringify({
          ok: false,
          message: 'Contraseña incorrecta (Verificación local offline)'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      } else {
        throw new Error(`📶 Dispositivo sin conexión a internet y no se encontró registro previo de [${username || 'este usuario'}] en la base de datos local. Conéctate a la red la primera vez para autenticar tus credenciales.`)
      }
    }

    // Si falló por error de red/fetch pero tenemos datos en caché para GET, devolver la caché
    if (method === 'GET') {
      const cached = offlineCache.getCache(cleanEndpoint)
      if (cached !== null) {
        logger.info(`Fallo de red en GET: Devolviendo caché local guardada para [${cleanEndpoint}]`)
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Si la llamada de mutación falló por caída de red inesperada, guardar en cola local y actualizar caché
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !endpoint.includes('/auth/login') && (error.message.includes('fetch') || error.name === 'TypeError')) {
      logger.warn(`Fallo de red en mutación: Encolando ${method} ${cleanEndpoint}`)
      let bodyData = options.body
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData) } catch {}
      }
      offlineSync.enqueueRequest(cleanEndpoint, method, bodyData, options.headers)
      offlineCache.applyMutationToCache(cleanEndpoint, method, bodyData)

      return new Response(JSON.stringify({ success: true, offline: true, message: 'Sin conexión a internet. La operación ha sido guardada localmente en tu dispositivo.', data: bodyData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Si la llamada principal falló por error de red/fetch en cliente nativo, intentar auto-fallback entre los candidate URLs
    if (isNativeOrDesktop && (error.message.includes('fetch') || error.name === 'TypeError')) {
      logger.warn('Intentando autodetectar puerto o IP alternativa que no esté bloqueada por el operador 4G...')
      
      const testRes = await testApiConnection()
      if (testRes.ok) {
        const fallbackBase = testRes.baseUrl
        const fallbackUrl = `${fallbackBase}${cleanEndpoint}`
        logger.info(`Reintentando petición con URL alternativa detectada: ${fallbackUrl}`)
        
        try {
          const retryRes = await fetch(fallbackUrl, { ...options, headers })
          return retryRes
        } catch (retryErr) {
          logger.error(`Reintento también falló en ${fallbackUrl}`, retryErr.message)
        }
      }
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('📶 Dispositivo sin conexión a datos ni internet. Por favor activa los datos móviles o conéctate a WiFi.')
      }
      throw new Error(`Fallo de red al conectar al servidor (${baseUrl}). Verifica tu señal de datos móviles o internet.`)
    }

    throw error
  }
}
