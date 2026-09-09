import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'

import routes from './routes.js'

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
    const errMsg = (error && error.message) ? error.message : String(error)
    const isChunkError = errMsg.includes('Failed to fetch dynamically imported module') ||
                         errMsg.includes('Importing a module script failed') ||
                         errMsg.includes('text/html')

    if (isChunkError) {
      console.warn('⚡ Nueva versión detectada en el servidor. Recargando bundle...')
      if (typeof window !== 'undefined') {
        const targetPath = to ? to.fullPath : '/'
        window.location.href = targetPath
      }
    }
  })

  return Router
})
