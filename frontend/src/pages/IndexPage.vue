<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header Dashboard -->
    <div class="row items-center justify-between q-mb-lg flex-wrap gap-md">
      <div>
        <div class="row items-center q-gutter-x-sm">
          <q-avatar icon="dashboard" color="primary" text-color="dark" size="38px" />
          <div>
            <div class="text-h5 text-weight-bolder text-white">Dashboard Ejecutivo de Consumo de Planes QI</div>
            <div class="text-caption text-grey-4">Monitoreo en tiempo real de consumo por empresa vs límites de Plan (ISO 27001 / BASC)</div>
          </div>
        </div>
      </div>

      <!-- Filtro por Empresa y Botón Recargar -->
      <div class="row items-center q-gutter-x-sm">
        <q-select
          v-model="selectedEmpresaId"
          :options="empresaOptions"
          emit-value
          map-options
          outlined
          dark
          dense
          color="primary"
          style="min-width: 280px;"
          bg-color="dark"
        >
          <template #prepend>
            <q-icon name="business" color="primary" />
          </template>
        </q-select>

        <q-btn
          flat
          round
          dense
          icon="refresh"
          color="primary"
          :loading="loading"
          @click="fetchDashboardMetrics"
        >
          <q-tooltip>Actualizar Métricas</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Spinner de Carga -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="50px" />
      <div class="text-grey-4 q-mt-md text-subtitle1">Consultando bases de datos de empresas en tiempo real...</div>
    </div>

    <div v-else class="q-gutter-y-lg">
      <!-- TARJETAS DE CONSOLIDADO GLOBAL (KPIs) -->
      <div class="row q-col-gutter-md">
        <!-- KPI 1: Empresas Activas -->
        <div class="col-12 col-sm-6 col-md-3">
          <div class="qi-card q-pa-md row items-center justify-between">
            <div>
              <div class="text-caption text-grey-4 text-weight-bold">EMPRESAS ACTIVAS</div>
              <div class="text-h4 text-weight-bolder text-white q-my-xs">
                {{ filteredConsolidado.empresas_activas }}
                <span class="text-caption text-grey-5">/ {{ filteredConsolidado.empresas_totales }}</span>
              </div>
              <div class="text-caption text-positive text-weight-medium">Con bases de datos conectadas</div>
            </div>
            <q-avatar icon="store" color="secondary" text-color="primary" size="46px" class="border-glow" />
          </div>
        </div>

        <!-- KPI 2: Vehículos vs Plan -->
        <div class="col-12 col-sm-6 col-md-3">
          <div class="qi-card q-pa-md row items-center justify-between">
            <div>
              <div class="text-caption text-grey-4 text-weight-bold">VEHÍCULOS (REAL / PLAN)</div>
              <div class="text-h4 text-weight-bolder text-white q-my-xs">
                {{ filteredConsolidado.flota.real_vehiculos }}
                <span class="text-caption text-grey-5">/ {{ filteredConsolidado.flota.plan_vehiculos }}</span>
              </div>
              <div class="text-caption text-grey-4">
                + {{ filteredConsolidado.flota.real_remolques }} Remolques (Total: {{ filteredConsolidado.flota.real_total }})
              </div>
            </div>
            <q-avatar icon="directions_car" color="secondary" text-color="primary" size="46px" class="border-glow" />
          </div>
        </div>

        <!-- KPI 3: Inspecciones del Mes -->
        <div class="col-12 col-sm-6 col-md-3">
          <div class="qi-card q-pa-md row items-center justify-between">
            <div>
              <div class="text-caption text-grey-4 text-weight-bold">INSPECCIONES ESTE MES</div>
              <div class="text-h4 text-weight-bolder text-white q-my-xs">
                {{ filteredConsolidado.inspecciones.real_inspecciones }}
                <span class="text-caption text-grey-5">/ {{ filteredConsolidado.inspecciones.plan_inspecciones }}</span>
              </div>
              <div class="text-caption text-positive text-weight-medium">
                {{ filteredConsolidado.inspecciones.porc_cumplimiento }}% del límite global
              </div>
            </div>
            <q-avatar icon="fact_check" color="secondary" text-color="primary" size="46px" class="border-glow" />
          </div>
        </div>

        <!-- KPI 4: Capacitaciones del Mes -->
        <div class="col-12 col-sm-6 col-md-3">
          <div class="qi-card q-pa-md row items-center justify-between">
            <div>
              <div class="text-caption text-grey-4 text-weight-bold">CAPACITACIONES ESTE MES</div>
              <div class="text-h4 text-weight-bolder text-white q-my-xs">
                {{ filteredConsolidado.capacitaciones.real_capacitaciones }}
                <span class="text-caption text-grey-5">/ {{ filteredConsolidado.capacitaciones.plan_capacitaciones }}</span>
              </div>
              <div class="text-caption text-positive text-weight-medium">
                {{ filteredConsolidado.capacitaciones.porc_cumplimiento }}% del límite global
              </div>
            </div>
            <q-avatar icon="school" color="secondary" text-color="primary" size="46px" class="border-glow" />
          </div>
        </div>
      </div>

      <!-- DESGLOSE COMPARATIVO POR EMPRESA (CARDS DETALLADAS) -->
      <div class="text-h6 text-weight-bold text-white q-mt-lg row items-center justify-between">
        <span>Comparativa de Consumo por Empresa</span>
        <q-chip outline color="primary" text-color="white" dense class="text-caption">
          Mes Actual: {{ currentMonthName }} {{ currentYear }}
        </q-chip>
      </div>

      <div class="row q-col-gutter-md">
        <div
          v-for="emp in displayedEmpresas"
          :key="emp.id_empresa"
          class="col-12 col-md-6 col-lg-6"
        >
          <div
            class="qi-card q-pa-lg"
            :style="{
              borderLeft: emp.estado_empresa === 0 || emp.cumplimiento.estado_consumo === 'INACTIVA'
                ? '6px solid #8c8c8c'
                : emp.cumplimiento.estado_consumo === 'EXCEDIDO'
                ? '6px solid #ff4d4f'
                : emp.cumplimiento.estado_consumo === 'ADVERTENCIA'
                ? '6px solid #faad14'
                : '6px solid #00D26A',
              opacity: emp.estado_empresa === 0 ? '0.85' : '1'
            }"
          >
            <!-- Card Header: Nombre, Logo y Plan -->
            <div class="row items-center justify-between q-mb-md">
              <div class="row items-center no-wrap">
                <q-avatar size="44px" color="secondary" class="q-mr-md border-glow overflow-hidden">
                  <q-img
                    v-if="emp.ruta_logo && !emp.hasImageError"
                    :src="emp.ruta_logo"
                    style="width: 100%; height: 100%;"
                    fit="contain"
                    no-spinner
                    @error="handleImageError(emp)"
                  >
                    <template #error>
                      <div class="fit row items-center justify-center bg-secondary">
                        <q-icon name="business" color="primary" size="24px" />
                      </div>
                    </template>
                  </q-img>
                  <q-icon v-else name="business" color="primary" size="24px" />
                </q-avatar>
                <div>
                  <div class="text-subtitle1 text-weight-bold text-white leading-tight">
                    {{ emp.razon_social }}
                    <q-badge v-if="emp.estado_empresa === 0" color="grey-7" text-color="black" label="INACTIVA" class="q-ml-xs text-weight-bold" />
                  </div>
                  <div class="text-caption text-grey-4">
                    <span class="text-primary text-weight-medium">{{ emp.nombre_qi }}</span> | DB: {{ emp.base_datos }}
                  </div>
                </div>
              </div>

              <!-- Badge Estado de Consumo -->
              <div>
                <q-chip
                  v-if="emp.estado_empresa === 0 || emp.cumplimiento.estado_consumo === 'INACTIVA'"
                  color="grey-8"
                  text-color="white"
                  dense
                  class="text-weight-bold q-px-sm"
                >
                  🚫 INACTIVA
                </q-chip>
                <q-chip
                  v-else-if="emp.cumplimiento.estado_consumo === 'EXCEDIDO'"
                  color="negative"
                  text-color="white"
                  dense
                  class="text-weight-bold q-px-sm"
                >
                  ⚠️ EXCEDIDO
                </q-chip>
                <q-chip
                  v-else-if="emp.cumplimiento.estado_consumo === 'ADVERTENCIA'"
                  color="warning"
                  text-color="dark"
                  dense
                  class="text-weight-bold q-px-sm"
                >
                  ⚡ LÍMITE PRÓXIMO
                </q-chip>
                <q-chip
                  v-else
                  color="positive"
                  text-color="dark"
                  dense
                  class="text-weight-bold q-px-sm"
                >
                  ✓ NORMAL
                </q-chip>
              </div>
            </div>

            <q-separator dark class="q-mb-md" style="opacity: 0.1;" />

            <!-- Info del Plan Contratado -->
            <div class="row items-center justify-between bg-dark q-pa-sm rounded-borders q-mb-md">
              <div class="row items-center">
                <q-icon name="card_membership" color="primary" size="20px" class="q-mr-xs" />
                <span class="text-weight-bold text-white text-caption">Plan: {{ emp.plan.nombre }}</span>
              </div>
              <div class="text-caption text-grey-4">
                Valor: <span class="text-primary text-weight-bold">${{ Number(emp.plan.precio).toLocaleString() }} COP</span>
              </div>
            </div>

            <!-- Métricas de Consumo Real vs Plan (4 Medidores) -->
            <div class="column q-gutter-y-md">
              <!-- 1. Vehículos Activos -->
              <div>
                <div class="row items-center justify-between text-caption q-mb-xs">
                  <span class="text-grey-3 row items-center">
                    <q-icon name="directions_car" color="primary" class="q-mr-xs" size="16px" />
                    Vehículos Activos:
                  </span>
                  <span class="text-weight-bold" :class="emp.real.vehiculos_activos > emp.plan.vh_hasta ? 'text-negative' : 'text-white'">
                    {{ emp.real.vehiculos_activos }} / {{ emp.plan.vh_hasta }} Max
                    ({{ emp.cumplimiento.porc_vehiculos }}%)
                  </span>
                </div>
                <q-linear-progress
                  :value="Math.min(emp.cumplimiento.porc_vehiculos / 100, 1)"
                  :color="emp.cumplimiento.porc_vehiculos > 100 ? 'negative' : emp.cumplimiento.porc_vehiculos >= 85 ? 'warning' : 'primary'"
                  track-color="secondary"
                  size="8px"
                  class="rounded-borders"
                />
              </div>

              <!-- 2. Remolques Activos -->
              <div class="row items-center justify-between text-caption bg-dark q-px-sm q-py-xs rounded-borders">
                <span class="text-grey-4 row items-center">
                  <q-icon name="rv_hookup" color="primary" class="q-mr-xs" size="16px" />
                  Remolques Registrados en Flota:
                </span>
                <span class="text-weight-bold text-white">{{ emp.real.remolques_activos }} Remolques</span>
              </div>

              <!-- 3. Inspecciones Preoperacionales en el Mes -->
              <div>
                <div class="row items-center justify-between text-caption q-mb-xs">
                  <span class="text-grey-3 row items-center">
                    <q-icon name="fact_check" color="primary" class="q-mr-xs" size="16px" />
                    Inspecciones este Mes:
                  </span>
                  <span class="text-weight-bold" :class="emp.real.inspecciones_mes > emp.plan.max_inspecciones ? 'text-negative' : 'text-white'">
                    {{ emp.real.inspecciones_mes }} / {{ emp.plan.max_inspecciones }} Max
                    ({{ emp.cumplimiento.porc_inspecciones }}%)
                  </span>
                </div>
                <q-linear-progress
                  :value="Math.min(emp.cumplimiento.porc_inspecciones / 100, 1)"
                  :color="emp.cumplimiento.porc_inspecciones > 100 ? 'negative' : emp.cumplimiento.porc_inspecciones >= 85 ? 'warning' : 'primary'"
                  track-color="secondary"
                  size="8px"
                  class="rounded-borders"
                />
              </div>

              <!-- 4. Capacitaciones en el Mes -->
              <div>
                <div class="row items-center justify-between text-caption q-mb-xs">
                  <span class="text-grey-3 row items-center">
                    <q-icon name="school" color="primary" class="q-mr-xs" size="16px" />
                    Capacitaciones este Mes:
                  </span>
                  <span class="text-weight-bold" :class="emp.real.capacitaciones_mes > emp.plan.max_capacitaciones ? 'text-negative' : 'text-white'">
                    {{ emp.real.capacitaciones_mes }} / {{ emp.plan.max_capacitaciones }} Max
                    ({{ emp.cumplimiento.porc_capacitaciones }}%)
                  </span>
                </div>
                <q-linear-progress
                  :value="Math.min(emp.cumplimiento.porc_capacitaciones / 100, 1)"
                  :color="emp.cumplimiento.porc_capacitaciones > 100 ? 'negative' : emp.cumplimiento.porc_capacitaciones >= 85 ? 'warning' : 'primary'"
                  track-color="secondary"
                  size="8px"
                  class="rounded-borders"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLA DETALLADA MATRIZ DE CUMPLIMIENTO -->
      <div class="text-h6 text-weight-bold text-white q-mt-lg">Matriz Consolidada de Consumo de Planes</div>
      <q-card class="qi-card">
        <q-table
          :rows="empresasMetrics"
          :columns="columns"
          row-key="id_empresa"
          dark
          flat
          dense
          no-data-label="No hay métricas registradas"
        >
          <template #body-cell-empresa="props">
            <q-td :props="props">
              <div class="row items-center no-wrap">
                <q-avatar size="30px" color="secondary" class="q-mr-sm border-glow overflow-hidden">
                  <q-img
                    v-if="props.row.ruta_logo && !props.row.hasImageError"
                    :src="props.row.ruta_logo"
                    style="width: 100%; height: 100%;"
                    fit="contain"
                    no-spinner
                    @error="handleImageError(props.row)"
                  >
                    <template #error>
                      <div class="fit row items-center justify-center bg-secondary">
                        <q-icon name="business" color="primary" size="16px" />
                      </div>
                    </template>
                  </q-img>
                  <q-icon v-else name="business" color="primary" size="16px" />
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-white">{{ props.row.razon_social }}</div>
                  <div class="text-caption text-grey-5">{{ props.row.nombre_qi }}</div>
                </div>
              </div>
            </q-td>
          </template>

          <template #body-cell-plan="props">
            <q-td :props="props">
              <q-chip color="secondary" text-color="primary" size="sm" class="text-weight-bold">
                {{ props.row.plan.nombre }}
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-vehiculos="props">
            <q-td :props="props" align="center">
              <span class="text-weight-bold" :class="props.row.real.vehiculos_activos > props.row.plan.vh_hasta ? 'text-negative' : 'text-white'">
                {{ props.row.real.vehiculos_activos }} / {{ props.row.plan.vh_hasta }}
              </span>
              <div class="text-caption text-grey-5">({{ props.row.cumplimiento.porc_vehiculos }}%)</div>
            </q-td>
          </template>

          <template #body-cell-remolques="props">
            <q-td :props="props" align="center">
              <span class="text-weight-bold text-white">{{ props.row.real.remolques_activos }}</span>
            </q-td>
          </template>

          <template #body-cell-inspecciones="props">
            <q-td :props="props" align="center">
              <span class="text-weight-bold" :class="props.row.real.inspecciones_mes > props.row.plan.max_inspecciones ? 'text-negative' : 'text-white'">
                {{ props.row.real.inspecciones_mes }} / {{ props.row.plan.max_inspecciones }}
              </span>
              <div class="text-caption text-grey-5">({{ props.row.cumplimiento.porc_inspecciones }}%)</div>
            </q-td>
          </template>

          <template #body-cell-capacitaciones="props">
            <q-td :props="props" align="center">
              <span class="text-weight-bold" :class="props.row.real.capacitaciones_mes > props.row.plan.max_capacitaciones ? 'text-negative' : 'text-white'">
                {{ props.row.real.capacitaciones_mes }} / {{ props.row.plan.max_capacitaciones }}
              </span>
              <div class="text-caption text-grey-5">({{ props.row.cumplimiento.porc_capacitaciones }}%)</div>
            </q-td>
          </template>

          <template #body-cell-estado="props">
            <q-td :props="props" align="center">
              <q-chip
                v-if="props.row.estado_empresa === 0 || props.row.cumplimiento.estado_consumo === 'INACTIVA'"
                color="grey-8"
                text-color="white"
                size="xs"
                class="text-weight-bold"
              >
                INACTIVA 🚫
              </q-chip>
              <q-chip
                v-else-if="props.row.cumplimiento.estado_consumo === 'EXCEDIDO'"
                color="negative"
                text-color="white"
                size="xs"
                class="text-weight-bold"
              >
                EXCEDIDO ⚠️
              </q-chip>
              <q-chip
                v-else-if="props.row.cumplimiento.estado_consumo === 'ADVERTENCIA'"
                color="warning"
                text-color="dark"
                size="xs"
                class="text-weight-bold"
              >
                ADVERTENCIA ⚡
              </q-chip>
              <q-chip
                v-else
                color="positive"
                text-color="dark"
                size="xs"
                class="text-weight-bold"
              >
                NORMAL ✓
              </q-chip>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api'

const $q = useQuasar()

const loading = ref(true)
const selectedEmpresaId = ref(null)
const consolidado = ref({
  empresas_totales: 0,
  empresas_activas: 0,
  flota: { plan_vehiculos: 0, real_vehiculos: 0, real_remolques: 0, real_total: 0, porc_cumplimiento: 0 },
  inspecciones: { plan_inspecciones: 0, real_inspecciones: 0, porc_cumplimiento: 0 },
  capacitaciones: { plan_capacitaciones: 0, real_capacitaciones: 0, porc_cumplimiento: 0 }
})
const empresasMetrics = ref([])

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const now = new Date()
const currentMonthName = monthNames[now.getMonth()]
const currentYear = now.getFullYear()

const columns = [
  { name: 'empresa', label: 'Empresa / Subdominio', field: 'razon_social', align: 'left', sortable: true },
  { name: 'plan', label: 'Plan Contratado', field: row => row.plan.nombre, align: 'center', sortable: true },
  { name: 'vehiculos', label: 'Vehículos (Real / Plan)', field: row => row.real.vehiculos_activos, align: 'center', sortable: true },
  { name: 'remolques', label: 'Remolques', field: row => row.real.remolques_activos, align: 'center', sortable: true },
  { name: 'inspecciones', label: 'Inspecciones Mes (Real / Plan)', field: row => row.real.inspecciones_mes, align: 'center', sortable: true },
  { name: 'capacitaciones', label: 'Capacitaciones Mes (Real / Plan)', field: row => row.real.capacitaciones_mes, align: 'center', sortable: true },
  { name: 'estado', label: 'Estado Consumo', field: row => row.cumplimiento.estado_consumo, align: 'center', sortable: true }
]

const empresaOptions = computed(() => {
  const options = [
    { label: '🏢 Todas las Empresas', value: null },
    { label: '✅ Solo Empresas Activas', value: 'ACTIVAS' },
    { label: '🚫 Solo Empresas Inactivas', value: 'INACTIVAS' }
  ]
  empresasMetrics.value.forEach(emp => {
    const icon = emp.estado_empresa === 1 ? '🟢' : '🔴'
    options.push({
      label: `${icon} ${emp.razon_social} (${emp.nombre_qi})`,
      value: emp.id_empresa
    })
  })
  return options
})

const displayedEmpresas = computed(() => {
  if (!selectedEmpresaId.value) {
    return empresasMetrics.value
  }
  if (selectedEmpresaId.value === 'ACTIVAS') {
    return empresasMetrics.value.filter(e => e.estado_empresa === 1)
  }
  if (selectedEmpresaId.value === 'INACTIVAS') {
    return empresasMetrics.value.filter(e => e.estado_empresa === 0)
  }
  return empresasMetrics.value.filter(e => e.id_empresa === selectedEmpresaId.value)
})

const filteredConsolidado = computed(() => {
  if (!selectedEmpresaId.value) {
    return consolidado.value
  }
  const emps = displayedEmpresas.value
  if (!emps || emps.length === 0) return consolidado.value

  if (typeof selectedEmpresaId.value === 'number') {
    const emp = emps[0]
    if (!emp) return consolidado.value
    return {
      empresas_totales: 1,
      empresas_activas: emp.estado_empresa === 1 ? 1 : 0,
      flota: {
        plan_vehiculos: emp.plan.vh_hasta || 0,
        real_vehiculos: emp.real.vehiculos_activos,
        real_remolques: emp.real.remolques_activos,
        real_total: emp.real.flota_total,
        porc_cumplimiento: emp.cumplimiento.porc_vehiculos
      },
      inspecciones: {
        plan_inspecciones: emp.plan.max_inspecciones || 0,
        real_inspecciones: emp.real.inspecciones_mes,
        porc_cumplimiento: emp.cumplimiento.porc_inspecciones
      },
      capacitaciones: {
        plan_capacitaciones: emp.plan.max_capacitaciones || 0,
        real_capacitaciones: emp.real.capacitaciones_mes,
        porc_cumplimiento: emp.cumplimiento.porc_capacitaciones
      }
    }
  }

  // Agregado por grupo filtrado ('ACTIVAS' / 'INACTIVAS')
  let vhPlan = 0, vhReal = 0, remReal = 0, inspPlan = 0, inspReal = 0, capPlan = 0, capReal = 0
  emps.forEach(e => {
    vhPlan += e.plan.vh_hasta || 0
    vhReal += e.real.vehiculos_activos
    remReal += e.real.remolques_activos
    inspPlan += e.plan.max_inspecciones || 0
    inspReal += e.real.inspecciones_mes
    capPlan += e.plan.max_capacitaciones || 0
    capReal += e.real.capacitaciones_mes
  })

  return {
    empresas_totales: emps.length,
    empresas_activas: emps.filter(e => e.estado_empresa === 1).length,
    flota: {
      plan_vehiculos: vhPlan,
      real_vehiculos: vhReal,
      real_remolques: remReal,
      real_total: vhReal + remReal,
      porc_cumplimiento: vhPlan > 0 ? Math.round((vhReal / vhPlan) * 100) : 0
    },
    inspecciones: {
      plan_inspecciones: inspPlan,
      real_inspecciones: inspReal,
      porc_cumplimiento: inspPlan > 0 ? Math.round((inspReal / inspPlan) * 100) : 0
    },
    capacitaciones: {
      plan_capacitaciones: capPlan,
      real_capacitaciones: capReal,
      porc_cumplimiento: capPlan > 0 ? Math.round((capReal / capPlan) * 100) : 0
    }
  }
})

async function fetchDashboardMetrics() {
  loading.value = true
  try {
    const res = await apiFetch('/dashboard/metrics')
    if (res && res.ok) {
      const data = await res.json()
      consolidado.value = data.consolidado
      empresasMetrics.value = data.empresas
    }
  } catch (err) {
    console.error('Error cargando métricas del dashboard:', err)
    $q.notify({
      type: 'negative',
      message: 'No fue posible cargar las métricas del dashboard',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

function handleImageError(emp) {
  if (emp) {
    emp.hasImageError = true
  }
}

onMounted(() => {
  fetchDashboardMetrics()
})
</script>

<style scoped>
.border-glow {
  border: 1px solid rgba(0, 210, 106, 0.4);
  box-shadow: 0 0 15px rgba(0, 210, 106, 0.15);
}

.leading-tight {
  line-height: 1.2;
}

.rounded-borders {
  border-radius: 8px;
}
</style>
