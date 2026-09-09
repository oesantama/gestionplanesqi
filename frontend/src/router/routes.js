const routes = [
  {
    path: '/login',
    meta: { isPublic: true },
    component: () => import('../pages/LoginPage.vue')
  },
  {
    path: '/recuperar-contrasena',
    meta: { isPublic: true },
    component: () => import('../pages/ForgotPasswordPage.vue')
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/IndexPage.vue') },
      { path: 'empresas', component: () => import('../pages/EmpresasPage.vue') },
      { path: 'planes', component: () => import('../pages/PlanesPage.vue') },
      { path: 'planes-empresas', component: () => import('../pages/PlanesEmpresasPage.vue') },
      { path: 'empleados', component: () => import('../pages/EmpleadosPage.vue') },
      { path: 'mensajes', component: () => import('../pages/MensajesPage.vue') },
      { path: 'perfil', component: () => import('../pages/PerfilPage.vue') },
      { path: 'configuracion/menus', component: () => import('../pages/MenuConfigPage.vue') },
      { path: 'configuracion/usuarios', component: () => import('../pages/UsuariosRolesPage.vue') },
      { path: 'configuracion/bitacora', component: () => import('../pages/BitacoraPage.vue') },
      { path: 'capacitaciones-operadora', component: () => import('../pages/CapacitacionesOperadoraPage.vue') }
    ]
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    meta: { isPublic: true },
    component: () => import('../pages/ErrorNotFound.vue')
  }
]

export default routes
