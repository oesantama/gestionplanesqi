import { Notify } from 'quasar'

const API_BASE_URL = '/api'

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('qi_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers
    })

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}))
      
      // Control BASC/ISO: Manejo de sesión suplantada por inicio de sesión en otro dispositivo
      const message = data.code === 'SESSION_SUPERSEDED'
        ? '⚠️ Se ha iniciado sesión desde otro dispositivo o navegador. Tu sesión anterior se ha cerrado por seguridad (ISO 27001 / BASC).'
        : (data.message || 'Sesión expirada o no autorizada.')

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
      throw new Error(data.message || 'Acceso prohibido')
    }

    return response
  } catch (error) {
    throw error
  }
}
