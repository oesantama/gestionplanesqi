<template>
  <q-page class="q-pa-lg bg-dark-page text-white">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bolder text-white">Catálogo de Planes QI</div>
        <div class="text-caption text-grey-4">Tarifas, Rangos de Vehículos y Capacitaciones Incluidas</div>
      </div>
      <q-btn
        color="primary"
        text-color="dark"
        icon="add"
        label="Nuevo Plan"
        no-caps
        unelevated
        class="text-weight-bold"
        style="border-radius: 8px;"
        @click="openCreateDialog"
      />
    </div>

    <!-- Grid de Tarjetas de Planes -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="plan in planes" :key="plan.Id_plan" class="col-12 col-sm-6 col-md-4">
        <q-card class="qi-card full-height column justify-between relative-position overflow-hidden" style="border: 1px solid rgba(0, 210, 106, 0.2);">
          <div class="q-pa-md">
            <div class="row items-center justify-between q-mb-sm">
              <span class="text-h6 text-weight-bold text-white">{{ plan.Descripcion }}</span>
              <q-chip :color="plan.Estado === 1 ? 'positive' : 'grey-8'" text-color="white" size="xs" class="text-weight-bold">
                {{ plan.Estado === 1 ? 'ACTIVO' : 'INACTIVO' }}
              </q-chip>
            </div>

            <div class="text-h4 text-weight-bolder text-primary q-my-sm">
              ${{ Number(plan.Precio).toLocaleString() }}
              <span class="text-caption text-grey-4 text-weight-normal">/ mes</span>
            </div>

            <q-separator dark class="q-my-md" />

            <div class="column q-gutter-y-xs text-caption text-grey-3">
              <div class="row items-center">
                <q-icon name="directions_car" color="primary" class="q-mr-xs" size="18px" />
                <strong>Rango Vehículos:</strong> &nbsp; {{ plan.Vh_desde }} - {{ plan.Vh_hasta }}
              </div>
              <div class="row items-center">
                <q-icon name="fact_check" color="primary" class="q-mr-xs" size="18px" />
                <strong>Max Inspecciones:</strong> &nbsp; {{ Number(plan.Max_inspecciones).toLocaleString() }}
              </div>
              <div class="row items-center">
                <q-icon name="school" color="primary" class="q-mr-xs" size="18px" />
                <strong>Max Capacitaciones:</strong> &nbsp; {{ plan.Max_capacitaciones }}
              </div>
            </div>
          </div>

          <div class="q-pa-sm bg-dark row items-center justify-end q-gutter-x-xs" style="border-top: 1px solid rgba(255,255,255,0.05);">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(plan)">
              <q-tooltip>Editar Plan</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              :icon="plan.Estado === 1 ? 'toggle_on' : 'toggle_off'"
              :color="plan.Estado === 1 ? 'positive' : 'grey-5'"
              @click="toggleEstado(plan)"
            >
              <q-tooltip>{{ plan.Estado === 1 ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Modal Formulario -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="bg-dark text-white q-pa-md border-glow" style="width: 500px; max-width: 90vw; border-radius: 12px;">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bold">
            {{ isEditing ? 'Editar Plan QI' : 'Nuevo Plan QI' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <q-input v-model="form.Descripcion" label="Nombre/Descripción del Plan *" outlined dark dense color="primary" />
          
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="form.Vh_desde" label="Vehículos Desde *" type="number" outlined dark dense color="primary" disable readonly />
            </div>
            <div class="col-6">
              <q-input v-model.number="form.Vh_hasta" label="Vehículos Hasta (Máximo) *" type="number" outlined dark dense color="primary" />
            </div>
          </div>

          <q-input v-model.number="form.Precio" label="Precio Mensual ($) *" type="number" outlined dark dense color="primary" />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="form.Max_inspecciones" label="Max Inspecciones *" type="number" outlined dark dense color="primary" />
            </div>
            <div class="col-6">
              <q-input v-model.number="form.Max_capacitaciones" label="Max Capacitaciones *" type="number" outlined dark dense color="primary" />
            </div>
          </div>

          <q-toggle v-model="form.estadoBool" label="Plan Activo" color="primary" dark />
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancelar" color="grey-5" v-close-popup no-caps />
          <q-btn
            unelevated
            :label="isEditing ? 'Guardar Cambios' : 'Crear Plan'"
            color="primary"
            text-color="dark"
            no-caps
            class="text-weight-bold"
            :loading="saving"
            @click="savePlan"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { apiFetch } from '../services/api.js'

const $q = useQuasar()

const planes = ref([])
const loading = ref(false)
const dialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const form = ref({
  Id_plan: null,
  Descripcion: '',
  Vh_desde: 1,
  Vh_hasta: 50,
  Precio: 0,
  Max_inspecciones: 1000,
  Max_capacitaciones: 5,
  estadoBool: true
})

async function fetchPlanes() {
  loading.value = true
  try {
    const res = await apiFetch('/planes')
    if (res.ok) {
      planes.value = await res.json()
    }
  } catch (err) {
    console.error('Error al cargar planes:', err)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  form.value = {
    Id_plan: null,
    Descripcion: '',
    Vh_desde: 1,
    Vh_hasta: 50,
    Precio: 0,
    Max_inspecciones: 1000,
    Max_capacitaciones: 5,
    estadoBool: true
  }
  dialogOpen.value = true
}

function openEditDialog(plan) {
  isEditing.value = true
  form.value = {
    ...plan,
    estadoBool: plan.Estado === 1
  }
  dialogOpen.value = true
}

async function savePlan() {
  if (!form.value.Descripcion) {
    $q.notify({ type: 'negative', message: 'La descripción del plan es requerida', position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      Estado: form.value.estadoBool ? 1 : 0
    }

    const endpoint = isEditing.value ? `/planes/${form.value.Id_plan}` : '/planes'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      $q.notify({
        type: 'positive',
        message: isEditing.value ? 'Plan actualizado correctamente' : 'Plan registrado correctamente',
        position: 'top'
      })
      dialogOpen.value = false
      fetchPlanes()
    }
  } catch (err) {
    console.error('Error al guardar plan:', err)
  } finally {
    saving.value = false
  }
}

async function toggleEstado(plan) {
  try {
    const newStatus = plan.Estado === 1 ? 0 : 1
    const res = await apiFetch(`/planes/${plan.Id_plan}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: newStatus })
    })

    if (res.ok) {
      $q.notify({ type: 'positive', message: 'Estado del plan actualizado', position: 'top' })
      fetchPlanes()
    }
  } catch (err) {
    console.error('Error al cambiar estado:', err)
  }
}

onMounted(() => {
  fetchPlanes()
})
</script>
