<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header del Módulo -->
    <div class="row items-center justify-between q-mb-lg flex-wrap gap-md">
      <div>
        <div class="row items-center q-gutter-x-sm">
          <q-avatar icon="school" color="primary" text-color="dark" size="38px" />
          <div>
            <div class="text-h5 text-weight-bolder text-white">Capacitaciones Operadora</div>
            <div class="text-caption text-grey-4">Registro y consulta informativa de temas, fechas y participantes de capacitaciones</div>
          </div>
        </div>
      </div>

      <div class="row items-center q-gutter-x-sm">
        <q-btn
          color="primary"
          text-color="dark"
          icon="add"
          label="Nueva Capacitación"
          class="text-weight-bold"
          @click="openCreateDialog"
        />
        <q-btn
          flat
          round
          dense
          icon="refresh"
          color="primary"
          :loading="loading"
          @click="fetchCapacitaciones"
        >
          <q-tooltip>Actualizar Datos</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- KPIs Rápidos -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <div class="qi-card q-pa-md row items-center justify-between">
          <div>
            <div class="text-caption text-grey-4 text-weight-bold">TOTAL REGISTRADAS</div>
            <div class="text-h4 text-weight-bolder text-white q-my-xs">{{ capacitaciones.length }}</div>
            <div class="text-caption text-primary text-weight-medium">En el sistema</div>
          </div>
          <q-avatar icon="assignment" color="secondary" text-color="primary" size="44px" class="border-glow" />
        </div>
      </div>

      <div class="col-12 col-sm-4">
        <div class="qi-card q-pa-md row items-center justify-between">
          <div>
            <div class="text-caption text-grey-4 text-weight-bold">PROGRAMADAS / EN CURSO</div>
            <div class="text-h4 text-weight-bolder text-white q-my-xs">{{ countProgramadas }}</div>
            <div class="text-caption text-warning text-weight-medium">Pendientes o activas</div>
          </div>
          <q-avatar icon="pending_actions" color="secondary" text-color="warning" size="44px" class="border-glow" />
        </div>
      </div>

      <div class="col-12 col-sm-4">
        <div class="qi-card q-pa-md row items-center justify-between">
          <div>
            <div class="text-caption text-grey-4 text-weight-bold">FINALIZADAS</div>
            <div class="text-h4 text-weight-bolder text-white q-my-xs">{{ countFinalizadas }}</div>
            <div class="text-caption text-positive text-weight-medium">Completadas satisfactoriamente</div>
          </div>
          <q-avatar icon="check_circle" color="secondary" text-color="positive" size="44px" class="border-glow" />
        </div>
      </div>
    </div>

    <!-- Tabla Principal de Capacitaciones -->
    <q-card class="qi-card">
      <div class="row items-center justify-between q-pa-md gap-md">
        <div class="row items-center q-gutter-x-sm col-12 col-md-6">
          <q-input
            v-model="filterText"
            dense
            outlined
            dark
            color="primary"
            placeholder="Buscar por tema o título..."
            class="col"
            clearable
          >
            <template #prepend>
              <q-icon name="search" color="primary" />
            </template>
          </q-input>

          <q-select
            v-model="filterEstado"
            :options="estadoFilterOptions"
            emit-value
            map-options
            dense
            outlined
            dark
            color="primary"
            style="min-width: 170px;"
          />
        </div>
      </div>

      <q-table
        :rows="filteredCapacitaciones"
        :columns="columns"
        row-key="id"
        dark
        flat
        dense
        :loading="loading"
        no-data-label="No se encontraron capacitaciones registradas"
      >
        <!-- Columna Título y Descripción -->
        <template #body-cell-titulo="props">
          <q-td :props="props">
            <div class="text-weight-bold text-white text-subtitle2">{{ props.row.titulo }}</div>
            <div class="text-caption text-grey-4 ellipsis-2-lines" style="max-width: 350px;">
              {{ props.row.descripcion || 'Sin descripción adicional' }}
            </div>
          </q-td>
        </template>

        <!-- Columna Fechas -->
        <template #body-cell-fechas="props">
          <q-td :props="props">
            <div class="text-caption text-grey-3">
              <q-icon name="event" color="primary" class="q-mr-xs" />
              Realización: <span class="text-white text-weight-bold">{{ formatDate(props.row.fecha_realizacion) }}</span>
            </div>
            <div v-if="props.row.fecha_finalizacion" class="text-caption text-grey-4">
              <q-icon name="event_available" color="positive" class="q-mr-xs" />
              Finalización: {{ formatDate(props.row.fecha_finalizacion) }}
            </div>
          </q-td>
        </template>

        <!-- Columna Creado Por -->
        <template #body-cell-creador="props">
          <q-td :props="props" align="center">
            <q-chip color="secondary" text-color="primary" size="sm" class="text-weight-bold">
              <q-icon name="person" size="14px" class="q-mr-xs" />
              {{ props.row.creador_nombre || props.row.creador_username || 'Sistema' }}
            </q-chip>
          </q-td>
        </template>

        <!-- Columna Participantes -->
        <template #body-cell-participantes="props">
          <q-td :props="props" align="center">
            <q-badge color="grey-8" text-color="white" class="text-weight-bold q-px-sm q-py-xs">
              <q-icon name="groups" size="14px" class="q-mr-xs" />
              {{ props.row.total_participantes }} Participantes
            </q-badge>
          </q-td>
        </template>

        <!-- Columna Estado -->
        <template #body-cell-estado="props">
          <q-td :props="props" align="center">
            <q-chip
              v-if="props.row.estado === 1"
              color="warning"
              text-color="dark"
              size="xs"
              class="text-weight-bold"
            >
              ⚡ PROGRAMADA
            </q-chip>
            <q-chip
              v-else-if="props.row.estado === 2"
              color="primary"
              text-color="dark"
              size="xs"
              class="text-weight-bold"
            >
              ▶ EN CURSO
            </q-chip>
            <q-chip
              v-else-if="props.row.estado === 3"
              color="positive"
              text-color="dark"
              size="xs"
              class="text-weight-bold"
            >
              ✓ FINALIZADA
            </q-chip>
            <q-chip
              v-else
              color="grey-8"
              text-color="white"
              size="xs"
              class="text-weight-bold"
            >
              INACTIVA
            </q-chip>
          </q-td>
        </template>

        <!-- Columna Acciones -->
        <template #body-cell-acciones="props">
          <q-td :props="props" align="center">
            <div class="row items-center justify-center q-gutter-x-xs">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                color="info"
                @click="openViewDialog(props.row)"
              >
                <q-tooltip>Ver Detalle Informativo</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="edit"
                color="warning"
                @click="openEditDialog(props.row)"
              >
                <q-tooltip>Editar Capacitación</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- MODAL CREAR / EDITAR CAPACITACIÓN -->
    <q-dialog v-model="formDialog" persistent max-width="800px" style="width: 100%;">
      <q-card class="bg-dark text-white rounded-borders" style="width: 800px; max-width: 95vw;">
        <q-card-section class="row items-center justify-between bg-dark-page q-pa-md">
          <div class="text-h6 text-weight-bold row items-center">
            <q-icon name="school" color="primary" class="q-mr-sm" size="24px" />
            {{ isEditing ? 'Editar Capacitación Operadora' : 'Nueva Capacitación Operadora' }}
          </div>
          <q-btn flat round dense icon="close" color="grey-4" v-close-popup />
        </q-card-section>

        <q-separator dark />

        <q-card-section class="q-pa-md q-gutter-y-md">
          <!-- Datos básicos de la capacitación -->
          <div class="text-subtitle2 text-primary text-weight-bold">1. Información del Tema</div>
          <q-input
            v-model="form.titulo"
            label="Título / Tema de la Capacitación *"
            outlined
            dark
            dense
            color="primary"
            :rules="[val => !!val || 'El título es obligatorio']"
          />

          <q-input
            v-model="form.descripcion"
            label="Descripción o Enunciado Informativo"
            type="textarea"
            rows="3"
            outlined
            dark
            dense
            color="primary"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.fecha_realizacion"
                label="Fecha / Hora de Realización"
                type="datetime-local"
                outlined
                dark
                dense
                color="primary"
                stack-label
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.fecha_finalizacion"
                label="Fecha / Hora de Finalización"
                type="datetime-local"
                outlined
                dark
                dense
                color="primary"
                stack-label
              />
            </div>
          </div>

          <div class="row items-center justify-between">
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.estado"
                :options="estadoOptions"
                emit-value
                map-options
                label="Estado de la Capacitación"
                outlined
                dark
                dense
                color="primary"
              />
            </div>
          </div>

          <q-separator dark class="q-my-md" />

          <!-- Sección de Participantes -->
          <div class="text-subtitle2 text-primary text-weight-bold row items-center justify-between">
            <span>2. Participantes Impartidos (Información para Pasabordo)</span>
            <span class="text-caption text-grey-4">{{ form.participantes.length }} agregados</span>
          </div>

          <!-- Selector de Empresa + Búsqueda de Personal -->
          <div class="bg-dark-page q-pa-md rounded-borders border-glow">
            <div class="row q-col-gutter-sm items-center">
              <!-- Step 1: Seleccionar Empresa -->
              <div class="col-12 col-sm-5">
                <q-select
                  v-model="selectedEmpresaId"
                  :options="empresaSelectOptions"
                  emit-value
                  map-options
                  label="Empresa del Participante *"
                  outlined
                  dark
                  dense
                  color="primary"
                >
                  <template #after>
                    <q-btn flat round dense icon="add_business" color="primary" @click="openAddEmpresaDialog">
                      <q-tooltip>Crear Nueva Empresa</q-tooltip>
                    </q-btn>
                  </template>
                </q-select>
              </div>

              <!-- Step 2: Buscar Personal en la Empresa -->
              <div class="col-12 col-sm-7">
                <q-select
                  v-model="selectedPersonal"
                  :options="personalSearchOptions"
                  label="Buscar Cédula o Nombre en Empresa..."
                  outlined
                  dark
                  dense
                  color="primary"
                  use-input
                  hide-selected
                  fill-input
                  input-debounce="300"
                  :loading="searchingPersonal"
                  @filter="filterPersonal"
                  @update:model-value="addPersonalFromSearch"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-4 text-caption">
                        No se encontró en la DB.
                        <q-btn
                          flat
                          dense
                          size="sm"
                          color="primary"
                          label="+ Agregar Persona Manualmente"
                          class="q-mt-xs"
                          @click="openAddManualPersonDialog"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
            </div>

            <!-- Botón directo de adición manual -->
            <div class="row justify-end q-mt-xs">
              <q-btn
                flat
                dense
                size="xs"
                color="primary"
                icon="person_add"
                label="¿No existe en la DB? Agregar Cédula Manual"
                @click="openAddManualPersonDialog"
              />
            </div>
          </div>

          <!-- Tabla de Participantes Agregados -->
          <div v-if="form.participantes.length" class="q-mt-sm">
            <q-markup-table dark dense flat class="bg-dark-page rounded-borders">
              <thead>
                <tr>
                  <th class="text-left">Cédula</th>
                  <th class="text-left">Nombre</th>
                  <th class="text-left">Empresa</th>
                  <th class="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(part, idx) in form.participantes" :key="idx">
                  <td class="text-weight-bold text-primary">{{ part.cedula }}</td>
                  <td>{{ part.nombre || 'Personal' }}</td>
                  <td>
                    <q-chip color="secondary" text-color="primary" size="xs" class="text-weight-medium">
                      {{ getEmpresaNombre(part.empresa_id) }}
                    </q-chip>
                  </td>
                  <td class="text-center">
                    <q-btn
                      flat
                      round
                      dense
                      icon="remove_circle"
                      color="negative"
                      size="sm"
                      @click="removeParticipant(idx)"
                    />
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
          <div v-else class="text-caption text-grey-5 text-center q-pa-sm">
            Aún no se han agregado participantes a esta capacitación.
          </div>
        </q-card-section>

        <q-separator dark />

        <q-card-actions align="right" class="bg-dark-page q-pa-md">
          <q-btn flat label="Cancelar" color="grey-4" v-close-popup />
          <q-btn
            color="primary"
            text-color="dark"
            label="Guardar Capacitación"
            class="text-weight-bold q-px-lg"
            :loading="saving"
            @click="saveCapacitacion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- MODAL DETALLE INFORMATIVO (SOLO LECTURA) -->
    <q-dialog v-model="viewDialog" max-width="750px" style="width: 100%;">
      <q-card v-if="selectedCapacitacion" class="bg-dark text-white rounded-borders" style="width: 750px; max-width: 95vw;">
        <q-card-section class="row items-center justify-between bg-dark-page q-pa-md">
          <div class="text-h6 text-weight-bold row items-center">
            <q-icon name="school" color="primary" class="q-mr-sm" size="24px" />
            Detalle de Capacitación Operadora
          </div>
          <q-btn flat round dense icon="close" color="grey-4" v-close-popup />
        </q-card-section>

        <q-separator dark />

        <q-card-section class="q-pa-md">
          <div class="text-h5 text-weight-bolder text-white q-mb-xs">{{ selectedCapacitacion.titulo }}</div>
          <div class="text-body2 text-grey-3 q-mb-md">{{ selectedCapacitacion.descripcion || 'Sin descripción.' }}</div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-4">Fecha Realización</div>
              <div class="text-subtitle2 text-white text-weight-bold">{{ formatDate(selectedCapacitacion.fecha_realizacion) }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-4">Fecha Finalización</div>
              <div class="text-subtitle2 text-white text-weight-bold">{{ formatDate(selectedCapacitacion.fecha_finalizacion) }}</div>
            </div>
          </div>

          <div class="row items-center justify-between bg-dark-page q-pa-sm rounded-borders q-mb-md">
            <div class="text-caption text-grey-4">
              Impartido por: <span class="text-primary text-weight-bold">{{ selectedCapacitacion.creador_nombre || 'Sistema' }}</span>
            </div>
            <q-chip
              :color="selectedCapacitacion.estado === 3 ? 'positive' : selectedCapacitacion.estado === 2 ? 'primary' : 'warning'"
              text-color="dark"
              dense
              size="xs"
              class="text-weight-bold"
            >
              {{ selectedCapacitacion.estado === 3 ? '✓ FINALIZADA' : selectedCapacitacion.estado === 2 ? '▶ EN CURSO' : '⚡ PROGRAMADA' }}
            </q-chip>
          </div>

          <!-- Tabla de Participantes -->
          <div class="text-subtitle2 text-weight-bold text-white q-mb-xs row items-center justify-between">
            <span>Listado de Participantes Impartidos</span>
            <q-chip color="secondary" text-color="primary" dense size="xs" class="text-weight-bold">
              {{ (selectedCapacitacion.participantes || []).length }} Asistentes
            </q-chip>
          </div>

          <q-markup-table dark dense flat class="bg-dark-page rounded-borders">
            <thead>
              <tr>
                <th class="text-left">Cédula</th>
                <th class="text-left">Nombre Trabajador</th>
                <th class="text-left">Empresa</th>
                <th class="text-left">Cargo / Perfil</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="part in selectedCapacitacion.participantes" :key="part.id">
                <td class="text-weight-bold text-primary">{{ part.cedula }}</td>
                <td>{{ part.nombre }}</td>
                <td>
                  <q-chip color="secondary" text-color="primary" size="xs" class="text-weight-medium">
                    {{ part.empresa_nombre }}
                  </q-chip>
                </td>
                <td class="text-grey-4">{{ part.cargo || 'Personal' }}</td>
              </tr>
              <tr v-if="!selectedCapacitacion.participantes || !selectedCapacitacion.participantes.length">
                <td colspan="4" class="text-center text-grey-5 q-pa-md">No hay participantes registrados en esta capacitación</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>

        <q-separator dark />

        <q-card-actions align="right" class="bg-dark-page q-pa-md">
          <q-btn flat label="Cerrar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- MODAL CREAR NUEVA EMPRESA MANUAL -->
    <q-dialog v-model="addEmpresaDialog" persistent>
      <q-card class="bg-dark text-white rounded-borders" style="width: 450px;">
        <q-card-section class="row items-center justify-between bg-dark-page q-pa-md">
          <div class="text-subtitle1 text-weight-bold">Registrar Nueva Empresa</div>
          <q-btn flat round dense icon="close" color="grey-4" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-y-md">
          <q-input
            v-model="newEmpresa.razon_social"
            label="Razón Social de la Empresa *"
            outlined
            dark
            dense
            color="primary"
          />
          <q-input
            v-model="newEmpresa.nombre_qi"
            label="Nombre Comercial / Identificador"
            outlined
            dark
            dense
            color="primary"
          />
        </q-card-section>
        <q-card-actions align="right" class="bg-dark-page q-pa-md">
          <q-btn flat label="Cancelar" color="grey-4" v-close-popup />
          <q-btn
            color="primary"
            text-color="dark"
            label="Guardar Empresa"
            class="text-weight-bold"
            :loading="savingEmpresa"
            @click="saveNewEmpresa"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- MODAL INGRESAR PERSONA MANUALMENTE -->
    <q-dialog v-model="addManualPersonDialog" persistent>
      <q-card class="bg-dark text-white rounded-borders" style="width: 450px;">
        <q-card-section class="row items-center justify-between bg-dark-page q-pa-md">
          <div class="text-subtitle1 text-weight-bold">Adicionar Persona Manualmente</div>
          <q-btn flat round dense icon="close" color="grey-4" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-y-md">
          <div class="text-caption text-grey-4">
            Empresa seleccionada: <span class="text-primary text-weight-bold">{{ getEmpresaNombre(selectedEmpresaId) }}</span>
          </div>
          <q-input
            v-model="manualPerson.cedula"
            label="Número de Cédula / Documento *"
            outlined
            dark
            dense
            color="primary"
          />
          <q-input
            v-model="manualPerson.nombre"
            label="Nombre Completo del Trabajador *"
            outlined
            dark
            dense
            color="primary"
          />
        </q-card-section>
        <q-card-actions align="right" class="bg-dark-page q-pa-md">
          <q-btn flat label="Cancelar" color="grey-4" v-close-popup />
          <q-btn
            color="primary"
            text-color="dark"
            label="Agregar a la Lista"
            class="text-weight-bold"
            @click="confirmAddManualPerson"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'

const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const savingEmpresa = ref(false)
const searchingPersonal = ref(false)

const capacitaciones = ref([])
const empresas = ref([])
const filterText = ref('')
const filterEstado = ref(null)

const formDialog = ref(false)
const viewDialog = ref(false)
const addEmpresaDialog = ref(false)
const addManualPersonDialog = ref(false)
const isEditing = ref(false)

const selectedCapacitacion = ref(null)
const selectedEmpresaId = ref(null)
const selectedPersonal = ref(null)
const personalSearchOptions = ref([])

const form = ref({
  id: null,
  titulo: '',
  descripcion: '',
  fecha_realizacion: '',
  fecha_finalizacion: '',
  estado: 1,
  participantes: []
})

const newEmpresa = ref({
  razon_social: '',
  nombre_qi: ''
})

const manualPerson = ref({
  cedula: '',
  nombre: ''
})

const columns = [
  { name: 'titulo', label: 'Tema / Título Capacitación', field: 'titulo', align: 'left', sortable: true },
  { name: 'fechas', label: 'Fechas Programadas', field: 'fecha_realizacion', align: 'left', sortable: true },
  { name: 'creador', label: 'Impartido Por', field: 'creador_nombre', align: 'center', sortable: true },
  { name: 'participantes', label: 'Participantes', field: 'total_participantes', align: 'center', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center', sortable: true },
  { name: 'acciones', label: 'Acciones', align: 'center' }
]

const estadoFilterOptions = [
  { label: 'Todos los estados', value: null },
  { label: '⚡ Programadas', value: 1 },
  { label: '▶ En Curso', value: 2 },
  { label: '✓ Finalizadas', value: 3 }
]

const estadoOptions = [
  { label: '⚡ Programada', value: 1 },
  { label: '▶ En Curso', value: 2 },
  { label: '✓ Finalizada', value: 3 }
]

const countProgramadas = computed(() => capacitaciones.value.filter(c => c.estado === 1 || c.estado === 2).length)
const countFinalizadas = computed(() => capacitaciones.value.filter(c => c.estado === 3).length)

const empresaSelectOptions = computed(() => {
  return empresas.value.map(e => ({
    label: `🏢 ${e.razon_social} (${e.nombre_qi || 'QI'})`,
    value: e.id_empresa
  }))
})

const filteredCapacitaciones = computed(() => {
  return capacitaciones.value.filter(c => {
    const matchesText = !filterText.value || c.titulo.toLowerCase().includes(filterText.value.toLowerCase())
    const matchesEstado = filterEstado.value === null || c.estado === filterEstado.value
    return matchesText && matchesEstado
  })
})

async function fetchCapacitaciones() {
  loading.value = true
  try {
    const res = await apiFetch('/capacitaciones-operadora')
    if (res && res.ok) {
      capacitaciones.value = await res.json()
    }
  } catch (err) {
    console.error('Error cargando capacitaciones operadora:', err)
  } finally {
    loading.value = false
  }
}

async function fetchEmpresas() {
  try {
    const res = await apiFetch('/capacitaciones-operadora/empresas')
    if (res && res.ok) {
      empresas.value = await res.json()
      if (empresas.value.length && !selectedEmpresaId.value) {
        selectedEmpresaId.value = empresas.value[0].id_empresa
      }
    }
  } catch (err) {
    console.error('Error cargando empresas:', err)
  }
}

function getEmpresaNombre(empresaId) {
  const emp = empresas.value.find(e => e.id_empresa === empresaId)
  return emp ? emp.razon_social : 'Empresa General'
}

async function filterPersonal(val, update) {
  if (!selectedEmpresaId.value) {
    $q.notify({ type: 'warning', message: 'Primero debe seleccionar una empresa' })
    update(() => { personalSearchOptions.value = [] })
    return
  }
  if (!val || val.trim().length < 2) {
    update(() => { personalSearchOptions.value = [] })
    return
  }

  searchingPersonal.value = true
  try {
    const res = await apiFetch(`/capacitaciones-operadora/buscar-personal?empresa_id=${selectedEmpresaId.value}&query=${encodeURIComponent(val)}`)
    if (res && res.ok) {
      const data = await res.json()
      update(() => {
        personalSearchOptions.value = data.map(p => ({
          label: `${p.cedula} - ${p.nombre} (${p.cargo || 'Personal'})`,
          value: p
        }))
      })
    }
  } catch (e) {
    console.error('Error buscando personal:', e)
  } finally {
    searchingPersonal.value = false
  }
}

function addPersonalFromSearch(option) {
  if (!option || !option.value) return
  const p = option.value

  const exists = form.value.participantes.some(item => item.cedula === p.cedula && item.empresa_id === selectedEmpresaId.value)
  if (exists) {
    $q.notify({ type: 'warning', message: 'Este participante ya se encuentra agregado a la lista' })
    selectedPersonal.value = null
    return
  }

  form.value.participantes.push({
    cedula: p.cedula,
    nombre: p.nombre,
    empresa_id: selectedEmpresaId.value
  })

  selectedPersonal.value = null
  $q.notify({ type: 'positive', message: 'Participante agregado', timeout: 1000 })
}

function openAddManualPersonDialog() {
  if (!selectedEmpresaId.value) {
    $q.notify({ type: 'warning', message: 'Primero debe seleccionar una empresa' })
    return
  }
  manualPerson.value = { cedula: '', nombre: '' }
  addManualPersonDialog.value = true
}

function confirmAddManualPerson() {
  if (!manualPerson.value.cedula.trim()) {
    $q.notify({ type: 'negative', message: 'Ingresa la cédula del trabajador' })
    return
  }

  const exists = form.value.participantes.some(item => item.cedula === manualPerson.value.cedula.trim() && item.empresa_id === selectedEmpresaId.value)
  if (exists) {
    $q.notify({ type: 'warning', message: 'La cédula ya se encuentra en la lista para esta empresa' })
    return
  }

  form.value.participantes.push({
    cedula: manualPerson.value.cedula.trim(),
    nombre: manualPerson.value.nombre ? manualPerson.value.nombre.trim() : 'Personal',
    empresa_id: selectedEmpresaId.value
  })

  addManualPersonDialog.value = false
  $q.notify({ type: 'positive', message: 'Participante agregado manualmente' })
}

function removeParticipant(idx) {
  form.value.participantes.splice(idx, 1)
}

function openAddEmpresaDialog() {
  newEmpresa.value = { razon_social: '', nombre_qi: '' }
  addEmpresaDialog.value = true
}

async function saveNewEmpresa() {
  if (!newEmpresa.value.razon_social.trim()) {
    $q.notify({ type: 'negative', message: 'Ingresa la razón social de la empresa' })
    return
  }

  savingEmpresa.value = true
  try {
    const res = await apiFetch('/capacitaciones-operadora/empresas', {
      method: 'POST',
      body: JSON.stringify(newEmpresa.value)
    })
    if (res && res.ok) {
      const created = await res.json()
      empresas.value.push(created)
      selectedEmpresaId.value = created.id_empresa
      addEmpresaDialog.value = false
      $q.notify({ type: 'positive', message: 'Empresa creada y seleccionada con éxito' })
    }
  } catch (err) {
    console.error('Error creando empresa:', err)
  } finally {
    savingEmpresa.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  form.value = {
    id: null,
    titulo: '',
    descripcion: '',
    fecha_realizacion: '',
    fecha_finalizacion: '',
    estado: 1,
    participantes: []
  }
  formDialog.value = true
}

async function openEditDialog(row) {
  isEditing.value = true
  try {
    const res = await apiFetch(`/capacitaciones-operadora/${row.id}`)
    if (res && res.ok) {
      const detail = await res.json()
      form.value = {
        id: detail.id,
        titulo: detail.titulo,
        descripcion: detail.descripcion || '',
        fecha_realizacion: detail.fecha_realizacion ? detail.fecha_realizacion.slice(0, 16) : '',
        fecha_finalizacion: detail.fecha_finalizacion ? detail.fecha_finalizacion.slice(0, 16) : '',
        estado: detail.estado,
        participantes: (detail.participantes || []).map(p => ({
          cedula: p.cedula,
          nombre: p.nombre,
          empresa_id: p.empresa_id
        }))
      }
      formDialog.value = true
    }
  } catch (err) {
    console.error('Error al cargar detalle para edición:', err)
  }
}

async function openViewDialog(row) {
  try {
    const res = await apiFetch(`/capacitaciones-operadora/${row.id}`)
    if (res && res.ok) {
      selectedCapacitacion.value = await res.json()
      viewDialog.value = true
    }
  } catch (err) {
    console.error('Error consultando detalle:', err)
  }
}

async function saveCapacitacion() {
  if (!form.value.titulo.trim()) {
    $q.notify({ type: 'negative', message: 'El título de la capacitación es obligatorio' })
    return
  }

  saving.value = true
  try {
    const url = isEditing.value ? `/capacitaciones-operadora/${form.value.id}` : '/capacitaciones-operadora'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(form.value)
    })

    if (res && res.ok) {
      $q.notify({ type: 'positive', message: `Capacitación ${isEditing.value ? 'actualizada' : 'creada'} correctamente` })
      formDialog.value = false
      fetchCapacitaciones()
    }
  } catch (err) {
    console.error('Error guardando capacitación:', err)
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Eliminar Capacitación',
    message: `¿Estás seguro de inhabilitar la capacitación "${row.titulo}"?`,
    cancel: true,
    persistent: true,
    dark: true
  }).onOk(async () => {
    try {
      const res = await apiFetch(`/capacitaciones-operadora/${row.id}`, { method: 'DELETE' })
      if (res && res.ok) {
        $q.notify({ type: 'positive', message: 'Capacitación eliminada' })
        fetchCapacitaciones()
      }
    } catch (e) {
      console.error('Error eliminando capacitación:', e)
    }
  })
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return dateStr
  }
}

onMounted(() => {
  fetchCapacitaciones()
  fetchEmpresas()
})
</script>

<style scoped>
.border-glow {
  border: 1px solid rgba(0, 210, 106, 0.3);
  box-shadow: 0 0 12px rgba(0, 210, 106, 0.1);
}

.rounded-borders {
  border-radius: 8px;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
