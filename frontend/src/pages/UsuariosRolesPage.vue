<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Gestión de Usuarios, Roles y Permisos</div>
        <div class="text-caption text-grey-4">Administración de acceso de usuarios y matriz granular de permisos (ISO 27001 / BASC)</div>
      </div>
      <q-btn
        v-if="activeTab === 'usuarios'"
        color="primary"
        text-color="dark"
        icon="person_add"
        label="Nuevo Usuario"
        no-caps
        unelevated
        class="text-weight-bold"
        style="border-radius: 8px;"
        @click="openCreateUserDialog"
      />
    </div>

    <!-- Pestañas -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-4 q-mb-md"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="usuarios" icon="people" label="Gestión de Usuarios" no-caps class="text-weight-bold" />
      <q-tab name="permisos" icon="security" label="Matriz de Permisos por Rol" no-caps class="text-weight-bold" />
    </q-tabs>

    <q-separator dark class="q-mb-lg" />

    <!-- CONTENIDO TAB 1: GESTIÓN DE USUARIOS -->
    <div v-if="activeTab === 'usuarios'">
      <q-card class="qi-card">
        <q-table
          :rows="usuarios"
          :columns="userColumns"
          :filter="userFilter"
          row-key="id"
          dark
          flat
          :loading="loadingUsers"
          no-data-label="No hay usuarios registrados"
        >
          <template #top>
            <div class="row full-width items-center justify-between q-col-gutter-sm q-py-xs">
              <div class="text-subtitle1 text-weight-bold text-white">Directorio de Usuarios del Sistema</div>
              <div class="row items-center q-gutter-sm">
                <q-input
                  v-model="userFilter"
                  outlined
                  dark
                  dense
                  placeholder="Buscar usuario, nombre, rol..."
                  color="primary"
                  style="min-width: 250px;"
                >
                  <template #append>
                    <q-icon name="search" color="primary" />
                    <q-icon v-if="userFilter" name="close" class="cursor-pointer" @click="userFilter = ''" />
                  </template>
                </q-input>
                <q-btn
                  color="positive"
                  icon="file_download"
                  label="Exportar a Excel"
                  no-caps
                  unelevated
                  class="text-weight-bold"
                  @click="exportUserExcel"
                />
              </div>
            </div>
          </template>
          <template #body-cell-estado="props">
            <q-td :props="props">
              <q-chip
                v-if="props.row.estado === 2 || (props.row.bloqueado_hasta && new Date(props.row.bloqueado_hasta) > new Date())"
                color="negative"
                text-color="white"
                dense
                size="sm"
                class="text-weight-bold"
              >
                BLOQUEADO (5 INTENTOS)
              </q-chip>
              <q-chip
                v-else
                :color="props.row.estado === 1 ? 'positive' : 'grey-8'"
                text-color="white"
                dense
                size="sm"
                class="text-weight-bold"
              >
                {{ props.row.estado === 1 ? 'ACTIVO' : 'INACTIVO' }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-ultimo_login="props">
            <q-td :props="props">
              {{ formatDateTime(props.row.ultimo_login) }}
            </q-td>
          </template>

          <template #body-cell-acciones="props">
            <q-td :props="props" align="center">
              <q-btn
                v-if="props.row.estado === 2 || (props.row.bloqueado_hasta && new Date(props.row.bloqueado_hasta) > new Date())"
                flat
                round
                dense
                icon="lock_open"
                color="warning"
                @click="unblockUser(props.row)"
              >
                <q-tooltip>Desbloquear Cuenta</q-tooltip>
              </q-btn>

              <q-btn flat round dense icon="edit" color="primary" @click="openEditUserDialog(props.row)">
                <q-tooltip>Editar Usuario</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- CONTENIDO TAB 2: MATRIZ DE PERMISOS POR ROL -->
    <div v-if="activeTab === 'permisos'">
      <q-card class="qi-card q-pa-md q-mb-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-x-md" style="min-width: 340px;">
            <span class="text-subtitle1 text-weight-bold text-white">Seleccionar Rol:</span>
            <q-select
              v-model="selectedRolId"
              :options="roleOptions"
              emit-value
              map-options
              outlined
              dark
              dense
              color="primary"
              style="min-width: 240px;"
              @update:model-value="fetchPermisosRol"
            />
          </div>

          <q-btn
            color="primary"
            text-color="dark"
            icon="save"
            label="Guardar Permisos"
            no-caps
            unelevated
            class="text-weight-bold"
            :loading="savingPermissions"
            @click="savePermissions"
          />
        </div>
      </q-card>

      <q-card class="qi-card">
        <div v-if="loadingPermissions" class="text-center q-pa-xl">
          <q-spinner-dots color="primary" size="40px" />
        </div>

        <q-markup-table v-else dark flat class="bg-transparent">
          <thead>
            <tr>
              <th class="text-left text-primary">Módulo / Opción del Menú</th>
              <th class="text-center text-primary">Tipo</th>
              <th class="text-center">Ver</th>
              <th class="text-center">Crear</th>
              <th class="text-center">Editar</th>
              <th class="text-center">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in menuHierarchy" :key="'item-' + item.tipo + '-' + item.id">
              <tr :class="item.tipo === 'menu' ? 'bg-dark text-weight-bold' : ''">
                <td class="text-left">
                  <div class="row items-center" :style="{ paddingLeft: item.tipo === 'submenu' ? '24px' : '0px' }">
                    <q-icon :name="item.icono || 'circle'" size="18px" color="primary" class="q-mr-sm" />
                    <span>{{ item.nombre }}</span>
                  </div>
                </td>
                <td class="text-center">
                  <q-chip :color="item.tipo === 'menu' ? 'primary' : 'secondary'" text-color="dark" size="xs" class="text-weight-bold">
                    {{ item.tipo === 'menu' ? 'MENÚ PRINCIPAL' : 'SUBMENÚ' }}
                  </q-chip>
                </td>
                <td class="text-center">
                  <q-checkbox v-model="item.permiso.puede_ver" dark color="primary" dense />
                </td>
                <td class="text-center">
                  <q-checkbox v-model="item.permiso.puede_crear" dark color="primary" dense />
                </td>
                <td class="text-center">
                  <q-checkbox v-model="item.permiso.puede_editar" dark color="primary" dense />
                </td>
                <td class="text-center">
                  <q-checkbox v-model="item.permiso.puede_eliminar" dark color="primary" dense />
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card>
    </div>

    <!-- Modal Formulario Usuario -->
    <q-dialog v-model="userDialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 580px; max-width: 92vw; border-radius: 14px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md" style="max-height: 75vh; overflow-y: auto;">
          <q-input
            v-model="userForm.nombre_completo"
            label="Nombre Completo *"
            outlined
            dark
            dense
            color="primary"
            :rules="[val => !!val.trim() || 'El nombre completo es requerido']"
          />
          <q-input
            v-model="userForm.username"
            label="Usuario *"
            outlined
            dark
            dense
            color="primary"
            :disable="isEditingUser"
            :rules="[val => !!val.trim() || 'El usuario es requerido']"
          />
          <q-input
            v-model="userForm.email"
            label="Correo Electrónico *"
            type="email"
            outlined
            dark
            dense
            color="primary"
            :rules="[
              val => !!val.trim() || 'El correo es requerido',
              val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Correo electrónico no válido'
            ]"
          />
          
          <!-- Contraseña -->
          <q-input
            v-model="userForm.password"
            :type="showPassword ? 'text' : 'password'"
            :label="isEditingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'"
            outlined
            dark
            dense
            color="primary"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer text-grey-4"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <!-- Lista de validación en tiempo real para contraseña -->
          <div
            v-if="userForm.password || !isEditingUser"
            class="qi-card q-pa-sm text-caption"
            :style="{
              border: isPasswordValid ? '1px solid rgba(0, 210, 106, 0.4)' : '1px solid rgba(255, 77, 79, 0.5)',
              background: isPasswordValid ? 'rgba(0, 210, 106, 0.05)' : 'rgba(255, 77, 79, 0.05)'
            }"
          >
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-weight-bold" :class="isPasswordValid ? 'text-positive' : 'text-negative'">
                {{ isPasswordValid ? '✓ Contraseña Cumple Todos los Requisitos de Seguridad' : '⚠️ Requisitos de Contraseña Faltantes (ISO 27001 / BASC):' }}
              </span>
            </div>
            <div class="row q-col-gutter-xs">
              <div class="col-6" :class="hasMinLength ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="hasMinLength ? 'check_circle' : 'cancel'" :color="hasMinLength ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                Mínimo 8 caracteres
              </div>
              <div class="col-6" :class="hasUppercase ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="hasUppercase ? 'check_circle' : 'cancel'" :color="hasUppercase ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                1 Mayúscula (A-Z)
              </div>
              <div class="col-6" :class="hasLowercase ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="hasLowercase ? 'check_circle' : 'cancel'" :color="hasLowercase ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                1 Minúscula (a-z)
              </div>
              <div class="col-6" :class="hasNumber ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="hasNumber ? 'check_circle' : 'cancel'" :color="hasNumber ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                1 Número (0-9)
              </div>
              <div class="col-6" :class="hasSpecialChar ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="hasSpecialChar ? 'check_circle' : 'cancel'" :color="hasSpecialChar ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                1 Carácter especial (!@#$%)
              </div>
              <div class="col-6" :class="passwordsMatch && userForm.confirmPassword ? 'text-positive text-weight-bold' : 'text-negative text-weight-bolder'">
                <q-icon :name="passwordsMatch && userForm.confirmPassword ? 'check_circle' : 'cancel'" :color="passwordsMatch && userForm.confirmPassword ? 'positive' : 'negative'" class="q-mr-xs" size="16px" />
                Contraseñas coinciden
              </div>
            </div>
          </div>

          <!-- Confirmar Contraseña -->
          <q-input
            v-if="userForm.password || !isEditingUser"
            v-model="userForm.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            label="Confirmar Contraseña *"
            outlined
            dark
            dense
            color="primary"
            :error="!!userForm.confirmPassword && !passwordsMatch"
            error-message="Las contraseñas no coinciden"
          >
            <template #append>
              <q-icon
                :name="showConfirmPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer text-grey-4"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </q-input>

          <!-- Selección de Rol -->
          <q-select
            v-model="userForm.rol_id"
            :options="roleOptions"
            emit-value
            map-options
            label="Rol del Sistema *"
            outlined
            dark
            dense
            color="primary"
            @update:model-value="onUserRoleSelected"
          />

          <!-- Mini-Menú Estructurado con Permisos Granulares del Rol Seleccionado -->
          <div v-if="userForm.rol_id" class="qi-card q-pa-sm" style="border: 1px solid rgba(0, 210, 106, 0.3); background: rgba(0, 210, 106, 0.03); border-radius: 8px;">
            <div class="text-caption text-weight-bold text-primary q-mb-xs row items-center justify-between">
              <div class="row items-center">
                <q-icon name="account_tree" class="q-mr-xs" size="16px" />
                <span>Mini-Menú & Permisos para el Rol Seleccionado:</span>
              </div>
              <span class="text-grey-5" style="font-size: 11px;">(Vista Previa de Acceso)</span>
            </div>

            <div v-if="loadingRolePreview" class="text-center q-pa-sm">
              <q-spinner-dots color="primary" size="24px" />
            </div>

            <div v-else-if="roleTreePreview.length" class="column q-gutter-y-xs text-caption">
              <div v-for="m in roleTreePreview" :key="m.id" class="q-py-xs" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <!-- Menú Nivel 1 -->
                <div class="row items-center justify-between text-weight-bold text-white">
                  <div class="row items-center">
                    <q-icon :name="m.icono || 'folder'" size="16px" color="primary" class="q-mr-xs" />
                    <span>{{ m.nombre }}</span>
                  </div>
                  <div v-if="!m.submenus || !m.submenus.length" class="row items-center q-gutter-x-xs">
                    <q-chip v-if="m.permisos?.ver" color="positive" text-color="dark" size="xs" class="text-weight-bold" dense>Ver 👁️</q-chip>
                    <q-chip v-if="m.permisos?.crear" color="info" text-color="dark" size="xs" class="text-weight-bold" dense>Crear ➕</q-chip>
                    <q-chip v-if="m.permisos?.editar" color="warning" text-color="dark" size="xs" class="text-weight-bold" dense>Editar ✏️</q-chip>
                    <q-chip v-if="m.permisos?.eliminar" color="negative" text-color="white" size="xs" class="text-weight-bold" dense>Eliminar 🗑️</q-chip>
                  </div>
                </div>

                <!-- Submenús Nivel 2 -->
                <div v-if="m.submenus && m.submenus.length" class="q-pl-md q-mt-xs column q-gutter-y-xs">
                  <div v-for="s in m.submenus" :key="s.id" class="row items-center justify-between text-grey-3">
                    <div class="row items-center">
                      <q-icon name="subdirectory_arrow_right" size="14px" color="primary" class="q-mr-xs" />
                      <q-icon :name="s.icono || 'circle'" size="14px" color="grey-4" class="q-mr-xs" />
                      <span>{{ s.nombre }}</span>
                    </div>
                    <div class="row items-center q-gutter-x-xs">
                      <q-chip v-if="s.permisos?.ver" color="positive" text-color="dark" size="xs" class="text-weight-bold" dense>Ver 👁️</q-chip>
                      <q-chip v-if="s.permisos?.crear" color="info" text-color="dark" size="xs" class="text-weight-bold" dense>Crear ➕</q-chip>
                      <q-chip v-if="s.permisos?.editar" color="warning" text-color="dark" size="xs" class="text-weight-bold" dense>Editar ✏️</q-chip>
                      <q-chip v-if="s.permisos?.eliminar" color="negative" text-color="white" size="xs" class="text-weight-bold" dense>Eliminar 🗑️</q-chip>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-caption text-grey-5 text-center q-pa-sm">
              Sin permisos de menú configurados para este rol
            </div>
          </div>

          <q-toggle v-model="userForm.estadoBool" label="Cuenta Activa" color="primary" dark />
        </q-card-section>

        <!-- Acciones del Modal: Botón Habilitado SÓLO cuando el formulario cumple todo lo obligatorio -->
        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditingUser ? 'Guardar Cambios' : 'Crear Usuario'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :disable="!isFormValid"
            :loading="savingUser"
            @click="saveUser"
          >
            <q-tooltip v-if="!isFormValid" class="bg-negative">
              Completa todos los campos obligatorios y cumple la regla de contraseña para guardar
            </q-tooltip>
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'
import { exportTableToExcel } from '../utils/exportExcel.js'

const $q = useQuasar()

const activeTab = ref('usuarios')

// Usuarios
const usuarios = ref([])
const roles = ref([])
const loadingUsers = ref(false)
const userFilter = ref('')
const userDialogOpen = ref(false)
const isEditingUser = ref(false)
const savingUser = ref(false)

function exportUserExcel() {
  exportTableToExcel(userColumns, usuarios.value, 'usuarios_sistema_qi')
}

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const roleTreePreview = ref([])
const loadingRolePreview = ref(false)

const userForm = ref({
  id: null,
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  nombre_completo: '',
  rol_id: null,
  estadoBool: true
})

const roleOptions = computed(() => {
  return roles.value.map(r => ({
    label: r.nombre,
    value: r.id
  }))
})

// Reglas reactivas de contraseña
const hasMinLength = computed(() => (userForm.value.password || '').length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(userForm.value.password || ''))
const hasLowercase = computed(() => /[a-z]/.test(userForm.value.password || ''))
const hasNumber = computed(() => /[0-9]/.test(userForm.value.password || ''))
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(userForm.value.password || ''))
const passwordsMatch = computed(() => userForm.value.password === userForm.value.confirmPassword)

const isPasswordValid = computed(() => {
  return hasMinLength.value && hasUppercase.value && hasLowercase.value && hasNumber.value && hasSpecialChar.value && passwordsMatch.value
})

// Validación completa del formulario para habilitar el botón de Guardar
const isFormValid = computed(() => {
  if (!userForm.value.nombre_completo || !userForm.value.nombre_completo.trim()) return false
  if (!userForm.value.username || !userForm.value.username.trim()) return false
  if (!userForm.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.value.email.trim())) return false
  if (!userForm.value.rol_id) return false

  if (!isEditingUser.value) {
    return isPasswordValid.value
  } else {
    // Si estamos editando y se escribió una nueva contraseña, debe ser válida
    if (userForm.value.password || userForm.value.confirmPassword) {
      return isPasswordValid.value
    }
  }

  return true
})

const userColumns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true, align: 'left' },
  { name: 'nombre_completo', label: 'Nombre Completo', field: 'nombre_completo', sortable: true, align: 'left' },
  { name: 'username', label: 'Usuario', field: 'username', sortable: true, align: 'left' },
  { name: 'email', label: 'Correo Electrónico', field: 'email', align: 'left' },
  { name: 'rol_nombre', label: 'Rol', field: 'rol_nombre', align: 'left' },
  { name: 'ultimo_login', label: 'Último Acceso', field: 'ultimo_login', align: 'center' },
  { name: 'estado', label: 'Estado / Seguridad', field: 'estado', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' }
]

// Permisos
const selectedRolId = ref(1) // Admin por defecto
const menuHierarchy = ref([])
const loadingPermissions = ref(false)
const savingPermissions = ref(false)

function formatDateTime(dateStr) {
  if (!dateStr) return 'Nunca'
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function fetchUsuarios() {
  loadingUsers.value = true
  try {
    const res = await apiFetch('/usuarios')
    if (res.ok) {
      usuarios.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar usuarios:', err)
  } finally {
    loadingUsers.value = false
  }
}

async function fetchRoles() {
  try {
    const res = await apiFetch('/roles')
    if (res.ok) {
      roles.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar roles:', err)
  }
}

async function fetchRoleAllowedMenusPreview(rolId) {
  if (!rolId) return
  loadingRolePreview.value = true
  roleTreePreview.value = []
  try {
    const res = await apiFetch(`/menu?rol_id=${rolId}`)
    if (res.ok) {
      roleTreePreview.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar vista previa del árbol de menú:', err)
  } finally {
    loadingRolePreview.value = false
  }
}

function onUserRoleSelected(rolId) {
  fetchRoleAllowedMenusPreview(rolId)
}

async function openCreateUserDialog() {
  if (!roles.value.length) {
    await fetchRoles()
  }

  isEditingUser.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  const defaultRolId = roles.value.length ? roles.value[0].id : null

  userForm.value = {
    id: null,
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    rol_id: defaultRolId,
    estadoBool: true
  }

  userDialogOpen.value = true
  if (defaultRolId) fetchRoleAllowedMenusPreview(defaultRolId)
}

async function openEditUserDialog(row) {
  if (!roles.value.length) {
    await fetchRoles()
  }

  isEditingUser.value = true
  showPassword.value = false
  showConfirmPassword.value = false
  userForm.value = {
    ...row,
    password: '',
    confirmPassword: '',
    estadoBool: row.estado === 1
  }

  userDialogOpen.value = true
  if (row.rol_id) fetchRoleAllowedMenusPreview(row.rol_id)
}

async function saveUser() {
  if (!isFormValid.value) return

  savingUser.value = true
  try {
    const payload = {
      ...userForm.value,
      estado: userForm.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditingUser.value ? `/usuarios/${userForm.value.id}` : '/usuarios'
    const method = isEditingUser.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditingUser.value ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
        position: 'top'
      })
      userDialogOpen.value = false
      fetchUsuarios()
    }
  } catch (err) {
    console.error('Error al guardar usuario:', err)
  } finally {
    savingUser.value = false
  }
}

async function unblockUser(user) {
  try {
    const res = await apiFetch(`/usuarios/${user.id}/desbloquear`, { method: 'PATCH' })
    if (res.ok) {
      $q.notify({ type: 'positive', message: `Cuenta de ${user.username} desbloqueada exitosamente`, position: 'top' })
      fetchUsuarios()
    }
  } catch (err) {
    console.error('Error al desbloquear usuario:', err)
  }
}

// Cargar estructura completa de menús + permisos del rol
async function fetchPermisosRol() {
  if (!selectedRolId.value) return
  loadingPermissions.value = true
  menuHierarchy.value = []

  try {
    const [resAdminMenu, resPermisos] = await Promise.all([
      apiFetch('/menu/admin'),
      apiFetch(`/roles/${selectedRolId.value}/permisos`)
    ])

    if (resAdminMenu.ok && resPermisos.ok) {
      const adminData = await resAdminMenu.json()
      const currentPermisos = await resPermisos.json()

      const list = []

      for (const m of adminData.menus || []) {
        const permM = currentPermisos.find(p => p.menu_id === m.id && !p.submenu_id) || {}

        list.push({
          tipo: 'menu',
          id: m.id,
          menu_id: m.id,
          submenu_id: null,
          nombre: m.nombre,
          icono: m.icono,
          permiso: {
            puede_ver: permM.puede_ver === 1 || permM.puede_ver === true,
            puede_crear: permM.puede_crear === 1 || permM.puede_crear === true,
            puede_editar: permM.puede_editar === 1 || permM.puede_editar === true,
            puede_eliminar: permM.puede_eliminar === 1 || permM.puede_eliminar === true
          }
        })

        const subItems = (adminData.submenus || []).filter(s => s.menu_id === m.id)
        for (const s of subItems) {
          const permS = currentPermisos.find(p => p.submenu_id === s.id) || {}
          list.push({
            tipo: 'submenu',
            id: s.id,
            menu_id: m.id,
            submenu_id: s.id,
            nombre: s.nombre,
            icono: s.icono,
            permiso: {
              puede_ver: permS.puede_ver === 1 || permS.puede_ver === true,
              puede_crear: permS.puede_crear === 1 || permS.puede_crear === true,
              puede_editar: permS.puede_editar === 1 || permS.puede_editar === true,
              puede_eliminar: permS.puede_eliminar === 1 || permS.puede_eliminar === true
            }
          })
        }
      }

      menuHierarchy.value = list
    }
  } catch (err) {
    console.error('Error al cargar matriz de permisos:', err)
  } finally {
    loadingPermissions.value = false
  }
}

async function savePermissions() {
  savingPermissions.value = true
  try {
    const payloadPermisos = menuHierarchy.value.map(item => ({
      menu_id: item.menu_id,
      submenu_id: item.submenu_id,
      puede_ver: item.permiso.puede_ver,
      puede_crear: item.permiso.puede_crear,
      puede_editar: item.permiso.puede_editar,
      puede_eliminar: item.permiso.puede_eliminar
    }))

    const res = await apiFetch(`/roles/${selectedRolId.value}/permisos`, {
      method: 'POST',
      body: JSON.stringify({ permisos: payloadPermisos })
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: 'Matriz de permisos de rol guardada exitosamente',
        position: 'top'
      })
    }
  } catch (err) {
    console.error('Error al guardar permisos:', err)
  } finally {
    savingPermissions.value = false
  }
}

onMounted(async () => {
  await fetchRoles()
  await fetchUsuarios()
  await fetchPermisosRol()
})
</script>
