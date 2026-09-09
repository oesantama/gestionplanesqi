<template>
  <q-card class="qi-card">
    <q-table
      :rows="rows"
      :columns="columns"
      :row-key="rowKey"
      :filter="filterText"
      :loading="loading"
      dark
      flat
      :dense="dense"
      :no-data-label="noDataLabel"
      v-bind="$attrs"
    >
      <!-- Cabecera Superior: Título, Buscador, Botones de Acción y Exportar -->
      <template #top>
        <div class="row full-width items-center justify-between q-col-gutter-sm q-py-xs">
          <div class="row items-center q-gutter-sm">
            <div v-if="title" class="text-h6 text-weight-bold text-white">{{ title }}</div>
            <slot name="title-extra"></slot>
          </div>

          <div class="row items-center q-gutter-sm">
            <!-- Acciones Extra a la Izquierda del Buscador -->
            <slot name="top-actions"></slot>

            <!-- Campo de Búsqueda Reactiva -->
            <q-input
              v-if="showSearch"
              v-model="filterText"
              outlined
              dark
              dense
              :placeholder="placeholder"
              color="primary"
              style="min-width: 250px;"
            >
              <template #prepend>
                <q-icon name="search" color="primary" />
              </template>
              <template #append v-if="filterText">
                <q-icon name="close" class="cursor-pointer" @click="filterText = ''" />
              </template>
            </q-input>

            <!-- Botón de Exportación a Excel -->
            <q-btn
              v-if="showExport"
              color="positive"
              icon="file_download"
              label="Exportar a Excel"
              no-caps
              unelevated
              class="text-weight-bold"
              @click="handleExport"
            />
          </div>
        </div>
      </template>

      <!-- Reenviar dinámicamente todos los slots de celdas al consumidor del componente -->
      <template v-for="col in columns" :key="col.name" #[`body-cell-${col.name}`]="props">
        <slot :name="`body-cell-${col.name}`" v-bind="props">
          <q-td :props="props">
            {{ props.value }}
          </q-td>
        </slot>
      </template>
    </q-table>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { exportTableToExcel } from '../utils/exportExcel'

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  exportFilename: { type: String, default: 'reporte' },
  showSearch: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
  placeholder: { type: String, default: 'Buscar en tabla...' },
  noDataLabel: { type: String, default: 'No se encontraron registros' },
  dense: { type: Boolean, default: true }
})

const filterText = ref('')

function handleExport() {
  exportTableToExcel(props.columns, props.rows, props.exportFilename)
}
</script>

<style scoped>
.qi-card {
  border-radius: 12px;
  background: rgba(12, 28, 22, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 210, 106, 0.15);
}
</style>
