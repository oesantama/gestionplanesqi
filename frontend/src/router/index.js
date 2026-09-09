import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'

import routes from './routes.js'

function reloadForNewVersion(targetUrl = null) {
  if (typeof window === 'undefined') return
  const key = 'qi_chunk_reload_timestamp'
  const lastReload = parseInt(sessionStorage.getItem(key) || '0', 10)
  const now = Date.now()

  // Prevenir bucles de recarga (máximo 1 recarga cada 8 segundos)
  if (now - lastReload > 8000) {
    sessionStorage.setItem(key, String(now))
    console.warn('⚡ Nueva versión detectada en el servidor. Actualizando aplicación...')
    if (targetUrl && window.location.pathname !== targetUrl) {
      window.location.href = targetUrl
    } else {
      window.location.reload()
    }
  }
}

function isChunkError(errorReason) {
  const errMsg = String(errorReason?.message || errorReason || '')
  return (
    errMsg.includes('Failed to fetch dynamically imported module') ||
    errMsg.includes('Importing a module script failed') ||
    errMsg.includes('error loading dynamically imported module') ||
    errMsg.includes('ERR_ABORTED') ||
    errMsg.includes('text/html') ||
    errMsg.includes('404')
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkError(event.reason)) {
      event.preventDefault()
      reloadForNewVersion()
    }
  })

  window.addEventListener('error', (event) => {
    if (isChunkError(event.message || event.error)) {
      event.preventDefault()
      reloadForNewVersion()
    }
  }, true)
}

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
  })

  // Protector Global de Navegación (Navigation Guard)
  // Redirige automáticamente a /login si el usuario no tiene token de sesión válido
  Router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('qi_token')
    const isPublic = to.matched.some(record => record.meta.isPublic) || to.path === '/login' || to.path === '/recuperar-contrasena'

    if (!isPublic && !token) {
      // Intento de acceso sin autenticación -> Redirigir a /login
      next('/login')
    } else if (token && (to.path === '/login' || to.path === '/recuperar-contrasena')) {
      // Usuario ya autenticado intentando ir a /login -> Redirigir al inicio /
      next('/')
    } else {
      next()
    }
  })

  // Recarga automática limpia ante cambio de versión / módulo JS no encontrado por deploy
  Router.onError((error, to) => {
    if (isChunkError(error)) {
      reloadForNewVersion(to ? to.fullPath : null)
    }
  })

  return Router
})
